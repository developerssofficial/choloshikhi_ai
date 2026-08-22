import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyAuthUser } from "@/lib/supabase-auth";
import { filterProfanity } from "@/lib/profanityFilter";
import { getDb } from "@/lib/mongodb";

// GET /api/groups/[id]/messages — Fetch group messages from MongoDB
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
      .from("group_members").select("role").eq("group_id", id).eq("user_id", authUser.id).single();

    if (memErr) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    // Fetch messages from MongoDB
    const db = await getDb();
    const msgs = db.collection("group_messages");
    const messages = await msgs.find({ group_id: id }).sort({ created_at: 1 }).limit(200).toArray();

    // Get sender profiles from Supabase
    const senderIds = [...new Set(messages.map((m: any) => m.sender_id))];
    const { data: profiles } = senderIds.length > 0
      ? await supabase.from("student_profiles").select("user_id, username, nickname, display_name").in("user_id", senderIds)
      : { data: [] };

    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

    return NextResponse.json({
      messages: messages.map((m: any) => {
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
      }),
    });
  } catch (error: any) {
    console.error("Group messages GET error:", error?.message || error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// POST /api/groups/[id]/messages — Send message to group via MongoDB
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
      .from("group_members").select("role").eq("group_id", id).eq("user_id", authUser.id).single();

    if (memErr) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    let body: any;
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

    const { content } = body;
    if (!content?.trim()) return NextResponse.json({ error: "Empty message" }, { status: 400 });

    // Profanity filter
    const filteredContent = filterProfanity(content.trim());

    // Insert message into MongoDB
    const db = await getDb();
    const msgs = db.collection("group_messages");
    const now = new Date();
    const result = await msgs.insertOne({
      group_id: id,
      sender_id: authUser.id,
      content: filteredContent.slice(0, 2000),
      created_at: now,
    });

    // Get sender profile from Supabase
    const { data: prof } = await supabase
      .from("student_profiles").select("username, nickname, display_name").eq("user_id", authUser.id).single();

    return NextResponse.json({
      message: {
        id: result.insertedId.toString(),
        content: filteredContent.slice(0, 2000),
        senderId: authUser.id,
        senderUsername: prof?.username || "Unknown",
        senderNickname: prof?.nickname || prof?.display_name || null,
        isMine: true,
        createdAt: now,
      },
    });
  } catch (error: any) {
    console.error("Group messages POST error:", error?.message || error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
