import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/sessions/[id] - Get session messages
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch session info
    const { data: session } = await supabase
      .from("chat_sessions")
      .select("id, title")
      .eq("id", id)
      .single();

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Fetch messages for this session
    const { data: rows, error } = await supabase
      .from("chat_history")
      .select("message, response")
      .eq("session_id", id)
      .order("timestamp", { ascending: true });

    if (error) throw error;

    // Convert to messages array for frontend
    const messages: Array<{ role: string; content: string }> = [];
    for (const row of rows || []) {
      messages.push({ role: "user", content: row.message });
      messages.push({ role: "assistant", content: row.response });
    }

    return NextResponse.json({ session, messages });
  } catch (error: any) {
    console.error("Session messages error:", error);
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }
}

// DELETE /api/sessions/[id] - Delete session
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { error } = await supabase
      .from("chat_sessions")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Session delete error:", error);
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 });
  }
}
