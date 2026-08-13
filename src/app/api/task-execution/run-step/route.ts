import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  AIExecutionProvider,
  getEligibleSteps,
  isExecutionComplete,
} from "@/lib/taskExecutionEngine";
import type { TaskNode, TaskNodeStatus } from "@/lib/taskTypes";

/* ===================================================================
   POST /api/task-execution/run-step
   
   Executes a single eligible step via AI.
   Client calls this repeatedly to advance the execution.
   Each call is short-lived (serverless-safe).
   =================================================================== */

export async function POST(req: NextRequest) {
  try {
    const { executionId, stepId, userId, userInput } = await req.json();

    if (!executionId || !stepId || !userId) {
      return NextResponse.json(
        { error: "executionId, stepId, and userId required" },
        { status: 400 }
      );
    }

    // ── Fetch execution ──────────────────────────────────────────
    const { data: execution, error: execError } = await supabase
      .from("task_executions")
      .select("*")
      .eq("id", executionId)
      .eq("user_id", userId)
      .single();

    if (execError || !execution) {
      return NextResponse.json({ error: "Execution not found" }, { status: 404 });
    }

    if (execution.status === "completed" || execution.status === "cancelled") {
      return NextResponse.json({ error: "Execution is finished" }, { status: 400 });
    }

    const graph = execution.graph;

    // ── Fetch all steps ──────────────────────────────────────────
    const { data: steps, error: stepsError } = await supabase
      .from("task_execution_steps")
      .select("*")
      .eq("execution_id", executionId);

    if (stepsError || !steps) {
      return NextResponse.json({ error: "Failed to fetch steps" }, { status: 500 });
    }

    const stepStatuses = new Map<string, string>();
    for (const s of steps) {
      stepStatuses.set(s.step_id, s.status);
    }

    // ── Validate this step can run ───────────────────────────────
    const eligible = getEligibleSteps(graph, stepStatuses as any);
    const stepRecord = steps.find((s) => s.step_id === stepId);

    // Allow running a step that's in "failed" state (retry) or "waiting_for_user" (with input)
    const isRetry = stepRecord?.status === "failed";
    const isWaitingResponse = stepRecord?.status === "waiting_for_user" && userInput;

    if (!eligible.includes(stepId) && !isRetry && !isWaitingResponse) {
      return NextResponse.json(
        { error: `Step '${stepId}' is not eligible to run. Eligible: ${eligible.join(", ")}` },
        { status: 400 }
      );
    }

    // ── Find the node in the graph ───────────────────────────────
    const node: TaskNode | undefined = graph.nodes.find((n: TaskNode) => n.id === stepId);
    if (!node) {
      return NextResponse.json({ error: `Node '${stepId}' not found in graph` }, { status: 400 });
    }

    // ── Update step to running ───────────────────────────────────
    const now = new Date().toISOString();
    await supabase
      .from("task_execution_steps")
      .update({
        status: "running",
        started_at: stepRecord?.started_at || now,
        user_input: userInput || stepRecord?.user_input || null,
        error: null,
      })
      .eq("execution_id", executionId)
      .eq("step_id", stepId);

    // Update execution status
    await supabase
      .from("task_executions")
      .update({
        status: "running",
        current_step: stepId,
        started_at: execution.started_at || now,
      })
      .eq("id", executionId);

    // ── Build completed steps context ────────────────────────────
    const completedSteps = steps
      .filter((s) => s.status === "completed" && s.output_text)
      .map((s) => ({
        stepId: s.step_id,
        output: s.output_text || "",
      }));

    // ── Execute via AI provider ──────────────────────────────────
    const result = await AIExecutionProvider.executeStep({
      stepId: node.id,
      stepTitle: node.title,
      stepDescription: node.description,
      stepHowTo: node.howTo,
      stepExpectedOutput: node.expectedOutput,
      taskType: graph.taskType,
      graphTitle: graph.title,
      completedSteps,
      userInput: userInput || undefined,
      retryCount: (stepRecord?.retry_count || 0) + (isRetry ? 1 : 0),
    });

    // ── Update step with result ──────────────────────────────────
    let stepStatus: TaskNodeStatus;
    if (!result.success) {
      stepStatus = "failed";
    } else if (result.waitForUser) {
      stepStatus = "waiting_for_user";
    } else {
      stepStatus = "completed";
    }

    const stepUpdate: any = {
      status: stepStatus,
      result: result.result,
      output_text: result.outputText,
      error: result.error || null,
      completed_at: stepStatus === "completed" ? new Date().toISOString() : null,
      retry_count: (stepRecord?.retry_count || 0) + (isRetry ? 1 : 0),
    };

    // If waiting for user, store the question
    if (result.waitForUser && result.waitForUserQuestion) {
      stepUpdate.result = {
        ...result.result,
        waitForUserQuestion: result.waitForUserQuestion,
      };
    }

    await supabase
      .from("task_execution_steps")
      .update(stepUpdate)
      .eq("execution_id", executionId)
      .eq("step_id", stepId);

    // ── Check if execution is complete ───────────────────────────
    const updatedStepStatuses = new Map(stepStatuses);
    updatedStepStatuses.set(stepId, stepStatus);

    // If this step completed, also check if any waiting_for_user steps can now proceed
    // (Their deps might have been met, but they were waiting for user input)
    if (stepStatus === "completed") {
      // Check if ALL steps are done
      const allDone = isExecutionComplete(updatedStepStatuses as any);
      if (allDone) {
        await supabase
          .from("task_executions")
          .update({
            status: "completed",
            current_step: null,
            completed_at: new Date().toISOString(),
          })
          .eq("id", executionId);
      } else {
        // Clear current_step so client knows to trigger next
        await supabase
          .from("task_executions")
          .update({ current_step: null })
          .eq("id", executionId);
      }
    } else if (stepStatus === "failed") {
      // Don't change execution status — let client decide (retry or cancel)
      await supabase
        .from("task_executions")
        .update({ current_step: null })
        .eq("id", executionId);
    }

    // ── Return result ────────────────────────────────────────────
    return NextResponse.json({
      stepId,
      status: stepStatus,
      output: result.outputText,
      details: result.result?.details || null,
      recommendations: result.result?.recommendations || [],
      waitForUser: result.waitForUser || false,
      waitForUserQuestion: result.waitForUserQuestion || null,
      error: result.error || null,
      retryCount: stepUpdate.retry_count,
    });
  } catch (err: any) {
    console.error("Run step error:", err);
    return NextResponse.json(
      { error: "Failed to execute step" },
      { status: 500 }
    );
  }
}
