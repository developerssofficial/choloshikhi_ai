import { PlanLimits } from '../types/index.js';

// Configurable plan limits
// allowedModels uses provider names that the frontend actually sends: "gemini", "mimo"
export const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    maxRequestsPerDay: 100,
    maxPrompts: 40,
    maxMessages: 80,
    maxMemoryItems: 50,
    cacheTTLHours: 24,
    allowedModels: ['gemini'],
  },
  pro: {
    maxRequestsPerDay: 1000,
    maxPrompts: 400,
    maxMessages: 800,
    maxMemoryItems: 500,
    cacheTTLHours: 72,
    allowedModels: ['gemini', 'mimo'],
  },
};

export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}
