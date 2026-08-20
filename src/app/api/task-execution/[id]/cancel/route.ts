import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyAuthUser } from "@/lib/supabase-auth";

/* ===================================================================
   POST /api/task-execution/[id]/cancel
   
   Cancels a running execution. Marks all pending/running steps as skipped.
   =================================================================== */

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authUser = await verifyAuthUser(req);
    const userId = authUser?.id;

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // Verify ownership
    const { data: execution, error: execError } = await supabase
      .from("task_executions")
      .select("id, status")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (execError || !execution) {
      return NextResponse.json({ error: "Execution not found" }, { status: 404 });
    }

    if (execution.status === "completed" || execution.status === "cancelled") {
      return NextResponse.json({ error: "Execution already finished" }, { status: 400 });
    }

    // Update execution status
    await supabase
      .from("task_executions")
      .update({
        status: "cancelled",
        current_step: null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", id);

    // Mark pending/running steps as skipped
    await supabase
      .from("task_execution_steps")
      .update({ status: "skipped" })
      .eq("execution_id", id)
      .in("status", ["pending", "running", "waiting_for_user"]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Cancel error:", err);
    return NextResponse.json({ error: "Failed to cancel" }, { status: 500 });
  }
}
