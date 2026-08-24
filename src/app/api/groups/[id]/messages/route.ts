import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyAuthUser } from "@/lib/supabase-auth";
import { filterProfanity } from "@/lib/profanityFilter";

// GET /api/groups/[id]/messages — Fetch group messages from Supabase
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authUser = await verifyAuthUser(req);
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify membership via Supabase
    const { error: memErr } = await supabase
      .from("group_members").select("role").eq("group_id", id).eq("user_id", authUser.id).maybeSingle();

    if (memErr) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    // Fetch messages from Supabase
    const { data: messages } = await supabase
      .from("group_messages")
      .select("id, content, sender_id, created_at")
      .eq("group_id", id)
      .order("created_at", { ascending: true })
      .limit(200);

    // Get sender profiles from Supabase
    const senderIds = [...new Set((messages || []).map(m => m.sender_id))];
    const { data: profiles } = senderIds.length > 0
      ? await supabase.from("student_profiles").select("user_id, username, nickname, display_name").in("user_id", senderIds)
      : { data: [] };

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    return NextResponse.json({
      messages: (messages || []).map((m: any) => {
        const prof = profileMap.get(m.sender_id);
        return {
          id: m.id,
          content: m.content,
          senderId: m.sender_id,
          senderUsername: prof?.username || "Unknown",
          senderNickname: prof?.nickname || prof?.display_name || null,
          isMine: m.sender_id === authUser.id,
          createdAt: m.created_at,
        };
      }),
    });
  } catch (error: any) {
    console.error("Group messages GET error:", error?.message || error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// POST /api/groups/[id]/messages — Send message to group via Supabase
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authUser = await verifyAuthUser(req);
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify membership via Supabase
    const { error: memErr } = await supabase
      .from("group_members").select("role").eq("group_id", id).eq("user_id", authUser.id).maybeSingle();

    if (memErr) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    let body: any;
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

    const { content } = body;
    if (!content?.trim()) return NextResponse.json({ error: "Empty message" }, { status: 400 });

    // Profanity filter
    const filteredContent = filterProfanity(content.trim());

    // Insert message into Supabase
    const { data: msg, error: msgErr } = await supabase
      .from("group_messages")
      .insert({
        group_id: id,
        sender_id: authUser.id,
        content: filteredContent.slice(0, 2000),
      })
      .select("id, content, created_at")
      .single();

    if (msgErr) {
      console.error("Group message insert error:", msgErr);
      return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
    }

    // Get sender profile from Supabase
    const { data: prof } = await supabase
      .from("student_profiles").select("username, nickname, display_name").eq("user_id", authUser.id).maybeSingle();

    return NextResponse.json({
      message: {
        id: msg.id,
        content: msg.content,
        senderId: authUser.id,
        senderUsername: prof?.username || "Unknown",
        senderNickname: prof?.nickname || prof?.display_name || null,
        isMine: true,
        createdAt: msg.created_at,
      },
    });
  } catch (error: any) {
    console.error("Group messages POST error:", error?.message || error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
