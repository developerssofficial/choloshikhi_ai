import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyAuthUser } from "@/lib/supabase-auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// GET /api/dm — List user's conversations (MongoDB messages + Supabase profiles)
export async function GET(req: NextRequest) {
  try {
    const authUser = await verifyAuthUser(req);
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = await getDb();
    const convs = db.collection("dm_conversations");
    const msgs = db.collection("dm_messages");

    // Find conversations where this user is a participant
    const myConvs = await convs
      .find({ participants: authUser.id })
      .sort({ updated_at: -1 })
      .toArray();

    if (!myConvs.length) return NextResponse.json({ conversations: [] });

    const enriched = await Promise.all(myConvs.map(async (conv: any) => {
      const otherId = conv.participants.find((p: string) => p !== authUser.id);

      // Get last message + unread count + other user profile — ALL in parallel
      const [lastMsg, unreadCount, profResult] = await Promise.all([
        msgs.findOne({ conversation_id: conv._id.toString() }, { sort: { created_at: -1 } }),
        msgs.countDocuments({ conversation_id: conv._id.toString(), sender_id: { $ne: authUser.id }, is_read: false }),
        otherId ? supabase.from("student_profiles").select("username, nickname, display_name").eq("user_id", otherId).single() : null,
      ]);

      const otherUser = profResult?.data ? {
        userId: otherId,
        username: profResult.data.username,
        nickname: profResult.data.nickname || profResult.data.display_name || null,
      } : null;

      return {
        id: conv._id.toString(),
        updatedAt: conv.updated_at,
        otherUser,
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
      .eq("username", targetUsername.toUpperCase().trim()).single();

    if (!target) return NextResponse.json({ error: "Student not found." }, { status: 404 });
    if (target.user_id === authUser.id) return NextResponse.json({ error: "Cannot message yourself." }, { status: 400 });

    const db = await getDb();
    const convs = db.collection("dm_conversations");

    // Check for existing conversation
    const existing = await convs.findOne({
      participants: { $all: [authUser.id, target.user_id], $size: 2 },
    });

    if (existing) {
      return NextResponse.json({ conversationId: existing._id.toString(), existing: true });
    }

    // Create new conversation
    const result = await convs.insertOne({
      participants: [authUser.id, target.user_id],
      updated_at: new Date(),
    });

    return NextResponse.json({ conversationId: result.insertedId.toString(), existing: false });
  } catch (error: any) {
    console.error("DM create error:", error?.message || error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
