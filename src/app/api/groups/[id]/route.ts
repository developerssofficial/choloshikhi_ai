import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyAuthUser } from "@/lib/supabase-auth";
import { getDb } from "@/lib/mongodb";

// GET /api/groups/[id] — Get group details + messages
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authUser = await verifyAuthUser(req);
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify membership + get group + get members — ALL in parallel
    const [memResult, groupResult, membersResult] = await Promise.all([
      supabase.from("group_members").select("role").eq("group_id", id).eq("user_id", authUser.id).single(),
      supabase.from("groups").select("id, name, description, creator_id, created_at").eq("id", id).single(),
      supabase.from("group_members").select("user_id, role, joined_at").eq("group_id", id),
    ]);

    if (memResult.error || !memResult.data) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (groupResult.error || !groupResult.data) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Fetch messages from MongoDB
    const db = await getDb();
    const msgs = db.collection("group_messages");
    const mongoMessages = await msgs.find({ group_id: id }).sort({ created_at: 1 }).limit(200).toArray();

    // Get profiles for all members + message senders
    const memberUserIds = (membersResult.data || []).map(m => m.user_id);
    const senderIds = [...new Set(mongoMessages.map((m: any) => m.sender_id))];
    const allUniqueIds = [...new Set([...memberUserIds, ...senderIds])];

    const profilesResult = allUniqueIds.length > 0
      ? await supabase.from("student_profiles").select("user_id, username, nickname, display_name").in("user_id", allUniqueIds)
      : { data: [] };

    const profileMap = new Map((profilesResult.data || []).map(p => [p.user_id, p]));

    const members = (membersResult.data || []).map(m => {
      const prof = profileMap.get(m.user_id);
      return {
        userId: m.user_id,
        role: m.role,
        joinedAt: m.joined_at,
        username: prof?.username || "Unknown",
        nickname: prof?.nickname || prof?.display_name || null,
      };
    });

    const messages = mongoMessages.map((m: any) => {
      const prof = profileMap.get(m.sender_id);
      return {
        id: m._id.toString(),
        content: m.content,
        senderId: m.sender_id,
        senderUsername: prof?.username || "Unknown",
        senderNickname: prof?.nickname || prof?.display_name || null,
        isMine: m.sender_id === authUser.id,
        createdAt: m.created_at,
      };
    });

    const myMembership = members.find(m => m.userId === authUser.id);

    return NextResponse.json({
      group: groupResult.data,
      myRole: myMembership?.role || "member",
      members,
      messages,
    });
  } catch (error: any) {
    console.error("Group GET error:", error?.message || error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// DELETE /api/groups/[id] — Delete group (owner only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authUser = await verifyAuthUser(req);
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify owner
    const { data: group } = await supabase.from("groups").select("creator_id").eq("id", id).single();
    if (!group || group.creator_id !== authUser.id) {
      return NextResponse.json({ error: "Only creator can delete" }, { status: 403 });
    }

    // Delete group (cascades to members and messages)
    const { error } = await supabase.from("groups").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Group DELETE error:", error?.message || error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
