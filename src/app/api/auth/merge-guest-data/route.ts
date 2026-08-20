import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyAuthUser } from "@/lib/supabase-auth";

/* ===================================================================
   POST /api/auth/merge-guest-data

   Called when a returning Google user logs in on a new device
   where they were browsing as anonymous. Transfers anonymous
   user's data to the authenticated account.

   Body: { anonymousUserId: string }
   Auth: Required (JWT of the authenticated user)
   =================================================================== */

export async function POST(req: NextRequest) {
  try {
    const authUser = await verifyAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { anonymousUserId } = await req.json();
    if (!anonymousUserId) {
      return NextResponse.json({ error: "anonymousUserId required" }, { status: 400 });
    }

    // Don't merge if same user (anonymous upgrade already handled by Supabase)
    if (anonymousUserId === authUser.id) {
      return NextResponse.json({ merged: false, reason: "same_user" });
    }

    const realUserId = authUser.id;
    const merged = { chatSessions: 0, chatMessages: 0, taskExecutions: 0 };

    // Transfer chat_sessions
    const { data: sessionsData } = await supabase
      .from("chat_sessions")
      .update({ user_id: realUserId })
      .eq("user_id", anonymousUserId)
      .select("id");
    merged.chatSessions = sessionsData?.length || 0;

    // Transfer chat_history
    const { data: messagesData } = await supabase
      .from("chat_history")
      .update({ user_id: realUserId })
      .eq("user_id", anonymousUserId)
      .select("id");
    merged.chatMessages = messagesData?.length || 0;

    // Transfer task_executions (if table exists)
    try {
      const { data: execData } = await supabase
        .from("task_executions")
        .update({ user_id: realUserId })
        .eq("user_id", anonymousUserId)
        .select("id");
      merged.taskExecutions = execData?.length || 0;
    } catch {
      // Table may not exist yet — ignore
    }

    // Delete anonymous user's auth record
    // Note: service role can delete any user
    try {
      await supabase.auth.admin.deleteUser(anonymousUserId);
    } catch {
      // Ignore — anonymous user may already be cleaned up
    }

    return NextResponse.json({ merged: true, transferred: merged });
  } catch (error: any) {
    console.error("Guest merge error:", error);
    return NextResponse.json({ error: "Merge failed" }, { status: 500 });
  }
}
