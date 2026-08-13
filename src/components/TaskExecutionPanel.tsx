"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type {
  TaskGraph,
  TaskNodeStatus,
  ExecutionStatus,
  TaskStepExecution,
  ExecutionStatusResponse,
} from "@/lib/taskTypes";
import { EXECUTION_STATUS_CONFIG } from "@/lib/taskTypes";

/* ===================================================================
   TaskExecutionPanel — Execution controls + near-real-time polling
   
   Works for ALL users: logged-in (persisted to DB) and guests
   (guest UUID used, stored in sessionStorage for session continuity).
   =================================================================== */

interface Props {
  graph: TaskGraph;
  executionId: string | null;
  userId: string | undefined;
  onExecutionStart: (executionId: string) => void;
  onStepStatusChange: (stepId: string, status: TaskNodeStatus, output?: string) => void;
  onAllComplete: () => void;
}

const POLL_INTERVAL_MS = 3000;
const MAX_AUTO_RUN = 20;

// ── Generate or retrieve a stable guest ID per browser session ────
function getEffectiveUserId(userId: string | undefined): string {
  if (userId) return userId;

  // Check sessionStorage for a persistent guest ID
  const STORAGE_KEY = "choloshikhi_guest_id";
  if (typeof window !== "undefined") {
    let guestId = sessionStorage.getItem(STORAGE_KEY);
    if (!guestId) {
      guestId = crypto.randomUUID();
      sessionStorage.setItem(STORAGE_KEY, guestId);
    }
    return guestId;
  }
  return crypto.randomUUID();
}

export default function TaskExecutionPanel({
  graph,
  executionId: initialExecId,
  userId,
  onExecutionStart,
  onStepStatusChange,
  onAllComplete,
}: Props) {
  const effectiveUserId = getEffectiveUserId(userId);
  const isGuest = !userId;

  const [executionId, setExecutionId] = useState(initialExecId);
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus>("pending");
  const [stepStatuses, setStepStatuses] = useState<Map<string, TaskStepExecution>>(new Map());
  const [eligibleSteps, setEligibleSteps] = useState<string[]>([]);
  const [progress, setProgress] = useState({ total: 0, completed: 0, running: 0, failed: 0, pending: 0, percentage: 0 });
  const [isStarting, setIsStarting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [waitingInput, setWaitingInput] = useState<{ stepId: string; question: string } | null>(null);
  const [stepOutputs, setStepOutputs] = useState<Map<string, string>>(new Map());
  const [autoRunCount, setAutoRunCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // ── Fetch execution status ───────────────────────────────────
  const fetchStatus = useCallback(async () => {
    if (!executionId) return;

    try {
      const res = await fetch(`/api/task-execution/${executionId}/status`);
      if (!res.ok) return;
      const data: ExecutionStatusResponse = await res.json();

      setExecutionStatus(data.execution.status);
      setEligibleSteps(data.eligibleSteps);
      setProgress(data.progress);
      setCurrentStep(data.execution.current_step);

      const newStepMap = new Map<string, TaskStepExecution>();
      const newOutputs = new Map(stepOutputs);
      for (const step of data.steps) {
        newStepMap.set(step.step_id, step);
        if (step.output_text) {
          newOutputs.set(step.step_id, step.output_text);
        }
        onStepStatusChange(step.step_id, step.status, step.output_text || undefined);
      }
      setStepStatuses(newStepMap);
      setStepOutputs(newOutputs);

      for (const step of data.steps) {
        if (step.status === "waiting_for_user" && step.result?.waitForUserQuestion) {
          setWaitingInput({ stepId: step.step_id, question: step.result.waitForUserQuestion });
          setIsRunning(false);
          return;
        }
      }

      if (data.execution.status === "completed") {
        setIsRunning(false);
        onAllComplete();
        stopPolling();
      }
    } catch {}
  }, [executionId, stepOutputs, onStepStatusChange, onAllComplete]);

  // ── Polling ──────────────────────────────────────────────────
  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(fetchStatus, POLL_INTERVAL_MS);
  }, [fetchStatus]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  // ── Start execution ──────────────────────────────────────────
  const handleStart = async () => {
    setIsStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/task-execution/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ graph, userId: effectiveUserId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to start"); return; }

      setExecutionId(data.executionId);
      setExecutionStatus("pending");
      onExecutionStart(data.executionId);
      setIsRunning(true);
      startPolling();
    } catch (err: any) {
      setError(err.message || "Failed to start");
    } finally {
      setIsStarting(false);
    }
  };

  // ── Run a single step ────────────────────────────────────────
  const runStep = async (stepId: string, userInput?: string) => {
    if (!executionId) return;
    try {
      const res = await fetch("/api/task-execution/run-step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ executionId, stepId, userId: effectiveUserId, userInput }),
      });
      const data = await res.json();
      if (!res.ok) { console.error("Step failed:", data.error); return; }

      if (data.waitForUser) {
        setWaitingInput({ stepId, question: data.waitForUserQuestion });
        setIsRunning(false);
      } else if (data.status === "failed") {
        setIsRunning(false);
      }
      await fetchStatus();
    } catch (err) { console.error("Run step error:", err); }
  };

  // ── Auto-run eligible steps ──────────────────────────────────
  useEffect(() => {
    if (!isRunning || !executionId || executionStatus === "completed" || executionStatus === "cancelled") return;
    if (waitingInput) return;

    if (eligibleSteps.length > 0 && autoRunCount < MAX_AUTO_RUN) {
      const nextStep = eligibleSteps[0];
      setCurrentStep(nextStep);
      setAutoRunCount((c) => c + 1);
      runStep(nextStep);
    } else if (eligibleSteps.length === 0 && progress.running === 0 && progress.failed === 0) {
      if (progress.completed === progress.total) {
        setIsRunning(false);
        onAllComplete();
      }
    }
  }, [isRunning, eligibleSteps, executionStatus, autoRunCount, waitingInput, progress, executionId]);

  useEffect(() => {
    if (executionId && (isRunning || executionStatus === "running")) {
      startPolling();
      return () => stopPolling();
    }
  }, [executionId, isRunning, executionStatus, startPolling, stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const handleUserInputSubmit = async (input: string) => {
    if (!waitingInput) return;
    const stepId = waitingInput.stepId;
    setWaitingInput(null);
    setIsRunning(true);
    await runStep(stepId, input);
  };

  const handleRetry = async (stepId: string) => {
    setIsRunning(true);
    setError(null);
    await runStep(stepId);
  };

  const handleCancel = async () => {
    if (!executionId) return;
    try {
      await fetch(`/api/task-execution/${executionId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: effectiveUserId }),
      });
      setIsRunning(false);
      stopPolling();
      await fetchStatus();
    } catch {}
  };

  const handleResume = () => {
    setWaitingInput(null);
    setIsRunning(true);
    setAutoRunCount(0);
  };

  // ── RENDER ───────────────────────────────────────────────────
  const hasStarted = !!executionId;
  const statusCfg = EXECUTION_STATUS_CONFIG[executionStatus];

  return (
    <div className="mt-3 border border-white/[0.08] rounded-2xl overflow-hidden bg-[#12121a]">
      {/* ── Execution Header ──────────────────────────────── */}
      <div className="px-4 py-3 sm:px-5 border-b border-white/[0.06]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] sm:text-[12px] font-semibold text-white">
              Task Execution
            </span>
            {hasStarted && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[8px] sm:text-[9px] font-semibold ${statusCfg.color} ${statusCfg.bgColor} border ${statusCfg.borderColor}`}>
                {statusCfg.label}
              </span>
            )}
            {isGuest && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[7px] sm:text-[8px] text-gray-500 bg-white/[0.03] border border-white/[0.06]">
                Guest
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {hasStarted && isRunning && (
              <button onClick={handleCancel} className="px-3 py-1 text-[10px] sm:text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-all">
                Cancel
              </button>
            )}
            {!hasStarted && (
              <button onClick={handleStart} disabled={isStarting}
                className="px-4 py-1.5 text-[11px] sm:text-[12px] font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg hover:from-violet-500 hover:to-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/20">
                {isStarting ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> Starting...
                  </span>
                ) : "\u25B6 Start Task"}
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {hasStarted && (
          <div className="mt-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] sm:text-[10px] text-gray-500">
                {progress.completed}/{progress.total} steps
                {progress.running > 0 && <span className="text-violet-400 ml-1">({progress.running} active)</span>}
                {progress.failed > 0 && <span className="text-red-400 ml-1">({progress.failed} failed)</span>}
              </span>
              <span className="text-[9px] sm:text-[10px] text-gray-400 font-mono">{progress.percentage}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500 ease-out" style={{ width: `${progress.percentage}%` }} />
            </div>
          </div>
        )}

        {/* Guest notice */}
        {isGuest && !hasStarted && (
          <p className="mt-2 text-[9px] text-gray-600">
            Login to save progress across sessions.
          </p>
        )}
      </div>

      {/* ── Error ─────────────────────────────────────────── */}
      {error && (
        <div className="px-4 py-2 bg-red-500/5 border-b border-red-500/10">
          <p className="text-[10px] sm:text-[11px] text-red-400">{error}</p>
        </div>
      )}

      {/* ── Step-by-step progress ─────────────────────────── */}
      {hasStarted && (
        <div className="px-4 py-3 sm:px-5 space-y-1.5">
          {graph.nodes.map((node) => {
            const stepExec = stepStatuses.get(node.id);
            const status = stepExec?.status || "pending";
            const isActive = currentStep === node.id;
            const hasFailed = status === "failed";
            const isWaiting = status === "waiting_for_user";
            const isDone = status === "completed";

            return (
              <div key={node.id}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all ${
                  isActive ? "bg-violet-500/10 border border-violet-500/20" :
                  hasFailed ? "bg-red-500/5 border border-red-500/15" :
                  isWaiting ? "bg-amber-500/5 border border-amber-500/15" :
                  "bg-transparent border border-transparent"
                }`}>
                <div className="flex-shrink-0">
                  {isDone && (
                    <span className="w-4 h-4 rounded-full bg-emerald-400 flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-[#0f0f14]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                  {isActive && (
                    <span className="relative w-4 h-4 rounded-full bg-violet-400 flex items-center justify-center">
                      <span className="absolute inset-0 rounded-full bg-violet-400 animate-ping opacity-30" />
                      <span className="w-1.5 h-1.5 bg-white rounded-full" />
                    </span>
                  )}
                  {hasFailed && (
                    <span className="w-4 h-4 rounded-full bg-red-400 flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-[#0f0f14]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </span>
                  )}
                  {isWaiting && <span className="w-4 h-4 rounded-full bg-amber-400 animate-pulse" />}
                  {!isDone && !isActive && !hasFailed && !isWaiting && (
                    <span className="w-4 h-4 rounded-full bg-white/[0.06] border border-white/[0.1]" />
                  )}
                </div>

                <span className={`text-[11px] sm:text-[12px] flex-1 truncate ${
                  isDone ? "text-emerald-400" :
                  isActive ? "text-white font-medium" :
                  hasFailed ? "text-red-400" :
                  isWaiting ? "text-amber-400" : "text-gray-500"
                }`}>{node.title}</span>

                {isDone && stepOutputs.get(node.id) && (
                  <span className="text-[9px] sm:text-[10px] text-gray-600 max-w-[200px] truncate hidden sm:inline">
                    {stepOutputs.get(node.id)?.slice(0, 60)}
                  </span>
                )}

                {hasFailed && (
                  <button onClick={() => handleRetry(node.id)}
                    className="px-2 py-0.5 text-[9px] sm:text-[10px] text-red-300 bg-red-500/10 border border-red-500/20 rounded-md hover:bg-red-500/20 transition-all">
                    Retry
                  </button>
                )}
                {isWaiting && (
                  <button onClick={() => setWaitingInput({ stepId: node.id, question: stepExec?.result?.waitForUserQuestion || "Your input needed" })}
                    className="px-2 py-0.5 text-[9px] sm:text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-md hover:bg-amber-500/20 transition-all">
                    Answer
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── User Input ────────────────────────────────────── */}
      {waitingInput && (
        <UserInputForm question={waitingInput.question} onSubmit={handleUserInputSubmit} onSkip={handleResume} />
      )}

      {/* ── All Complete ──────────────────────────────────── */}
      {executionStatus === "completed" && (
        <div className="px-4 py-3 sm:px-5 border-t border-white/[0.06] bg-emerald-500/[0.03]">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 text-sm">{"\u2714"}</span>
            <span className="text-[11px] sm:text-[12px] text-emerald-400 font-medium">
              All {progress.total} steps completed successfully!
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── UserInputForm ────────────────────────────────────────────── */
function UserInputForm({ question, onSubmit, onSkip }: { question: string; onSubmit: (input: string) => void; onSkip: () => void }) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { textareaRef.current?.focus(); }, []);

  const handleSubmit = () => { if (input.trim()) { onSubmit(input.trim()); setInput(""); } };

  return (
    <div className="px-4 py-3 sm:px-5 border-t border-amber-500/15 bg-amber-500/[0.03]">
      <div className="flex items-start gap-2.5 mb-2.5">
        <span className="text-amber-400 text-[11px] mt-0.5 flex-shrink-0">{"\uD83D\uDCAC"}</span>
        <p className="text-[11px] sm:text-[12px] text-amber-200/80 leading-relaxed">{question}</p>
      </div>
      <div className="flex gap-2">
        <textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
          placeholder="Your answer..." rows={2}
          className="flex-1 px-3 py-2 text-[11px] sm:text-[12px] text-white bg-white/[0.04] border border-white/[0.08] rounded-xl resize-none focus:outline-none focus:border-amber-500/30 placeholder:text-gray-600" />
        <div className="flex flex-col gap-1.5">
          <button onClick={handleSubmit} disabled={!input.trim()}
            className="px-3 py-1.5 text-[10px] sm:text-[11px] font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-500 transition-all disabled:opacity-40">Send</button>
          <button onClick={onSkip} className="px-3 py-1 text-[9px] sm:text-[10px] text-gray-500 hover:text-gray-300 transition-colors">Skip</button>
        </div>
      </div>
    </div>
  );
}
