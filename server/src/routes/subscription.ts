import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  verifyPaddleSignature,
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionCanceled,
  getSubscriptionStatusByUserId,
  getPaddleClientToken,
  getPaddleEnvironment,
} from '../services/paddle.js';
import { getSupabaseAdmin } from '../config/supabase.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';

const router = Router();

// GET /api/subscription/status — Auth-based subscription check
router.get('/status', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  try {
    const status = await getSubscriptionStatusByUserId(userId);
    res.json({ success: true, ...status });
  } catch (error: any) {
    logger.error(req.requestId, 'Subscription status error', { userId, error: error.message });
    throw new AppError(500, 'Failed to check subscription status.');
  }
}));

// GET /api/subscription/config — Get Paddle config for frontend (no auth needed)
router.get('/config', (_req: Request, res: Response) => {
  res.json({
    success: true,
    clientToken: getPaddleClientToken(),
    environment: getPaddleEnvironment(),
  });
});

// POST /api/subscription/webhook — Paddle webhook handler (idempotent)
router.post('/webhook', asyncHandler(async (req: Request, res: Response) => {
  const signatureHeader = req.headers['paddle-signature'] as string;
  const rawBody = req.body.toString();

  // Verify signature in production (NEVER skip in prod)
  if (env.NODE_ENV === 'production' || env.PADDLE_WEBHOOK_SECRET) {
    if (!env.PADDLE_WEBHOOK_SECRET) {
      logger.error(req.requestId, 'Paddle webhook secret not configured');
      throw new AppError(500, 'Webhook configuration error.');
    }
    const isValid = verifyPaddleSignature(rawBody, signatureHeader, env.PADDLE_WEBHOOK_SECRET);
    if (!isValid) {
      logger.warn(req.requestId, 'Invalid Paddle webhook signature');
      throw new AppError(401, 'Invalid signature.');
    }
  } else {
    logger.warn(req.requestId, 'Paddle signature verification skipped (development mode)');
  }

  const event = JSON.parse(rawBody);
  const eventType = event.event_type || event.alert_name;
  const eventId = event.event_id || event.alert_id || `${eventType}-${Date.now()}`;

  // Idempotency: check if already processed
  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase
    .from('webhook_events')
    .select('id')
    .eq('event_id', eventId)
    .single();

  if (existing) {
    logger.info(req.requestId, 'Webhook already processed, skipping', { eventId });
    res.json({ success: true, message: 'Already processed.' });
    return;
  }

  // Process event
  switch (eventType) {
    case 'subscription.created':
    case 'transaction.completed':
      await handleSubscriptionCreated(event.data || event);
      break;
    case 'subscription.updated':
      await handleSubscriptionUpdated(event.data || event);
      break;
    case 'subscription.canceled':
    case 'subscription.deleted':
      await handleSubscriptionCanceled(event.data || event);
      break;
    default:
      break;
  }

  // Mark event as processed
  await supabase.from('webhook_events').insert({
    event_id: eventId,
    event_type: eventType,
    processed: true,
    payload: event,
  });

  logger.info(req.requestId, 'Webhook processed', { eventId, eventType });
  res.json({ success: true });
}));

export default router;
