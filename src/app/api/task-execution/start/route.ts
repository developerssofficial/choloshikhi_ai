import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyAuthUser } from "@/lib/supabase-auth";

/* ===================================================================
   POST /api/task-execution/start
   
   Creates a new task execution from a validated TaskGraph.
   Returns the execution ID + initial step statuses.
   =================================================================== */

export async function POST(req: NextRequest) {
  try {
    const { graph, sessionId } = await req.json();
    const authUser = await verifyAuthUser(req);
    const userId = authUser?.id;

    if (!graph || !graph.nodes || !graph.title) {
      return NextResponse.json({ error: "Invalid task graph" }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // Create execution record
    const { data: execution, error: execError } = await supabase
      .from("task_executions")
      .insert({
        user_id: userId,
        session_id: sessionId || null,
        graph: graph,
        title: graph.title,
        task_type: graph.taskType || "planning",
        status: "pending",
      })
      .select()
      .single();

    if (execError) {
      console.error("Failed to create execution:", execError);
      return NextResponse.json({ error: "Failed to create execution" }, { status: 500 });
    }

    // Create step records for all nodes
    const stepRecords = graph.nodes.map((node: any) => ({
      execution_id: execution.id,
      step_id: node.id,
      status: "pending" as const,
      result: null,
      output_text: null,
      error: null,
      user_input: null,
      retry_count: 0,
    }));

    const { error: stepsError } = await supabase
      .from("task_execution_steps")
      .insert(stepRecords);

    if (stepsError) {
      console.error("Failed to create steps:", stepsError);
      return NextResponse.json({ error: "Failed to create steps" }, { status: 500 });
    }

    return NextResponse.json({
      executionId: execution.id,
      status: execution.status,
      totalSteps: graph.nodes.length,
    });
  } catch (err: any) {
    console.error("Start execution error:", err);
    return NextResponse.json(
      { error: "Failed to start execution" },
      { status: 500 }
    );
  }
}
