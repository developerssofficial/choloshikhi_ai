import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyAuthUser } from "@/lib/supabase-auth";

// GET /api/dm — List user's conversations
export async function GET(req: NextRequest) {
  try {
    const authUser = await verifyAuthUser(req);
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get conversation IDs this user participates in
    const { data: parts } = await supabase
      .from("dm_participants").select("conversation_id").eq("user_id", authUser.id);

    if (!parts?.length) return NextResponse.json({ conversations: [] });

    const convIds = parts.map(p => p.conversation_id);

    // Get conversations sorted by latest activity
    const { data: convs } = await supabase
      .from("dm_conversations").select("id, updated_at")
      .in("id", convIds)
      .order("updated_at", { ascending: false });

    if (!convs?.length) return NextResponse.json({ conversations: [] });

    const enriched = await Promise.all(convs.map(async (conv) => {
      // Get other participant + last message + unread count — ALL in parallel
      const [opResult, lastMsgResult, unreadResult] = await Promise.all([
        supabase.from("dm_participants").select("user_id").eq("conversation_id", conv.id).neq("user_id", authUser.id).single(),
        supabase.from("dm_messages").select("content, sender_id, created_at").eq("conversation_id", conv.id).order("created_at", { ascending: false }).limit(1).single(),
        supabase.from("dm_messages").select("id", { count: "exact", head: true }).eq("conversation_id", conv.id).neq("sender_id", authUser.id).eq("is_read", false),
      ]);

      const otherId = opResult.data?.user_id;
      let otherUser: { userId: string; username: string } | null = null;
      if (otherId) {
        const { data: prof } = await supabase.from("student_profiles").select("username").eq("user_id", otherId).single();
        if (prof) otherUser = { userId: otherId, username: prof.username };
      }

      const lm = lastMsgResult.data;
      return {
        id: conv.id,
        updatedAt: conv.updated_at,
        otherUser,
        lastMessage: lm ? { content: lm.content, isMine: lm.sender_id === authUser.id, createdAt: lm.created_at } : null,
        unreadCount: unreadResult.count || 0,
      };
    }));

    return NextResponse.json({ conversations: enriched });
  } catch (error: any) {
    console.error("DM list error:", error?.message || error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// POST /api/dm — Create or find conversation by CSH_XXXXXX username
export async function POST(req: NextRequest) {
  try {
    const authUser = await verifyAuthUser(req);
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { targetUsername } = await req.json();
    if (!targetUsername?.trim()) return NextResponse.json({ error: "Username required." }, { status: 400 });

    const { data: target } = await supabase
      .from("student_profiles").select("user_id")
      .eq("username", targetUsername.toUpperCase().trim()).single();

    if (!target) return NextResponse.json({ error: "Student not found." }, { status: 404 });
    if (target.user_id === authUser.id) return NextResponse.json({ error: "Cannot message yourself." }, { status: 400 });

    const { data: myParts } = await supabase
      .from("dm_participants").select("conversation_id").eq("user_id", authUser.id);

    if (myParts?.length) {
      for (const p of myParts) {
        const { data: found } = await supabase
          .from("dm_participants").select("user_id")
          .eq("conversation_id", p.conversation_id).eq("user_id", target.user_id).single();
        if (found) return NextResponse.json({ conversationId: p.conversation_id, existing: true });
      }
    }

    const { data: conv, error } = await supabase
      .from("dm_conversations").insert({}).select("id").single();
    if (error) throw error;

    await supabase.from("dm_participants").insert([
      { conversation_id: conv.id, user_id: authUser.id },
      { conversation_id: conv.id, user_id: target.user_id },
    ]);

    return NextResponse.json({ conversationId: conv.id, existing: false });
  } catch (error: any) {
    console.error("DM create error:", error?.message || error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
