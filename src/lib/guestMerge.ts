/* ===================================================================
   Guest Merge — Links guest session data to real user account
   
   When a guest logs in, their chat history and task executions
   are transferred from the guest UUID to their real user ID.
   =================================================================== */

import { supabase } from "./supabase";

/**
 * Merge guest data into real user account.
 * Called once when a guest user logs in.
 *
 * Steps:
 * 1. Find all data owned by guestId
 * 2. Re-assign to real userId
 * 3. Clean up guest chat_sessions
 * 4. Return summary of what was transferred
 */
export async function mergeGuestData(
  guestId: string,
  realUserId: string
): Promise<{
  success: boolean;
  transferred: {
    chatSessions: number;
    chatMessages: number;
    taskExecutions: number;
    taskSteps: number;
  };
}> {
  const empty = { success: false, transferred: { chatSessions: 0, chatMessages: 0, taskExecutions: 0, taskSteps: 0 } };

  if (!guestId || !realUserId || guestId === realUserId) {
    return { success: true, transferred: { chatSessions: 0, chatMessages: 0, taskExecutions: 0, taskSteps: 0 } };
  }

  try {
    const transferred = { chatSessions: 0, chatMessages: 0, taskExecutions: 0, taskSteps: 0 };

    // ── 1. Transfer chat_sessions ──────────────────────────────
    const { data: guestSessions } = await supabase
      .from("chat_sessions")
      .select("id")
      .eq("user_id", guestId);

    if (guestSessions && guestSessions.length > 0) {
      const { count } = await supabase
        .from("chat_sessions")
        .update({ user_id: realUserId })
        .eq("user_id", guestId);
      transferred.chatSessions = count || guestSessions.length;
    }

    // ── 2. Transfer chat_history ───────────────────────────────
    const { count: msgCount } = await supabase
      .from("chat_history")
      .update({ user_id: realUserId })
      .eq("user_id", guestId);
    transferred.chatMessages = msgCount || 0;

    // ── 3. Transfer task_executions ────────────────────────────
    const { count: execCount } = await supabase
      .from("task_executions")
      .update({ user_id: realUserId })
      .eq("user_id", guestId);
    transferred.taskExecutions = execCount || 0;

    // ── 4. Task execution steps follow via ON DELETE CASCADE ───
    // (Steps are linked by execution_id, so they move automatically)
    transferred.taskSteps = 0;

    // ── 5. Clean up user_usage ─────────────────────────────────
    const { data: guestUsage } = await supabase
      .from("user_usage")
      .select("usage_date, message_count")
      .eq("user_id", guestId);

    if (guestUsage && guestUsage.length > 0) {
      for (const usage of guestUsage) {
        await supabase.rpc("increment_usage", {
          p_user_id: realUserId,
          p_date: usage.usage_date,
        });
      }
      await supabase.from("user_usage").delete().eq("user_id", guestId);
    }

    return { success: true, transferred };
  } catch (err) {
    console.error("Guest merge error:", err);
    return empty;
  }
}


