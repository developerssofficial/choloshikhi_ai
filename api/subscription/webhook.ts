import crypto from 'crypto';
import { generateRequestId, jsonError, setCorsHeaders } from '../_lib/helpers';
import { getSupabase } from '../_lib/supabase';

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return jsonError(res, 405, 'Method not allowed.');

  const requestId = generateRequestId();

  try {
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const signatureHeader = req.headers['paddle-signature'] || '';

    const secret = process.env.PADDLE_WEBHOOK_SECRET;
    if ((process.env.NODE_ENV === 'production' || secret) && secret) {
      if (!verifyPaddleSignature(rawBody, signatureHeader, secret)) {
        return jsonError(res, 401, 'Invalid signature.');
      }
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event_type || event.alert_name;
    const eventId = event.event_id || event.alert_id || `${eventType}-${Date.now()}`;

    const supabase = getSupabase();
    const { data: existing } = await supabase.from('webhook_events').select('id').eq('event_id', eventId).single();
    if (existing) return res.json({ success: true, message: 'Already processed.' });

    const data = event.data || event;
    const email = data?.customer?.email || data?.email;

    if (email && ['subscription.created', 'transaction.completed', 'subscription.updated', 'subscription.canceled', 'subscription.deleted'].includes(eventType)) {
      const { data: profile } = await supabase.from('profiles').select('id').eq('email', email).single();
      if (profile) {
        const isPro = eventType !== 'subscription.canceled' && eventType !== 'subscription.deleted';
        await supabase.from('profiles').update({ plan: isPro ? 'pro' : 'free' }).eq('id', profile.id);
        await supabase.from('subscriptions').upsert({
          user_id: profile.id,
          paddle_customer_id: data?.customer?.id || '',
          paddle_subscription_id: data?.id || data?.subscription_id || '',
          status: isPro ? 'active' : 'canceled',
          plan: isPro ? 'pro' : 'free',
        }, { onConflict: 'user_id' });
      }
    }

    await supabase.from('webhook_events').insert({ event_id: eventId, event_type: eventType, processed: true, payload: event });
    return res.json({ success: true });
  } catch (error: any) {
    console.error(`[${requestId}] Webhook error:`, error);
    return jsonError(res, 500, error.message || 'Webhook processing failed.', requestId);
  }
}

function verifyPaddleSignature(rawBody: string, signatureHeader: string, secret: string): boolean {
  let ts = '', h1 = '';
  for (const part of signatureHeader.split(';')) {
    const [key, value] = part.split('=');
    if (key === 'ts') ts = value;
    if (key === 'h1') h1 = value;
  }
  if (!ts || !h1) return false;
  const age = Math.floor(Date.now() / 1000) - Number(ts);
  if (age > 300) return false;
  const signedPayload = `${ts}:${rawBody}`;
  const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  const a = Buffer.from(h1), b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
