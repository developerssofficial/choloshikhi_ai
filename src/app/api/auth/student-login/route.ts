import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/* ===================================================================
   POST /api/auth/student-login
   Allows students to log in using EITHER their Name OR Student ID + Password
   =================================================================== */

export async function POST(req: NextRequest) {
  try {
    const { identifier, password } = await req.json();

    if (!identifier?.trim()) {
      return NextResponse.json(
        { error: "আপনার নাম অথবা Student ID লিখুন" },
        { status: 400 }
      );
    }
    if (!password?.trim()) {
      return NextResponse.json(
        { error: "পাসওয়ার্ড প্রদান করুন" },
        { status: 400 }
      );
    }

    const cleanId = identifier.trim();

    // Find matching candidate profiles in Supabase
    // Check username (CSH_XXXXXX), full_name, or display_name
    const { data: candidates, error: searchError } = await supabase
      .from("student_profiles")
      .select("user_id, username, full_name, display_name")
      .or(`username.ilike.${cleanId},full_name.ilike.%${cleanId}%,display_name.ilike.%${cleanId}%`)
      .limit(10);

    if (searchError) {
      console.error("[StudentLogin] Search error:", searchError);
    }

    // List of synthetic emails to attempt authentication with
    const candidateEmails: string[] = [];

    if (candidates && candidates.length > 0) {
      for (const cand of candidates) {
        if (cand.username) {
          candidateEmails.push(`${cand.username.toLowerCase()}@choloshikhi.app`);
        }
      }
    }

    // Also try direct student ID format if it looks like one or wasn't in candidates
    const directEmail = `${cleanId.toLowerCase().replace(/[^a-z0-9_]/g, "")}@choloshikhi.app`;
    if (!candidateEmails.includes(directEmail)) {
      candidateEmails.push(directEmail);
    }

    // Create client instance for password verification
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });

    let successSession: any = null;
    let matchedStudentId: string | null = null;

    for (const email of candidateEmails) {
      try {
        const { data, error } = await authClient.auth.signInWithPassword({
          email,
          password,
        });

        if (!error && data.session) {
          successSession = data.session;
          const foundCand = candidates?.find(c => c.username?.toLowerCase() === email.split("@")[0].toLowerCase());
          matchedStudentId = foundCand?.username || email.split("@")[0];
          break;
        }
      } catch {
        // Try next candidate
      }
    }

    if (!successSession) {
      return NextResponse.json(
        { error: "নাম / Student ID অথবা পাসওয়ার্ড ভুল হয়েছে। আবার চেষ্টা করুন।" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      ok: true,
      session: {
        access_token: successSession.access_token,
        refresh_token: successSession.refresh_token,
      },
      user: {
        id: successSession.user.id,
        email: successSession.user.email,
        name: successSession.user.user_metadata?.full_name || matchedStudentId,
      },
      studentId: matchedStudentId,
    });
  } catch (error: any) {
    console.error("[StudentLogin] Error:", error);
    return NextResponse.json(
      { error: "সার্ভারে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।" },
      { status: 500 }
    );
  }
}
