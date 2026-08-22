import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyAuthUser } from "@/lib/supabase-auth";

// GET /api/groups — List user's groups
export async function GET(req: NextRequest) {
  try {
    const authUser = await verifyAuthUser(req);
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get all groups the user is a member of
    const { data: memberships, error: memErr } = await supabase
      .from("group_members")
      .select("group_id, role")
      .eq("user_id", authUser.id);

    if (memErr) return NextResponse.json({ error: memErr.message }, { status: 500 });
    if (!memberships || memberships.length === 0) return NextResponse.json({ groups: [] });

    // Fetch group details + member count + last message — all in parallel
    const groupIds = memberships.map(m => m.group_id);
    const roleMap = new Map(memberships.map(m => [m.group_id, m.role]));

    const [groupsResult, countsResult, lastMsgResult] = await Promise.all([
      supabase.from("groups").select("id, name, description, creator_id, created_at").in("id", groupIds),
      supabase.from("group_members").select("group_id").in("group_id", groupIds),
      supabase.from("group_messages").select("group_id, content, sender_id, created_at").in("group_id", groupIds).order("created_at", { ascending: false }).limit(groupIds.length * 1),
    ]);

    const groups = (groupsResult.data || []).map(g => {
      const count = (countsResult.data || []).filter(c => c.group_id === g.id).length;
      const lastMsg = (lastMsgResult.data || []).find(m => m.group_id === g.id);
      return {
        ...g,
        role: roleMap.get(g.id) || "member",
        memberCount: count,
        lastMessage: lastMsg?.content || null,
        lastMessageAt: lastMsg?.created_at || g.created_at,
      };
    });

    // Sort by last message time
    groups.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

    return NextResponse.json({ groups });
  } catch (error: any) {
    console.error("Groups GET error:", error?.message || error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/groups — Create a new group
export async function POST(req: NextRequest) {
  try {
    const authUser = await verifyAuthUser(req);
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, description } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: "Group name required" }, { status: 400 });

    // Create group
    const { data: group, error: groupErr } = await supabase
      .from("groups")
      .insert({
        name: name.trim().slice(0, 50),
        description: description?.trim().slice(0, 200) || null,
        creator_id: authUser.id,
      })
      .select("id, name, description, creator_id, created_at")
      .single();

    if (groupErr) return NextResponse.json({ error: groupErr.message }, { status: 500 });

    // Add creator as owner
    const { error: memErr } = await supabase
      .from("group_members")
      .insert({ group_id: group.id, user_id: authUser.id, role: "owner" });

    if (memErr) {
      console.error("Failed to add owner:", memErr);
    }

    return NextResponse.json({ group: { ...group, role: "owner", memberCount: 1 } });
  } catch (error: any) {
    console.error("Groups POST error:", error?.message || error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
