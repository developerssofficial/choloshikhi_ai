import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyAuthUser } from "@/lib/supabase-auth";

// GET /api/dm/[id] — Fetch messages + mark read
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authUser = await verifyAuthUser(req);
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify participant + get other user + get own username — ALL in parallel
    const [partResult, otherPartResult, myProfResult, messagesResult] = await Promise.all([
      supabase.from("dm_participants").select("conversation_id").eq("conversation_id", id).eq("user_id", authUser.id).single(),
      supabase.from("dm_participants").select("user_id").eq("conversation_id", id).neq("user_id", authUser.id).single(),
      supabase.from("student_profiles").select("username").eq("user_id", authUser.id).single(),
      supabase.from("dm_messages").select("id, content, sender_id, created_at, is_read").eq("conversation_id", id).order("created_at", { ascending: true }).limit(100),
    ]);

    if (partResult.error || !partResult.data) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get other user's profile (only if we have their userId)
    let otherUser: { userId: string; username: string } | null = null;
    if (otherPartResult.data?.user_id) {
      const { data: prof } = await supabase
        .from("student_profiles").select("username")
        .eq("user_id", otherPartResult.data.user_id).single();
      if (prof) otherUser = { userId: otherPartResult.data.user_id, username: prof.username };
    }

    const messages = messagesResult.data || [];

    // Mark unread as read (fire-and-forget)
    const unreadIds = messages.filter(m => m.sender_id !== authUser.id && !m.is_read).map(m => m.id);
    if (unreadIds.length > 0) {
      supabase.from("dm_messages").update({ is_read: true }).in("id", unreadIds).then(() => {});
    }

    return NextResponse.json({
      otherUser,
      myUsername: myProfResult.data?.username || null,
      messages: messages.map(m => ({
        id: m.id, content: m.content, isMine: m.sender_id === authUser.id, createdAt: m.created_at,
      })),
    });
  } catch (error: any) {
    console.error("DM GET error:", error?.message || error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// POST /api/dm/[id] — Send a message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authUser = await verifyAuthUser(req);
    if (!authUser) return NextResponse.json({ error: "Login required" }, { status: 401 });

    // Verify participant
    const { error: partErr } = await supabase
      .from("dm_participants").select("conversation_id")
      .eq("conversation_id", id).eq("user_id", authUser.id).single();

    if (partErr) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    let body: any;
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

    const { content } = body;
    if (!content?.trim()) return NextResponse.json({ error: "Empty message" }, { status: 400 });

    // Insert message
    const { data: msg, error: insertErr } = await supabase
      .from("dm_messages")
      .insert({
        conversation_id: id,
        sender_id: authUser.id,
        content: content.trim().slice(0, 2000),
      })
      .select("id, content, created_at")
      .single();

    if (insertErr) {
      console.error("DM INSERT FAILED:", { convId: id, sender: authUser.id, err: insertErr });
      return NextResponse.json({ error: insertErr.message || "Send failed" }, { status: 500 });
    }

    // Done — trigger on_dm_message_insert handles updated_at
    return NextResponse.json({
      message: { id: msg.id, content: msg.content, isMine: true, createdAt: msg.created_at },
    });
  } catch (error: any) {
    console.error("DM POST error:", error?.message || error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
