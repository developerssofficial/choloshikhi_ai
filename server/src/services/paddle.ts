import crypto from 'crypto';
import { env } from '../config/env.js';
import { getSupabaseAdmin } from '../config/supabase.js';
import { logger } from '../lib/logger.js';

// ========== Types ==========

export interface SubscriptionStatus {
  active: boolean;
  plan: 'free' | 'pro';
  subscriptionId?: string;
  expiresAt?: string;
}

// ========== Paddle Webhook Signature Verification ==========

export function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string
): boolean {
  let ts = '';
  let h1 = '';

  for (const part of signatureHeader.split(';')) {
    const [key, value] = part.split('=');
    if (key === 'ts') ts = value;
    if (key === 'h1') h1 = value;
  }

  if (!ts || !h1) return false;

  const age = Math.floor(Date.now() / 1000) - Number(ts);
  if (age > 300) return false;

  const signedPayload = `${ts}:${rawBody}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  const a = Buffer.from(h1);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ========== Find User by Paddle Customer Email ==========

async function findUserByEmail(email: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();
  return data?.id || null;
}

// ========== Webhook Event Handlers (Supabase-backed) ==========

export async function handleSubscriptionCreated(data: Record<string, any>): Promise<void> {
  const supabase = getSupabaseAdmin();
  const subscriptionId = data.id || data.subscription_id;
  const email = data.customer?.email || data.email;
  const currentPeriodEnd = data.current_period_end;
  const paddleCustomerId = data.customer?.id || data.customer_id;

  if (!email) {
    logger.warn(undefined, 'Subscription created webhook missing email', { subscriptionId });
    return;
  }

  const userId = await findUserByEmail(email);
  if (!userId) {
    logger.warn(undefined, 'No user found for subscription email', { email, subscriptionId });
    return;
  }

  // Upsert subscription
  await supabase.from('subscriptions').upsert({
    user_id: userId,
    paddle_customer_id: paddleCustomerId || '',
    paddle_subscription_id: subscriptionId || '',
    status: 'active',
    plan: 'pro',
    current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null,
  }, { onConflict: 'user_id' });

  // Update profile plan
  await supabase.from('profiles').update({ plan: 'pro' }).eq('id', userId);

  logger.info(undefined, 'Subscription activated', { userId, subscriptionId });
}

export async function handleSubscriptionUpdated(data: Record<string, any>): Promise<void> {
  const supabase = getSupabaseAdmin();
  const subscriptionId = data.id || data.subscription_id;
  const email = data.customer?.email || data.email;

  if (!email) return;

  const userId = await findUserByEmail(email);
  if (!userId) return;

  const status = data.status === 'canceled' ? 'canceled' : 'active';
  const plan = status === 'active' ? 'pro' : 'free';

  const updateData: Record<string, any> = {
    status,
    plan,
  };
  if (data.current_period_end) {
    updateData.current_period_end = new Date(data.current_period_end * 1000).toISOString();
  }

  // Upsert to ensure the row exists even if the created webhook was missed
  await supabase.from('subscriptions').upsert({
    user_id: userId,
    paddle_customer_id: '',
    paddle_subscription_id: subscriptionId || '',
    ...updateData,
  }, { onConflict: 'user_id' });

  await supabase.from('profiles').update({ plan }).eq('id', userId);

  logger.info(undefined, 'Subscription updated', { userId, status });
}

export async function handleSubscriptionCanceled(data: Record<string, any>): Promise<void> {
  const supabase = getSupabaseAdmin();
  const email = data.customer?.email || data.email;

  if (!email) return;

  const userId = await findUserByEmail(email);
  if (!userId) return;

  // Upsert to ensure the row exists even if the created webhook was missed
  await supabase.from('subscriptions').upsert({
    user_id: userId,
    paddle_customer_id: '',
    paddle_subscription_id: '',
    status: 'canceled',
    plan: 'free',
  }, { onConflict: 'user_id' });

  await supabase.from('profiles').update({ plan: 'free' }).eq('id', userId);

  logger.info(undefined, 'Subscription canceled', { userId });
}

// ========== Subscription Check (by user_id) ==========

export async function getSubscriptionStatusByUserId(userId: string): Promise<SubscriptionStatus> {
  const supabase = getSupabaseAdmin();
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('paddle_subscription_id, status, current_period_end')
    .eq('user_id', userId)
    .single();

  if (!sub) {
    return { active: false, plan: 'free' };
  }

  const now = new Date();
  const isActive = sub.status === 'active' && (!sub.current_period_end || new Date(sub.current_period_end) > now);

  return {
    active: isActive,
    plan: isActive ? 'pro' : 'free',
    subscriptionId: sub.paddle_subscription_id,
    expiresAt: sub.current_period_end,
  };
}

// ========== Paddle Client Token (safe to expose) ==========

export function getPaddleClientToken(): string {
  return env.PADDLE_CLIENT_TOKEN;
}

export function getPaddleEnvironment(): string {
  return env.NODE_ENV === 'production' ? 'production' : 'sandbox';
}
