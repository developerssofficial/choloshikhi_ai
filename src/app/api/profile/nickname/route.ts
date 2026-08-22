import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyAuthUser } from "@/lib/supabase-auth";

// GET /api/profile/nickname — Get my nickname
export async function GET(req: NextRequest) {
  try {
    const authUser = await verifyAuthUser(req);
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("student_profiles").select("nickname, username").eq("user_id", authUser.id).single();

    return NextResponse.json({
      nickname: profile?.nickname || null,
      username: profile?.username || null,
    });
  } catch (error: any) {
    console.error("Nickname GET error:", error?.message || error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PATCH /api/profile/nickname — Set nickname
export async function PATCH(req: NextRequest) {
  try {
    const authUser = await verifyAuthUser(req);
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { nickname } = await req.json();

    // Validate nickname: 2-20 chars, alphanumeric + underscore only
    if (nickname && !/^[a-zA-Z0-9_]{2,20}$/.test(nickname)) {
      return NextResponse.json({
        error: "Nickname must be 2-20 characters, letters/numbers/underscores only"
      }, { status: 400 });
    }

    const { error } = await supabase
      .from("student_profiles")
      .update({ nickname: nickname?.trim() || null })
      .eq("user_id", authUser.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, nickname: nickname?.trim() || null });
  } catch (error: any) {
    console.error("Nickname PATCH error:", error?.message || error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
