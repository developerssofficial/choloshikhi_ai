import { Router, Request, Response } from 'express';
import { handleChat, resetGeminiKeys, getProviderStatus } from '../services/providers.js';
import { chatRateLimit, validateChatInput } from '../middleware.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { getSupabaseAdmin } from '../config/supabase.js';
import { getPlanLimits } from '../config/planLimits.js';
import { logger } from '../lib/logger.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

// GET /api/chat/health — Health check (no auth needed)
router.get('/health', (_req: Request, res: Response) => {
  resetGeminiKeys();
  const status = getProviderStatus();
  res.json({
    success: true,
    status: 'ok',
    providers: {
      primary: status.gemini > 0,
      secondary: status.mimo,
    },
    timestamp: new Date().toISOString(),
  });
});

// POST /api/chat — Main chat endpoint (auth + validation + rate limiting)
router.post('/', requireAuth, chatRateLimit, validateChatInput, asyncHandler(async (req: Request, res: Response) => {
  const requestId = req.requestId!;
  const userId = req.user!.id;

  const { message, history = [], model = 'gemini', conversationId, mode } = req.body;

  logger.info(requestId, 'Chat request started', { userId, model, mode: mode || 'chat' });

  // 1. Get user plan
  const supabase = getSupabaseAdmin();
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', userId)
    .single();

  const userPlan = profile?.plan || 'free';
  const limits = getPlanLimits(userPlan);

  // 2. Check if model is allowed
  if (!limits.allowedModels.includes(model)) {
    throw new AppError(403, `Your plan (${userPlan}) does not support this model. Upgrade to Pro for more options.`);
  }

  // 3. Check daily quota and atomically increment usage
  const today = new Date().toISOString().split('T')[0];
  const { data: rpcResult, error: rpcError } = await supabase
    .rpc('increment_usage', {
      p_user_id: userId,
      p_date: today,
      p_max_requests: limits.maxRequestsPerDay,
    });

  if (rpcError) {
    logger.error(requestId, 'Usage increment failed', { userId, error: rpcError.message });
    throw new AppError(500, 'Failed to check usage quota.');
  }

  const newCount = rpcResult as number;
  if (newCount === -1) {
    throw new AppError(429, `Daily request limit reached (${limits.maxRequestsPerDay}). ${userPlan === 'free' ? 'Upgrade to Pro for more.' : 'Please try again tomorrow.'}`);
  }

  // 4. Call AI provider
  logger.info(requestId, 'Calling AI provider', { userId, model, mode: mode || 'chat', requestCount: newCount });
  const result = await handleChat(message, history, model, mode);

  // 5. Save messages to conversation if conversationId provided
  if (conversationId) {
    // Verify user owns this conversation
    const { data: convo } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single();

    if (convo) {
      const { error: msgError } = await supabase.from('messages').insert([
        { conversation_id: conversationId, user_id: userId, role: 'user', content: message },
        { conversation_id: conversationId, user_id: userId, role: 'assistant', content: result.message, model: result.model },
      ]);
      if (msgError) {
        logger.error(requestId, 'Failed to save messages', { userId, conversationId, error: msgError.message });
      }
    }
  }

  logger.info(requestId, 'Chat request completed', { userId, model: result.model, cached: result.cached });

  res.json({
    success: true,
    ...result,
    requestId,
  });
}));

export default router;
