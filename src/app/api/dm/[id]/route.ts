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

    // Verify participant
    const { data: participation, error: partErr } = await supabase
      .from("dm_participants")
      .select("conversation_id")
      .eq("conversation_id", id)
      .eq("user_id", authUser.id)
      .single();

    if (partErr || !participation) {
      console.error("DM GET: participant check failed", { userId: authUser.id, convId: id, err: partErr });
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get other user's anonymous profile
    const { data: otherPart } = await supabase
      .from("dm_participants")
      .select("user_id")
      .eq("conversation_id", id)
      .neq("user_id", authUser.id)
      .single();

    let otherUser: { userId: string; username: string } | null = null;
    if (otherPart?.user_id) {
      const { data: prof } = await supabase
        .from("student_profiles")
        .select("username")
        .eq("user_id", otherPart.user_id)
        .single();
      if (prof) otherUser = { userId: otherPart.user_id, username: prof.username };
    }

    // Get own username
    const { data: myProf } = await supabase
      .from("student_profiles")
      .select("username")
      .eq("user_id", authUser.id)
      .single();

    // Fetch messages
    const { data: messages, error: msgErr } = await supabase
      .from("dm_messages")
      .select("id, content, sender_id, created_at, is_read")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true })
      .limit(100);

    if (msgErr) {
      console.error("DM GET: message fetch error", { convId: id, err: msgErr });
      throw msgErr;
    }

    // Mark unread as read
    const unreadIds = (messages || [])
      .filter(m => m.sender_id !== authUser.id && !m.is_read)
      .map(m => m.id);

    if (unreadIds.length > 0) {
      await supabase
        .from("dm_messages")
        .update({ is_read: true })
        .in("id", unreadIds);
    }

    return NextResponse.json({
      otherUser,
      myUsername: myProf?.username || null,
      messages: (messages || []).map(m => ({
        id: m.id,
        content: m.content,
        isMine: m.sender_id === authUser.id,
        createdAt: m.created_at,
      })),
    });
  } catch (error: any) {
    console.error("DM GET error:", error?.message || error);
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
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
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify participant
    const { data: participation, error: partErr } = await supabase
      .from("dm_participants")
      .select("conversation_id")
      .eq("conversation_id", id)
      .eq("user_id", authUser.id)
      .single();

    if (partErr || !participation) {
      console.error("DM POST: participant check failed", { userId: authUser.id, convId: id, err: partErr });
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { content } = await req.json();
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
      console.error("DM POST: insert failed", {
        convId: id,
        senderId: authUser.id,
        err: insertErr,
      });
      return NextResponse.json({ error: `Send failed: ${insertErr.message}` }, { status: 500 });
    }

    // Update conversation timestamp
    await supabase
      .from("dm_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", id);

    return NextResponse.json({
      message: {
        id: msg.id,
        content: msg.content,
        isMine: true,
        createdAt: msg.created_at,
      },
    });
  } catch (error: any) {
    console.error("DM POST error:", error?.message || error);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
