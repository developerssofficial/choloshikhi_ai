import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyAuthUser } from "@/lib/supabase-auth";
import { filterProfanity } from "@/lib/profanityFilter";

// GET /api/dm/[id] — Fetch messages + mark read
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authUser = await verifyAuthUser(req);
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify participant
    const { data: conv, error: convErr } = await supabase
      .from("dm_conversations")
      .select("id, participants")
      .eq("id", id)
      .maybeSingle();

    if (convErr || !conv || !conv.participants.includes(authUser.id)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const otherId = conv.participants.find((p: string) => p !== authUser.id);

    // Get messages + profiles in parallel
    const [messagesResult, myProf, otherProf] = await Promise.all([
      supabase
        .from("dm_messages")
        .select("id, content, sender_id, is_read, created_at")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true })
        .limit(100),
      supabase.from("student_profiles").select("username").eq("user_id", authUser.id).maybeSingle(),
      otherId
        ? supabase.from("student_profiles").select("username, nickname, display_name").eq("user_id", otherId).maybeSingle()
        : null,
    ]);

    // Mark unread messages as read (fire-and-forget)
    supabase
      .from("dm_messages")
      .update({ is_read: true })
      .eq("conversation_id", id)
      .neq("sender_id", authUser.id)
      .eq("is_read", false)
      .then(() => {});

    return NextResponse.json({
      otherUser: otherProf?.data && otherId ? {
        userId: otherId,
        username: otherProf.data.username,
        nickname: otherProf.data.nickname || otherProf.data.display_name || null,
      } : null,
      myUsername: myProf?.data?.username || null,
      messages: (messagesResult.data || []).map((m: any) => ({
        id: m.id,
        content: m.content,
        isMine: m.sender_id === authUser.id,
        isRead: m.is_read || false,
        createdAt: m.created_at,
      })),
    });
  } catch (error: any) {
    console.error("DM GET error:", error?.message || error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// POST /api/dm/[id] — Send a message (HTTP fallback)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authUser = await verifyAuthUser(req);
    if (!authUser) return NextResponse.json({ error: "Login required" }, { status: 401 });

    // Verify participant
    const { data: conv, error: convErr } = await supabase
      .from("dm_conversations")
      .select("id, participants")
      .eq("id", id)
      .maybeSingle();

    if (convErr || !conv || !conv.participants.includes(authUser.id)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    let body: any;
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

    const { content } = body;
    if (!content?.trim()) return NextResponse.json({ error: "Empty message" }, { status: 400 });

    // Profanity filter
    const filteredContent = filterProfanity(content.trim());

    // Insert message into Supabase
    const { data: msg, error: msgErr } = await supabase
      .from("dm_messages")
      .insert({
        conversation_id: id,
        sender_id: authUser.id,
        content: filteredContent.slice(0, 2000),
        is_read: false,
      })
      .select("id, content, created_at")
      .single();

    if (msgErr) {
      console.error("DM message insert error:", msgErr);
      return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
    }

    // Update conversation timestamp (fire-and-forget)
    supabase
      .from("dm_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", id)
      .then(() => {});

    return NextResponse.json({
      message: {
        id: msg.id,
        content: msg.content,
        isMine: true,
        isRead: false,
        createdAt: msg.created_at,
      },
    });
  } catch (error: any) {
    console.error("DM POST error:", error?.message || error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
