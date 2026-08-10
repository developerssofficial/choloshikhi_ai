import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { AppError } from '../middleware/errorHandler.js';
import { getSupabaseAdmin } from '../config/supabase.js';
import { logger } from '../lib/logger.js';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// GET /api/conversations — List user's conversations
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('conversations')
    .select('id, title, model, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error) {
    logger.error(req.requestId, 'Failed to list conversations', { userId, error: error.message });
    throw new AppError(500, 'Failed to load conversations.');
  }

  res.json({ success: true, conversations: data });
}));

// POST /api/conversations — Create new conversation
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { title, model } = req.body;
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      user_id: userId,
      title: title || 'New Chat',
      model: model || 'gemini',
    })
    .select('id, title, model, created_at')
    .single();

  if (error) {
    logger.error(req.requestId, 'Failed to create conversation', { userId, error: error.message });
    throw new AppError(500, 'Failed to create conversation.');
  }

  res.json({ success: true, conversation: data });
}));

// PATCH /api/conversations/:id — Update conversation (title, model)
router.patch('/:id', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const { title, model } = req.body;
  const supabase = getSupabaseAdmin();

  const updates: Record<string, any> = {};
  if (title !== undefined) updates.title = title;
  if (model !== undefined) updates.model = model;

  const { data, error } = await supabase
    .from('conversations')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select('id, title, model, updated_at')
    .single();

  if (error || !data) {
    throw new AppError(404, 'Conversation not found.');
  }

  res.json({ success: true, conversation: data });
}));

// DELETE /api/conversations/:id — Delete conversation
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    throw new AppError(500, 'Failed to delete conversation.');
  }

  res.json({ success: true });
}));

// GET /api/conversations/:id/messages — Get messages for a conversation
router.get('/:id/messages', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const supabase = getSupabaseAdmin();

  // Verify ownership
  const { data: convo } = await supabase
    .from('conversations')
    .select('id')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (!convo) {
    throw new AppError(404, 'Conversation not found.');
  }

  const { data, error } = await supabase
    .from('messages')
    .select('id, role, content, model, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })
    .limit(500);

  if (error) {
    throw new AppError(500, 'Failed to load messages.');
  }

  res.json({ success: true, messages: data });
}));

export default router;
