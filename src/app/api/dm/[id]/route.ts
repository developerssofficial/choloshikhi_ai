import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyAuthUser } from "@/lib/supabase-auth";
import { filterProfanity } from "@/lib/profanityFilter";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// GET /api/dm/[id] — Fetch messages + mark read
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authUser = await verifyAuthUser(req);
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = await getDb();
    const convs = db.collection("dm_conversations");
    const msgs = db.collection("dm_messages");

    // Verify participant
    const conv = await convs.findOne({ _id: new ObjectId(id) });
    if (!conv || !conv.participants.includes(authUser.id)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const otherId = conv.participants.find((p: string) => p !== authUser.id);

    // Get messages + profiles in parallel
    const [messages, myProf, otherProf] = await Promise.all([
      msgs.find({ conversation_id: id }).sort({ created_at: 1 }).limit(100).toArray(),
      supabase.from("student_profiles").select("username").eq("user_id", authUser.id).single(),
      otherId ? supabase.from("student_profiles").select("username, nickname, display_name").eq("user_id", otherId).single() : null,
    ]);

    // Mark unread as read (fire-and-forget)
    const unreadFilter = { conversation_id: id, sender_id: { $ne: authUser.id }, is_read: false };
    msgs.updateMany(unreadFilter, { $set: { is_read: true } }).catch(() => {});

    return NextResponse.json({
      otherUser: otherProf?.data && otherId ? {
        userId: otherId,
        username: otherProf.data.username,
        nickname: otherProf.data.nickname || otherProf.data.display_name || null,
      } : null,
      myUsername: myProf?.data?.username || null,
      messages: messages.map((m: any) => ({
        id: m._id.toString(),
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

// POST /api/dm/[id] — Send a message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authUser = await verifyAuthUser(req);
    if (!authUser) return NextResponse.json({ error: "Login required" }, { status: 401 });

    const db = await getDb();
    const convs = db.collection("dm_conversations");
    const msgs = db.collection("dm_messages");

    // Verify participant
    const conv = await convs.findOne({ _id: new ObjectId(id) });
    if (!conv || !conv.participants.includes(authUser.id)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    let body: any;
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

    const { content } = body;
    if (!content?.trim()) return NextResponse.json({ error: "Empty message" }, { status: 400 });

    // Profanity filter
    const filteredContent = filterProfanity(content.trim());

    // Insert message + update conversation timestamp
    const now = new Date();
    const result = await msgs.insertOne({
      conversation_id: id,
      sender_id: authUser.id,
      content: filteredContent.slice(0, 2000),
      is_read: false,
      created_at: now,
    });

    // Update conversation timestamp (fire-and-forget)
    convs.updateOne({ _id: new ObjectId(id) }, { $set: { updated_at: now } }).catch(() => {});

    return NextResponse.json({
      message: {
        id: result.insertedId.toString(),
        content: filteredContent.slice(0, 2000),
        isMine: true,
        createdAt: now,
      },
    });
  } catch (error: any) {
    console.error("DM POST error:", error?.message || error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
