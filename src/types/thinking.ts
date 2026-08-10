export type ThinkingDepth = 'light' | 'deep' | 'advanced';
export type ThinkingStepStatus = 'completed' | 'in_progress' | 'pending';

export interface ThinkingStep {
  id: string;
  label: string;
  status: ThinkingStepStatus;
}

export interface ThinkingAnalysis {
  depth: ThinkingDepth;
  steps: ThinkingStep[];
  summary?: string;
  alternatives?: { name: string; pros: string[]; cons: string[] }[];
  assumption?: string;
  known?: string;
  recommendation?: string;
  limitation?: string;
}

export interface ThinkingData {
  analysis: ThinkingAnalysis;
  answer: string;
  thinkingSummary?: {
    factors?: string[];
    assumption?: string;
    tradeoff?: string;
    decision?: string;
  };
  createPlanOffer?: boolean;
}
