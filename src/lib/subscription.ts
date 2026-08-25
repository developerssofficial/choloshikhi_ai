import { supabase } from "./supabase";

/* ===================================================================
   Subscription & Profile Service
   - Plan: free (Normal unlimited, Shikkhok 30/month) | unlimited (all modes)
   - Redeem: single code "AYAANLOVEARU" → unlimited access
   - Profile: CSH_XXXXXX unique username
   =================================================================== */

const ADMIN_USER_ID = process.env.ADMIN_USER_ID || "";

export interface SubscriptionStatus {
  plan: "free" | "unlimited";
  teacherModeEnabled: boolean;
  teacherMonthlyLimit: number;
  teacherMonthlyUsed: number;
  teacherRemaining: number;
  isUnlimited: boolean;
  username: string | null;
  displayName: string | null;
}

/* ===== Get or create subscription + profile ===== */
export async function getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  // Fetch subscription and profile in parallel
  const [subResult, profileResult] = await Promise.all([
    supabase.from("user_subscriptions").select("*").eq("user_id", userId).single(),
    supabase.from("student_profiles").select("username, display_name").eq("user_id", userId).single(),
  ]);

  let sub = subResult.data;
  let profile = profileResult.data;

  // Auto-create subscription row if missing
  if (!sub) {
    const { data: newSub } = await supabase
      .from("user_subscriptions")
      .insert({ user_id: userId, plan: "free", teacher_mode_enabled: true })
      .select("*")
      .single();
    sub = newSub;
  }

  // Auto-create profile row if missing
  if (!profile) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let username = "CSH_";
    for (let i = 0; i < 6; i++) {
      username += chars[Math.floor(Math.random() * chars.length)];
    }
    const { data: newProfile } = await supabase
      .from("student_profiles")
      .insert({ user_id: userId, username, display_name: "Student", is_anonymous: false })
      .select("username, display_name")
      .single();
    profile = newProfile;
  }

  const currentMonth = new Date().toISOString().slice(0, 7);
  const teacherUsed = sub?.teacher_monthly_used || 0;
  const teacherLimit = sub?.teacher_monthly_limit || 30;
  const isUnlimited = sub?.plan === "unlimited" || (sub?.unlimited_until && new Date(sub.unlimited_until) > new Date());

  return {
    plan: sub?.plan || "free",
    teacherModeEnabled: sub?.teacher_mode_enabled ?? true,
    teacherMonthlyLimit: teacherLimit,
    teacherMonthlyUsed: teacherUsed,
    teacherRemaining: isUnlimited ? 999 : Math.max(0, teacherLimit - teacherUsed),
    isUnlimited,
    username: profile?.username || null,
    displayName: profile?.display_name || null,
  };
}

/* ===== Check if user can send message in given mode ===== */
export async function canSendMessage(userId: string, mode: string): Promise<{ allowed: boolean; reason?: string; remaining?: number }> {
  // Normal mode — always allowed for all plans
  if (mode === "normal" || mode === "taskplan") {
    return { allowed: true };
  }

  // Education (Shikkhok) mode — check quota
  const status = await getSubscriptionStatus(userId);

  // Unlimited plan — always allowed
  if (status.isUnlimited) {
    return { allowed: true, remaining: 999 };
  }

  // Free plan — check teacher quota
  if (status.teacherRemaining <= 0) {
    return {
      allowed: false,
      reason: `Shikkhok mode monthly limit reached (${status.teacherMonthlyLimit}/${status.teacherMonthlyLimit}). Redeem a code or wait for next month.`,
      remaining: 0,
    };
  }

  return { allowed: true, remaining: status.teacherRemaining - 1 };
}

/* ===== Increment teacher mode usage ===== */
export async function incrementTeacherUsage(userId: string): Promise<void> {
  const currentMonth = new Date().toISOString().slice(0, 7);
  try {
    await supabase.rpc("check_teacher_quota", { p_user_id: userId });
  } catch {
    // Fallback: direct increment via raw SQL-like approach
    // First get current value, then update
    const { data } = await supabase
      .from("user_subscriptions")
      .select("teacher_monthly_used")
      .eq("user_id", userId)
      .single();
    const newCount = (data?.teacher_monthly_used || 0) + 1;
    await supabase
      .from("user_subscriptions")
      .update({
        teacher_monthly_used: newCount,
        teacher_usage_month: currentMonth,
      })
      .eq("user_id", userId);
  }
}

/* ===== Redeem a code ===== */
export async function redeemCode(userId: string, code: string): Promise<{ success: boolean; message: string }> {
  const trimmed = code.trim().toUpperCase();

  // Hash the code with SHA-256 (same as seed)
  const encoder = new TextEncoder();
  const data = encoder.encode(trimmed);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const codeHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

  // Find the redeem code
  const { data: redeemCode } = await supabase
    .from("redeem_codes")
    .select("id, grant_type, is_active, max_uses, current_uses")
    .eq("code_hash", codeHash)
    .single();

  if (!redeemCode) {
    return { success: false, message: "Invalid redeem code." };
  }

  if (!redeemCode.is_active) {
    return { success: false, message: "This code is no longer active." };
  }

  if (redeemCode.max_uses && redeemCode.current_uses >= redeemCode.max_uses) {
    return { success: false, message: "This code has reached its maximum uses." };
  }

  // Check if user already redeemed this code
  const { data: existingRedeem } = await supabase
    .from("user_redeems")
    .select("id")
    .eq("user_id", userId)
    .eq("code_id", redeemCode.id)
    .single();

  if (existingRedeem) {
    return { success: false, message: "You have already redeemed this code." };
  }

  // Redeem: record the redemption
  const { error: redeemError } = await supabase
    .from("user_redeems")
    .insert({ user_id: userId, code_id: redeemCode.id });

  if (redeemError) {
    return { success: false, message: "Failed to redeem code. Try again." };
  }

  // Increment current_uses on the code
  await supabase
    .from("redeem_codes")
    .update({ current_uses: redeemCode.current_uses + 1 })
    .eq("id", redeemCode.id);

  // Apply the grant based on type
  if (redeemCode.grant_type === "unlimited") {
    // Ensure subscription row exists
    const { data: existing } = await supabase
      .from("user_subscriptions")
      .select("user_id")
      .eq("user_id", userId)
      .single();

    if (!existing) {
      await supabase.from("user_subscriptions").insert({ user_id: userId });
    }

    // Set to unlimited plan
    await supabase
      .from("user_subscriptions")
      .update({
        plan: "unlimited",
        teacher_mode_enabled: true,
        teacher_monthly_limit: 999999,
      })
      .eq("user_id", userId);
  }

  return { success: true, message: "Code redeemed! You now have unlimited access to all modes." };
}

/* ===== Update display name ===== */
export async function updateDisplayName(userId: string, displayName: string): Promise<{ success: boolean; message: string }> {
  const trimmed = displayName.trim();
  if (trimmed.length < 2 || trimmed.length > 30) {
    return { success: false, message: "Display name must be 2-30 characters." };
  }

  const { error } = await supabase
    .from("student_profiles")
    .update({ display_name: trimmed })
    .eq("user_id", userId);

  if (error) {
    return { success: false, message: "Failed to update name." };
  }

  return { success: true, message: "Name updated!" };
}

/* ===== Is this user the admin? ===== */
export function isAdmin(userId: string): boolean {
  return ADMIN_USER_ID !== "" && userId === ADMIN_USER_ID;
}
