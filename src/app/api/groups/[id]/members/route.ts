import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyAuthUser } from "@/lib/supabase-auth";

// POST /api/groups/[id]/members — Add member to group (owner/admin only)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authUser = await verifyAuthUser(req);
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify user is owner or admin
    const { data: myRole } = await supabase
      .from("group_members").select("role").eq("group_id", id).eq("user_id", authUser.id).single();

    if (!myRole || !["owner", "admin"].includes(myRole.role)) {
      return NextResponse.json({ error: "Only owner/admin can add members" }, { status: 403 });
    }

    const { username } = await req.json();
    if (!username?.trim()) return NextResponse.json({ error: "Username required" }, { status: 400 });

    // Find user by CSH_XXXXXX username
    const { data: targetProf, error: profErr } = await supabase
      .from("student_profiles").select("user_id, username").eq("username", username.trim().toUpperCase()).single();

    if (profErr || !targetProf) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from("group_members").select("user_id").eq("group_id", id).eq("user_id", targetProf.user_id).single();

    if (existing) {
      return NextResponse.json({ error: "Already a member" }, { status: 409 });
    }

    // Add member
    const { error: addErr } = await supabase
      .from("group_members").insert({ group_id: id, user_id: targetProf.user_id, role: "member" });

    if (addErr) return NextResponse.json({ error: addErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, username: targetProf.username });
  } catch (error: any) {
    console.error("Group members POST error:", error?.message || error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE /api/groups/[id]/members — Remove member or leave group
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authUser = await verifyAuthUser(req);
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { username } = await req.json();

    // If username provided, removing someone else (owner only)
    if (username) {
      const { data: myRole } = await supabase
        .from("group_members").select("role").eq("group_id", id).eq("user_id", authUser.id).single();

      if (!myRole || myRole.role !== "owner") {
        return NextResponse.json({ error: "Only owner can remove members" }, { status: 403 });
      }

      const { data: targetProf } = await supabase
        .from("student_profiles").select("user_id").eq("username", username.trim().toUpperCase()).single();

      if (!targetProf) return NextResponse.json({ error: "User not found" }, { status: 404 });

      // Can't remove owner
      if (targetProf.user_id === authUser.id) {
        return NextResponse.json({ error: "Can't remove yourself as owner" }, { status: 400 });
      }

      const { error } = await supabase
        .from("group_members").delete().eq("group_id", id).eq("user_id", targetProf.user_id);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    // No username = leaving group
    const { error } = await supabase
      .from("group_members").delete().eq("group_id", id).eq("user_id", authUser.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Group members DELETE error:", error?.message || error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
