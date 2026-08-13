/* ===================================================================
   Task Mode — Centralized Type Definitions
   
   All task-related types live here. Components and API share these
   to ensure consistency between backend data and frontend rendering.
   =================================================================== */

// ── Node Status ──────────────────────────────────────────────────────
export type TaskNodeStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "waiting_for_user"
  | "skipped";

// ── Task Types ───────────────────────────────────────────────────────
export type TaskType =
  | "research"
  | "coding"
  | "planning"
  | "study"
  | "content"
  | "business"
  | "project"
  | "mixed";

// ── Single Node in the Task Graph ────────────────────────────────────
export interface TaskNode {
  id: string;
  title: string;
  description: string;
  purpose: string;
  howTo: string;
  expectedOutput: string;
  status: TaskNodeStatus;
  dependencies: string[];
  parallelGroup?: string | null;
  sources: ResearchSource[];
  recommendation?: string; // [RECOMMENDATION] prefix content
  estimatedDuration?: string;
  tips?: string[];
}

// ── Research Source ──────────────────────────────────────────────────
export interface ResearchSource {
  title: string;
  url: string;
  type?: "official" | "academic" | "news" | "blog" | "government" | "other";
  reliability?: "high" | "medium" | "low";
  snippet?: string;
}

// ── Research Summary ─────────────────────────────────────────────────
export interface ResearchSummary {
  keyFindings: string[];
  sourcesUsed: number;
  location?: string;
  conflictingInfo?: string[];
  recommendations: string[];
}

// ── Complete Task Graph ──────────────────────────────────────────────
export interface TaskGraph {
  title: string;
  taskType: TaskType;
  goal: string;
  researchSummary?: string;
  nodes: TaskNode[];
  userContext?: {
    budget?: string;
    location?: string;
    deadline?: string;
    skillLevel?: string;
    targetAudience?: string;
  };
}

// ── Clarification Questions ──────────────────────────────────────────
export interface TaskClarification {
  message: string;
  questions: ClarificationQuestion[];
}

export interface ClarificationQuestion {
  id: string;
  question: string;
  why: string;
  options?: string[]; // optional predefined answers
}

// ── Validation Result ────────────────────────────────────────────────
export interface TaskValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  cleanedGraph: TaskGraph | null;
}

// ── Task Type Display Config ─────────────────────────────────────────
export interface TaskTypeConfig {
  label: string;
  icon: string;
  color: string; // tailwind color name
}

export const TASK_TYPE_CONFIG: Record<TaskType, TaskTypeConfig> = {
  research: { label: "Research", icon: "\uD83D\uDD0D", color: "sky" },
  coding: { label: "Coding", icon: "\uD83D\uDCBB", color: "violet" },
  planning: { label: "Planning", icon: "\uD83D\uDCCB", color: "amber" },
  study: { label: "Study Plan", icon: "\uD83D\uDCDA", color: "emerald" },
  content: { label: "Content", icon: "\u270D\uFE0F", color: "rose" },
  business: { label: "Business", icon: "\uD83D\uDCB0", color: "orange" },
  project: { label: "Project", icon: "\uD83C\uDD95", color: "cyan" },
  mixed: { label: "Mixed", icon: "\uD83E\uDDE0", color: "purple" },
};

// ── Status Display Config ────────────────────────────────────────────
export interface StatusConfig {
  color: string;
  bgColor: string;
  borderColor: string;
  dotColor: string;
  label: string;
  shadow?: string;
}

export const STATUS_CONFIG: Record<TaskNodeStatus, StatusConfig> = {
  completed: {
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/25",
    dotColor: "bg-emerald-400",
    label: "Completed",
  },
  running: {
    color: "text-violet-400",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/25",
    dotColor: "bg-violet-400",
    label: "Running",
    shadow: "shadow-[0_0_20px_rgba(139,92,246,0.15)]",
  },
  pending: {
    color: "text-gray-500",
    bgColor: "bg-white/[0.03]",
    borderColor: "border-white/[0.06]",
    dotColor: "bg-gray-500",
    label: "Pending",
  },
  failed: {
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/25",
    dotColor: "bg-red-400",
    label: "Failed",
  },
  waiting_for_user: {
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/25",
    dotColor: "bg-amber-400",
    label: "Waiting for you",
  },
  skipped: {
    color: "text-gray-600",
    bgColor: "bg-white/[0.02]",
    borderColor: "border-white/[0.04]",
    dotColor: "bg-gray-600",
    label: "Skipped",
  },
};

// ═══════════════════════════════════════════════════════════════════
// Task Execution Engine Types (Phase 2)
// ═══════════════════════════════════════════════════════════════════

// ── Execution Status ────────────────────────────────────────────────
export type ExecutionStatus =
  | "pending"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

export const EXECUTION_STATUS_CONFIG: Record<ExecutionStatus, StatusConfig> = {
  pending: {
    color: "text-gray-500",
    bgColor: "bg-white/[0.03]",
    borderColor: "border-white/[0.06]",
    dotColor: "bg-gray-500",
    label: "Not started",
  },
  running: {
    color: "text-violet-400",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/25",
    dotColor: "bg-violet-400",
    label: "Running",
    shadow: "shadow-[0_0_20px_rgba(139,92,246,0.15)]",
  },
  paused: {
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/25",
    dotColor: "bg-amber-400",
    label: "Paused",
  },
  completed: {
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/25",
    dotColor: "bg-emerald-400",
    label: "Completed",
  },
  failed: {
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/25",
    dotColor: "bg-red-400",
    label: "Failed",
  },
  cancelled: {
    color: "text-gray-600",
    bgColor: "bg-white/[0.02]",
    borderColor: "border-white/[0.04]",
    dotColor: "bg-gray-600",
    label: "Cancelled",
  },
};

// ── Execution State (from DB) ───────────────────────────────────────
export interface TaskExecution {
  id: string;
  user_id: string;
  session_id: string | null;
  graph: TaskGraph;
  title: string;
  task_type: TaskType;
  status: ExecutionStatus;
  current_step: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Step Execution State (from DB) ──────────────────────────────────
export interface TaskStepExecution {
  id: string;
  execution_id: string;
  step_id: string;
  status: TaskNodeStatus;
  result: any | null;
  output_text: string | null;
  error: string | null;
  user_input: string | null;
  started_at: string | null;
  completed_at: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

// ── Full Execution Status (API response) ────────────────────────────
export interface ExecutionStatusResponse {
  execution: TaskExecution;
  steps: TaskStepExecution[];
  eligibleSteps: string[];  // step IDs that can run now
  progress: {
    total: number;
    completed: number;
    running: number;
    failed: number;
    pending: number;
    percentage: number;
  };
}

// ── Execution Provider Interface (provider-agnostic) ────────────────
// Future: n8n, custom webhooks, or other automation providers
export interface ExecutionProvider {
  name: string;
  executeStep(params: StepExecutionParams): Promise<StepExecutionResult>;
}

export interface StepExecutionParams {
  stepId: string;
  stepTitle: string;
  stepDescription: string;
  stepHowTo: string;
  stepExpectedOutput: string;
  taskType: TaskType;
  graphTitle: string;
  completedSteps: { stepId: string; output: string }[];
  userInput?: string;
  retryCount: number;
}

export interface StepExecutionResult {
  success: boolean;
  outputText: string;
  result: any;
  waitForUser?: boolean;
  waitForUserQuestion?: string;
  error?: string;
}
