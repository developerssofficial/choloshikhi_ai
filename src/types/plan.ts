export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';
export type Effort = 'easy' | 'medium' | 'hard';
export type Complexity = 'simple' | 'medium' | 'complex';
export type PlanPhase = 'planning' | 'ready' | 'reviewing' | 'executing' | 'completed';

export interface PlanTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  effort?: Effort;
  dependencies?: string[];
}

export interface PlanPhaseGroup {
  id: string;
  title: string;
  tasks: PlanTask[];
}

export interface MissingInfo {
  question: string;
  options: string[];
  selected?: string;
}

export interface PlanDependency {
  from: string;
  to: string;
}

export interface PlanData {
  goal: string;
  complexity: Complexity;
  summary: string;
  phases: PlanPhaseGroup[];
  dependencies: PlanDependency[];
  missingInfo?: MissingInfo[];
}

export interface PlanState {
  phase: PlanPhase;
  data: PlanData | null;
  executionProgress: number;
  currentTaskIndex: number;
}
