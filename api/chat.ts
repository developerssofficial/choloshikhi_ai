import { generateRequestId, jsonError, getAuthToken, setCorsHeaders } from './_lib/helpers';
import { verifyToken, getSupabase } from './_lib/supabase';
import { getPlanLimits } from './_lib/planLimits';
import { handleChat, resetGeminiKeys, getProviderStatus } from './_lib/providers';

export const config = { maxDuration: 30 };

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const requestId = generateRequestId();

  try {
    // GET /api/chat/health
    if (req.method === 'GET') {
      resetGeminiKeys();
      const status = getProviderStatus();
      return res.json({
        success: true, status: 'ok',
        providers: { primary: status.gemini > 0, secondary: status.mimo },
        timestamp: new Date().toISOString(),
      });
    }

    if (req.method !== 'POST') return jsonError(res, 405, 'Method not allowed', requestId);

    const token = getAuthToken(req);
    if (!token) return jsonError(res, 401, 'Authentication required.', requestId);
    const user = await verifyToken(token);
    if (!user) return jsonError(res, 401, 'Invalid or expired token.', requestId);

    const { message, history = [], model = 'gemini', conversationId, mode } = req.body || {};
    if (!message || typeof message !== 'string' || !message.trim()) {
      return jsonError(res, 400, 'Message is required.', requestId);
    }
    if (message.length > 10000) {
      return jsonError(res, 400, 'Message too long. Max 10,000 characters.', requestId);
    }

    const supabase = getSupabase();
    const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single();
    const userPlan = profile?.plan || 'free';
    const limits = getPlanLimits(userPlan);

    if (!limits.allowedModels.includes(model)) {
      return jsonError(res, 403, `Your plan (${userPlan}) does not support this model.`, requestId);
    }

    const today = new Date().toISOString().split('T')[0];
    const { data: rpcResult, error: rpcError } = await supabase.rpc('increment_usage', {
      p_user_id: user.id, p_date: today, p_max_requests: limits.maxRequestsPerDay,
    });
    if (rpcError) return jsonError(res, 500, 'Failed to check usage quota.', requestId);
    const newCount = rpcResult as number;
    if (newCount === -1) {
      return jsonError(res, 429, `Daily limit reached (${limits.maxRequestsPerDay}). ${userPlan === 'free' ? 'Upgrade to Pro.' : 'Try again tomorrow.'}`, requestId);
    }

    const result = await handleChat(message.trim(), history, model, mode);

    if (conversationId) {
      const { data: convo } = await supabase.from('conversations').select('id').eq('id', conversationId).eq('user_id', user.id).single();
      if (convo) {
        await supabase.from('messages').insert([
          { conversation_id: conversationId, user_id: user.id, role: 'user', content: message.trim() },
          { conversation_id: conversationId, user_id: user.id, role: 'assistant', content: result.message, model: result.model },
        ]);
      }
    }

    return res.json({ success: true, ...result, requestId });
  } catch (error: any) {
    console.error(`[${requestId}] Chat error:`, error);
    return jsonError(res, error.statusCode || 500, error.message || 'Something went wrong.', requestId);
  }
}
