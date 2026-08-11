const PLAN_LIMITS: Record<string, { maxRequestsPerDay: number; allowedModels: string[] }> = {
  free: { maxRequestsPerDay: 100, allowedModels: ['gemini'] },
  pro: { maxRequestsPerDay: 1000, allowedModels: ['gemini', 'mimo'] },
};

export function getPlanLimits(plan: string) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}
