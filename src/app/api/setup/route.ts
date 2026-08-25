import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/setup — Check if database is properly configured
export async function GET() {
  const checks: Record<string, any> = {};

  // Check 1: Does student_profiles table exist?
  const { error: profilesErr } = await supabase
    .from("student_profiles")
    .select("user_id")
    .limit(1);
  checks.student_profiles = profilesErr ? `ERROR: ${profilesErr.message}` : "OK";

  // Check 2: Does user_subscriptions table exist?
  const { error: subsErr } = await supabase
    .from("user_subscriptions")
    .select("user_id")
    .limit(1);
  checks.user_subscriptions = subsErr ? `ERROR: ${subsErr.message}` : "OK";

  // Check 3: Does chat_sessions table exist?
  const { error: sessionsErr } = await supabase
    .from("chat_sessions")
    .select("id")
    .limit(1);
  checks.chat_sessions = sessionsErr ? `ERROR: ${sessionsErr.message}` : "OK";

  // Check 4: Does dm_conversations table exist?
  const { error: dmErr } = await supabase
    .from("dm_conversations")
    .select("id")
    .limit(1);
  checks.dm_conversations = dmErr ? `ERROR: ${dmErr.message}` : "OK";

  // Check 5: Does groups table exist?
  const { error: groupsErr } = await supabase
    .from("groups")
    .select("id")
    .limit(1);
  checks.groups = groupsErr ? `ERROR: ${groupsErr.message}` : "OK";

  // Check 6: Does dm_messages table exist?
  const { error: dmMsgErr } = await supabase
    .from("dm_messages")
    .select("id")
    .limit(1);
  checks.dm_messages = dmMsgErr ? `ERROR: ${dmMsgErr.message}` : "OK";

  // Check 7: Does group_messages table exist?
  const { error: grpMsgErr } = await supabase
    .from("group_messages")
    .select("id")
    .limit(1);
  checks.group_messages = grpMsgErr ? `ERROR: ${grpMsgErr.message}` : "OK";

  // Check 8: Does group_members table exist?
  const { error: grpMemErr } = await supabase
    .from("group_members")
    .select("id")
    .limit(1);
  checks.group_members = grpMemErr ? `ERROR: ${grpMemErr.message}` : "OK";

  return NextResponse.json(checks);
}

// POST /api/setup — Create profile for current user (called after signup)
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No auth" }, { status: 401 });
    }

    // Get user from token
    const { verifyAuthUser } = await import("@/lib/supabase-auth");
    const authUser = await verifyAuthUser(req);
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Check if profile already exists
    const { data: existing } = await supabase
      .from("student_profiles")
      .select("user_id")
      .eq("user_id", authUser.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ ok: true, action: "exists" });
    }

    // Create profile
    const username = "USER_" + authUser.id.replace(/-/g, "").slice(0, 6).toUpperCase();
    const { error } = await supabase
      .from("student_profiles")
      .insert({
        user_id: authUser.id,
        username,
        display_name: "Student",
        is_anonymous: authUser.isAnonymous,
      });

    if (error) {
      console.error("Profile create error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create subscription too
    await supabase
      .from("user_subscriptions")
      .insert({ user_id: authUser.id, plan: "free", teacher_mode_enabled: true })
      .then(() => {});

    return NextResponse.json({ ok: true, action: "created", username });
  } catch (error: any) {
    console.error("Setup error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
