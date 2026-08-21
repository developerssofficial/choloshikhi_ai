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

    // Verify user is a participant
    const { data: participation } = await supabase
      .from("dm_participants")
      .select("conversation_id")
      .eq("conversation_id", id)
      .eq("user_id", authUser.id)
      .single();

    if (!participation) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    // Get other user info
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

    // Get own username for "me" label
    const { data: myProf } = await supabase
      .from("student_profiles")
      .select("username")
      .eq("user_id", authUser.id)
      .single();

    // Fetch messages (last 100)
    const { data: messages, error } = await supabase
      .from("dm_messages")
      .select("id, content, sender_id, created_at, is_read")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) throw error;

    // Mark unread messages as read
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
    console.error("DM messages error:", error);
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
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify participant
    const { data: participation } = await supabase
      .from("dm_participants")
      .select("conversation_id")
      .eq("conversation_id", id)
      .eq("user_id", authUser.id)
      .single();

    if (!participation) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const { content } = await req.json();
    if (!content?.trim()) return NextResponse.json({ error: "Empty message" }, { status: 400 });

    // Insert message
    const { data: msg, error } = await supabase
      .from("dm_messages")
      .insert({
        conversation_id: id,
        sender_id: authUser.id,
        content: content.trim().slice(0, 2000),
      })
      .select("id, content, created_at")
      .single();

    if (error) throw error;

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
    console.error("DM send error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
