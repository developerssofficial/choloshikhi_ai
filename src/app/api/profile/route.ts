import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyAuthUser } from "@/lib/supabase-auth";

// GET /api/profile — Get user's full profile
export async function GET(req: NextRequest) {
  try {
    const authUser = await verifyAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("student_profiles")
      .select("username, display_name, nickname, school, college, class_name, student_id, full_name")
      .eq("user_id", authUser.id)
      .maybeSingle();

    return NextResponse.json({
      username: profile?.username || null,
      displayName: profile?.display_name || null,
      nickname: profile?.nickname || null,
      fullName: profile?.full_name || null,
      school: profile?.school || null,
      college: profile?.college || null,
      className: profile?.class_name || null,
      studentId: profile?.student_id || null,
    });
  } catch (error: any) {
    console.error("Profile GET error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// PATCH /api/profile — Update profile fields
export async function PATCH(req: NextRequest) {
  try {
    const authUser = await verifyAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const updates: Record<string, any> = {};

    // Only include fields that are provided
    if (body.displayName !== undefined) updates.display_name = body.displayName?.trim() || null;
    if (body.fullName !== undefined) updates.full_name = body.fullName?.trim() || null;
    if (body.nickname !== undefined) updates.nickname = body.nickname?.trim() || null;
    if (body.school !== undefined) updates.school = body.school?.trim() || null;
    if (body.college !== undefined) updates.college = body.college?.trim() || null;
    if (body.className !== undefined) updates.class_name = body.className?.trim() || null;
    if (body.studentId !== undefined) updates.student_id = body.studentId?.trim() || null;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from("student_profiles")
      .update(updates)
      .eq("user_id", authUser.id);

    if (error) {
      console.error("Profile update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Profile PATCH error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
