import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyAuthUser } from "@/lib/supabase-auth";
import { getEligibleSteps, calculateProgress } from "@/lib/taskExecutionEngine";

/* ===================================================================
   GET /api/task-execution/[id]/status
   
   Returns current execution state + step statuses + eligible steps.
   Client polls this for near-real-time progress updates.
   =================================================================== */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authUser = await verifyAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch execution — verify ownership
    const { data: execution, error: execError } = await supabase
      .from("task_executions")
      .select("*")
      .eq("id", id)
      .eq("user_id", authUser.id)
      .single();

    if (execError || !execution) {
      return NextResponse.json({ error: "Execution not found" }, { status: 404 });
    }

    // Fetch all steps
    const { data: steps, error: stepsError } = await supabase
      .from("task_execution_steps")
      .select("*")
      .eq("execution_id", id)
      .order("created_at", { ascending: true });

    if (stepsError) {
      return NextResponse.json({ error: "Failed to fetch steps" }, { status: 500 });
    }

    // Build step status map
    const stepStatuses = new Map<string, string>();
    for (const step of steps || []) {
      stepStatuses.set(step.step_id, step.status);
    }

    // Calculate eligible steps and progress
    const graph = execution.graph;
    const eligibleSteps = execution.status === "running" || execution.status === "pending"
      ? getEligibleSteps(graph, stepStatuses as any)
      : [];
    const progress = calculateProgress(graph, stepStatuses as any);

    return NextResponse.json({
      execution: {
        id: execution.id,
        title: execution.title,
        task_type: execution.task_type,
        status: execution.status,
        current_step: execution.current_step,
        started_at: execution.started_at,
        completed_at: execution.completed_at,
        created_at: execution.created_at,
        updated_at: execution.updated_at,
        graph: graph,
      },
      steps: steps || [],
      eligibleSteps,
      progress,
    });
  } catch (err: any) {
    console.error("Status fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch status" },
      { status: 500 }
    );
  }
}
