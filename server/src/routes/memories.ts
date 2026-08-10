import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { AppError } from '../middleware/errorHandler.js';
import { getSupabaseAdmin } from '../config/supabase.js';
import { logger } from '../lib/logger.js';

const router = Router();
router.use(requireAuth);

// GET /api/memories — List user's memories
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('memories')
    .select('id, memory_type, content, importance, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    logger.error(req.requestId, 'Failed to list memories', { userId, error: error.message });
    throw new AppError(500, 'Failed to load memories.');
  }

  res.json({ success: true, memories: data });
}));

// POST /api/memories — Create memory
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { memory_type, content, importance } = req.body;

  if (!memory_type || !content) {
    throw new AppError(400, 'memory_type and content are required.');
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('memories')
    .insert({
      user_id: userId,
      memory_type,
      content,
      importance: importance || 1,
    })
    .select('id, memory_type, content, importance, created_at')
    .single();

  if (error) {
    logger.error(req.requestId, 'Failed to create memory', { userId, error: error.message });
    throw new AppError(500, 'Failed to save memory.');
  }

  res.json({ success: true, memory: data });
}));

// DELETE /api/memories/:id — Delete a memory
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('memories')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw new AppError(500, 'Failed to delete memory.');
  res.json({ success: true });
}));

// DELETE /api/memories — Clear all user memories
router.delete('/', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('memories')
    .delete()
    .eq('user_id', userId);

  if (error) throw new AppError(500, 'Failed to clear memories.');
  res.json({ success: true });
}));

export default router;
