import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/* ===================================================================
   POST /api/student-signup
   Student fills: name, school, class, password
   → Generates CSH_XXXXXX ID
   → Creates Supabase auth user (synthetic email)
   → Creates student_profiles + user_subscriptions rows
   → Returns studentId + auth tokens
   =================================================================== */

function generateStudentId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "CSH_";
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fullName, school, college, className, password } = body;

    if (!fullName?.trim() || fullName.trim().length < 2) {
      return NextResponse.json({ error: "নাম কমপক্ষে ২ অক্ষর হতে হবে" }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: "পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে" }, { status: 400 });
    }

    // Generate unique CSH_XXXXXX
    let studentId = "";
    let attempts = 0;
    do {
      studentId = generateStudentId();
      const { data: existing } = await supabase
        .from("student_profiles")
        .select("username")
        .eq("username", studentId)
        .maybeSingle();
      if (!existing) break;
      attempts++;
    } while (attempts < 50);

    if (attempts >= 50) {
      return NextResponse.json({ error: "Try again — could not generate unique ID" }, { status: 500 });
    }

    // Synthetic email for Supabase auth
    const syntheticEmail = `${studentId.toLowerCase()}@choloshikhi.app`;

    // Create Supabase auth user with service role
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: syntheticEmail,
      password: password,
      email_confirm: true, // Skip email verification
      user_metadata: {
        full_name: fullName.trim(),
        student_id: studentId,
      },
    });

    if (authError) {
      console.error("[StudentSignup] Auth user create error:", authError);
      return NextResponse.json({ error: "অ্যাকাউন্ট তৈরি করা যায়নি। আবার চেষ্টা করুন।" }, { status: 500 });
    }

    const userId = authData.user.id;

    // Create student_profiles row
    const { error: profileError } = await supabase
      .from("student_profiles")
      .insert({
        user_id: userId,
        username: studentId,
        display_name: fullName.trim(),
        full_name: fullName.trim(),
        school: school?.trim() || null,
        college: college?.trim() || null,
        class_name: className?.trim() || null,
        is_anonymous: false,
      });

    if (profileError) {
      console.error("[StudentSignup] Profile create error:", profileError);
      // Try to clean up auth user
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: "প্রোফাইল তৈরি করা যায়নি" }, { status: 500 });
    }

    // Create subscription row
    await supabase
      .from("user_subscriptions")
      .insert({ user_id: userId, plan: "free", teacher_mode_enabled: true });

    // Generate tokens for the client by signing in with the synthetic credentials
    // We use the service role to create a session
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: syntheticEmail,
    });

    // Actually, admin.generateLink doesn't work well for password login.
    // Instead, return the studentId so the client can sign in with signInWithPassword.
    // But the client needs the synthetic email... let's return that too.

    return NextResponse.json({
      ok: true,
      studentId,
      syntheticEmail,
      userId,
      message: "অ্যাকাউন্ত তৈরি হয়েছে",
    });
  } catch (error: any) {
    console.error("[StudentSignup] Error:", error);
    return NextResponse.json({ error: "সার্ভার সমস্যা" }, { status: 500 });
  }
}
