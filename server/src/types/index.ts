// ============================================
// Xparrow AI — Shared TypeScript Types
// ============================================

export interface AuthUser {
  id: string;
  email: string;
}

export interface ChatRequest {
  message: string;
  history?: Array<{ role: string; content: string }>;
  model?: string;
  conversationId?: string;
}

export interface ChatResponse {
  success: boolean;
  message?: string;
  model?: string;
  cached?: boolean;
  conversationId?: string;
  requestId?: string;
}

export interface SubscriptionStatus {
  active: boolean;
  plan: 'free' | 'pro';
  userId?: string;
  subscriptionId?: string;
  expiresAt?: string;
}

export interface PlanLimits {
  maxRequestsPerDay: number;
  maxPrompts: number;
  maxMessages: number;
  maxMemoryItems: number;
  cacheTTLHours: number;
  allowedModels: string[];
}

export interface UsageRecord {
  userId: string;
  date: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: AuthUser;
    }
  }
}
