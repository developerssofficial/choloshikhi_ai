import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyAuthUser } from "@/lib/supabase-auth";

// GET /api/memory — Fetch active memory facts, topics, and session context overview
export async function GET(req: NextRequest) {
  try {
    const authUser = await verifyAuthUser(req);

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = authUser.id;

    // Fetch user memory facts & user topics in parallel
    const [memoryRes, topicsRes, statsRes] = await Promise.all([
      supabase
        .from("user_memory")
        .select("id, category, key, value, confidence, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(30),
      supabase
        .from("user_topics")
        .select("id, topic, coverage, mention_count, last_practiced")
        .eq("user_id", userId)
        .order("last_practiced", { ascending: false })
        .limit(20),
      supabase
        .from("chat_history")
        .select("id", { count: "exact" })
        .eq("user_id", userId),
    ]);

    const facts = memoryRes.data || [];
    const topics = topicsRes.data || [];
    const totalMessagesCount = statsRes.count || 0;

    return NextResponse.json({
      facts,
      topics,
      totalMessagesCount,
    });
  } catch (err: any) {
    console.error("Fetch memory error:", err);
    return NextResponse.json({ error: "Failed to fetch memory" }, { status: 500 });
  }
}

// DELETE /api/memory — Delete a specific fact or topic by ID
export async function DELETE(req: NextRequest) {
  try {
    const authUser = await verifyAuthUser(req);

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type"); // "fact" | "topic" | "all"

    if (type === "all") {
      await Promise.all([
        supabase.from("user_memory").delete().eq("user_id", authUser.id),
        supabase.from("user_topics").delete().eq("user_id", authUser.id),
      ]);
      return NextResponse.json({ success: true, message: "All memory cleared" });
    }

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    if (type === "topic") {
      await supabase
        .from("user_topics")
        .delete()
        .eq("id", id)
        .eq("user_id", authUser.id);
    } else {
      await supabase
        .from("user_memory")
        .delete()
        .eq("id", id)
        .eq("user_id", authUser.id);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Delete memory error:", err);
    return NextResponse.json({ error: "Failed to delete memory item" }, { status: 500 });
  }
}
