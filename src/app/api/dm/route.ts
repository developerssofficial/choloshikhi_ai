import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyAuthUser } from "@/lib/supabase-auth";

// GET /api/dm — List user's conversations (Supabase PostgreSQL)
export async function GET(req: NextRequest) {
  try {
    const authUser = await verifyAuthUser(req);
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Find conversations where this user is a participant
    const { data: myConvs, error: convErr } = await supabase
      .from("dm_conversations")
      .select("id, participants, updated_at")
      .contains("participants", [authUser.id])
      .order("updated_at", { ascending: false });

    if (convErr) return NextResponse.json({ error: convErr.message }, { status: 500 });
    if (!myConvs || myConvs.length === 0) return NextResponse.json({ conversations: [] });

    const enriched = await Promise.all(myConvs.map(async (conv: any) => {
      const otherId = conv.participants.find((p: string) => p !== authUser.id);

      // Get last message + unread count + other user profile — ALL in parallel
      const [lastMsgResult, unreadResult, profResult] = await Promise.all([
        supabase
          .from("dm_messages")
          .select("content, sender_id, created_at")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("dm_messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", conv.id)
          .neq("sender_id", authUser.id)
          .eq("is_read", false),
        otherId
          ? supabase.from("student_profiles").select("username, nickname, display_name").eq("user_id", otherId).maybeSingle()
          : null,
      ]);

      const lastMsg = lastMsgResult.data;
      const unreadCount = unreadResult.count || 0;
      const prof = profResult?.data;

      return {
        id: conv.id,
        updatedAt: conv.updated_at,
        otherUser: prof && otherId ? {
          userId: otherId,
          username: prof.username,
          nickname: prof.nickname || prof.display_name || null,
        } : null,
        lastMessage: lastMsg ? {
          content: lastMsg.content,
          isMine: lastMsg.sender_id === authUser.id,
          createdAt: lastMsg.created_at,
        } : null,
        unreadCount,
      };
    }));

    return NextResponse.json({ conversations: enriched });
  } catch (error: any) {
    console.error("DM list error:", error?.message || error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// POST /api/dm — Create or find conversation
export async function POST(req: NextRequest) {
  try {
    const authUser = await verifyAuthUser(req);
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { targetUsername } = await req.json();
    if (!targetUsername?.trim()) return NextResponse.json({ error: "Username required." }, { status: 400 });

    // Find target user in Supabase
    const { data: target } = await supabase
      .from("student_profiles").select("user_id")
      .eq("username", targetUsername.toUpperCase().trim()).maybeSingle();

    if (!target) return NextResponse.json({ error: "Student not found." }, { status: 404 });
    if (target.user_id === authUser.id) return NextResponse.json({ error: "Cannot message yourself." }, { status: 400 });

    // Check for existing conversation
    const { data: existing } = await supabase
      .from("dm_conversations")
      .select("id")
      .contains("participants", [authUser.id, target.user_id])
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ conversationId: existing.id, existing: true });
    }

    // Create new conversation
    const { data: newConv, error: createErr } = await supabase
      .from("dm_conversations")
      .insert({
        participants: [authUser.id, target.user_id],
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 });

    return NextResponse.json({ conversationId: newConv.id, existing: false });
  } catch (error: any) {
    console.error("DM create error:", error?.message || error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
