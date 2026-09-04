import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/* ===================================================================
   POST /api/student-signup
   Creates a unique personalized Student ID based on Name + Number (e.g. ayan_382)
   → Creates Supabase auth user with synthetic email (ayan_382@choloshikhi.app)
   → Creates student_profiles + user_subscriptions rows
   → Returns personalized studentId & login credentials
   =================================================================== */

/** Convert any name (English or Bengali) into a clean, memorable English slug prefix */
function cleanNamePrefix(name: string): string {
  // First check if there are English characters in name
  const englishMatches = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (englishMatches.length >= 3) {
    return englishMatches.slice(0, 10);
  }

  // Common Bengali phonetic mappings for student names
  const bengaliMap: Record<string, string> = {
    "আ": "a", "অ": "o", "ই": "i", "ঈ": "i", "উ": "u", "ঊ": "u", "ঋ": "ri",
    "এ": "e", "ঐ": "oi", "ও": "o", "ঔ": "ou",
    "ক": "k", "খ": "kh", "গ": "g", "ঘ": "gh", "ঙ": "ng",
    "চ": "ch", "ছ": "chh", "জ": "j", "ঝ": "jh", "ঞ": "n",
    "ট": "t", "ঠ": "th", "ড": "d", "ঢ": "dh", "ণ": "n",
    "ত": "t", "থ": "th", "দ": "d", "ধ": "dh", "ন": "n",
    "প": "p", "ফ": "f", "ব": "b", "ভ": "bh", "ম": "m",
    "য": "j", "র": "r", "ল": "l", "শ": "sh", "ষ": "sh", "স": "s", "হ": "h",
    "ড়": "r", "ঢ়": "rh", "য়": "y", "ৎ": "t",
    "া": "a", "ি": "i", "ী": "i", "ু": "u", "ূ": "u", "ৃ": "ri",
    "ে": "e", "ৈ": "oi", "ো": "o", "ৌ": "ou", "্": "",
    "ং": "ng", "ঃ": "h", "ঁ": "",
  };

  let transliterated = "";
  for (const char of name) {
    if (bengaliMap[char] !== undefined) {
      transliterated += bengaliMap[char];
    } else if (/[a-zA-Z0-9]/.test(char)) {
      transliterated += char.toLowerCase();
    }
  }

  const clean = transliterated.replace(/[^a-z0-9]/g, "").slice(0, 10);
  if (clean.length >= 3) {
    return clean;
  }

  return "student";
}

/** Generate a unique personalized student ID like 'ayan_382' or 'shikhi_109' */
async function generateUniqueStudentId(fullName: string): Promise<string> {
  const prefix = cleanNamePrefix(fullName);

  // Try generating with 3-digit random number first, then 4-digit
  for (let attempt = 0; attempt < 50; attempt++) {
    const randomNum = Math.floor(100 + Math.random() * 900); // 100 - 999
    const candidateId = `${prefix}_${randomNum}`;

    const { data: existing } = await supabase
      .from("student_profiles")
      .select("username")
      .eq("username", candidateId)
      .maybeSingle();

    if (!existing) {
      return candidateId;
    }
  }

  // Fallback with timestamp suffix
  const tsSuffix = Date.now().toString().slice(-4);
  return `${prefix}_${tsSuffix}`;
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

    const trimmedName = fullName.trim();

    // Generate unique personalized student ID (e.g. ayan_382)
    const studentId = await generateUniqueStudentId(trimmedName);

    // Synthetic email for Supabase auth
    const syntheticEmail = `${studentId.toLowerCase()}@choloshikhi.app`;

    // Create Supabase auth user with service role
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: syntheticEmail,
      password: password,
      email_confirm: true, // Skip email verification
      user_metadata: {
        full_name: trimmedName,
        student_id: studentId,
      },
    });

    if (authError) {
      console.error("[StudentSignup] Auth user create error:", authError);
      return NextResponse.json(
        { error: "অ্যাকাউন্ট তৈরি করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।" },
        { status: 500 }
      );
    }

    const userId = authData.user.id;

    // Create student_profiles row with strictly isolated user_id
    const { error: profileError } = await supabase
      .from("student_profiles")
      .insert({
        user_id: userId,
        username: studentId,
        display_name: trimmedName,
        full_name: trimmedName,
        school: school?.trim() || null,
        college: college?.trim() || null,
        class_name: className?.trim() || null,
        is_anonymous: false,
      });

    if (profileError) {
      console.error("[StudentSignup] Profile create error:", profileError);
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: "প্রোফাইল তৈরি করা যায়নি" }, { status: 500 });
    }

    // Create default subscription quota
    await supabase
      .from("user_subscriptions")
      .insert({ user_id: userId, plan: "free", teacher_mode_enabled: true });

    return NextResponse.json({
      ok: true,
      studentId,
      syntheticEmail,
      userId,
      message: "অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে",
    });
  } catch (error: any) {
    console.error("[StudentSignup] Error:", error);
    return NextResponse.json({ error: "সার্ভারে সমস্যা হয়েছে" }, { status: 500 });
  }
}
