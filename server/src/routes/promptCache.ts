import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { AppError } from '../middleware/errorHandler.js';
import { getSupabaseAdmin } from '../config/supabase.js';
import { logger } from '../lib/logger.js';

const router = Router();
router.use(requireAuth);

// GET /api/prompt-cache — Get cached response
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { cache_key } = req.query;

  if (!cache_key || typeof cache_key !== 'string') {
    throw new AppError(400, 'cache_key is required.');
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('prompt_cache')
    .select('id, response, model, expires_at')
    .eq('user_id', userId)
    .eq('cache_key', cache_key)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !data) {
    res.json({ success: true, cached: false });
    return;
  }

  // Update last accessed
  await supabase
    .from('prompt_cache')
    .update({ last_accessed_at: new Date().toISOString() })
    .eq('id', data.id);

  res.json({ success: true, cached: true, response: data.response, model: data.model });
}));

// POST /api/prompt-cache — Store cached response
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { cache_key, model, response: cachedResponse, ttl_hours } = req.body;

  if (!cache_key || !cachedResponse) {
    throw new AppError(400, 'cache_key and response are required.');
  }

  const supabase = getSupabaseAdmin();
  const expiresAt = new Date(Date.now() + (ttl_hours || 24) * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from('prompt_cache')
    .upsert({
      user_id: userId,
      cache_key,
      model: model || 'gemini',
      response: cachedResponse,
      expires_at: expiresAt,
    }, { onConflict: 'user_id,cache_key' });

  if (error) {
    logger.error(req.requestId, 'Failed to cache response', { userId, error: error.message });
    throw new AppError(500, 'Failed to cache response.');
  }

  res.json({ success: true });
}));

// DELETE /api/prompt-cache — Clear user's cache
router.delete('/', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('prompt_cache')
    .delete()
    .eq('user_id', userId);

  if (error) throw new AppError(500, 'Failed to clear cache.');
  res.json({ success: true });
}));

export default router;
