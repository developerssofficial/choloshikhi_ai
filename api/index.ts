import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// ============ HELPERS ============
function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function verifyToken(token: string): Promise<{ id: string; email: string } | null> {
  try {
    const { data: { user }, error } = await getSupabase().auth.getUser(token);
    if (error || !user) return null;
    return { id: user.id, email: user.email || '' };
  } catch { return null; }
}

function getAuthToken(req: any): string | null {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.substring(7);
}

function json(res: any, status: number, data: any) {
  return res.status(status).json(data);
}

function ok(res: any, data: any) { return json(res, 200, { success: true, ...data }); }
function err(res: any, status: number, message: string) { return json(res, status, { success: false, message }); }

function getPlanLimits(plan: string) {
  const limits: Record<string, { maxRequestsPerDay: number; allowedModels: string[] }> = {
    free: { maxRequestsPerDay: 100, allowedModels: ['gemini'] },
    pro: { maxRequestsPerDay: 1000, allowedModels: ['gemini', 'mimo'] },
  };
  return limits[plan] || limits.free;
}

// ============ AI PROVIDERS ============
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODEL = 'gemini-3.1-flash-lite';
const MIMO_ENDPOINT = 'https://api.xiaomimimo.com/v1/chat/completions';
const MIMO_MODEL = 'mimo-v2.5';

const SYSTEM_PROMPT = `You are Xparrow AI. Never start with greetings. Respond directly to the user's question. Match their language (Bangla, Banglish, English, Hindi, Urdu). Be concise. Never reveal you are Gemini, MIMO, or any other model.`;

function stripMarkdown(text: string): string {
  return text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/`(.*?)`/g, '$1').trim();
}

function getGeminiKeys(): string[] {
  const keys: string[] = [];
  if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY);
  if (process.env.GEMINI_API_KEY_FALLBACK) keys.push(process.env.GEMINI_API_KEY_FALLBACK);
  return keys;
}

async function callGemini(message: string, history: any[]): Promise<string> {
  const keys = getGeminiKeys();
  if (!keys.length) throw new Error('No Gemini keys');
  for (const apiKey of keys) {
    try {
      const contents = [
        { parts: [{ text: SYSTEM_PROMPT }], role: 'user' },
        { parts: [{ text: 'Understood.' }], role: 'model' },
        ...history.map(m => ({ parts: [{ text: m.content }], role: m.role === 'assistant' ? 'model' : 'user' })),
        { parts: [{ text: message }], role: 'user' },
      ];
      const res = await fetch(`${GEMINI_ENDPOINT}/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents, generationConfig: { temperature: 0.7, maxOutputTokens: 2048 } }),
        signal: AbortSignal.timeout(30000),
      });
      const data = await res.json() as any;
      if (!res.ok) throw new Error(data.error?.message || `Gemini error: ${res.status}`);
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) return stripMarkdown(data.candidates[0].content.parts[0].text);
      throw new Error('Invalid Gemini response');
    } catch (e: any) {
      if (!e.message?.includes('rate') && !e.message?.includes('429')) throw e;
    }
  }
  throw new Error('All Gemini keys failed');
}

async function callMimo(message: string, history: any[]): Promise<string> {
  const apiKey = process.env.MIMO_API_KEY;
  if (!apiKey) throw new Error('MIMO key not configured');
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
    { role: 'user', content: message },
  ];
  const res = await fetch(MIMO_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: MIMO_MODEL, messages, temperature: 0.7, max_tokens: 2048 }),
    signal: AbortSignal.timeout(30000),
  });
  const data = await res.json() as any;
  if (!res.ok) throw new Error(data.error?.message || `MIMO error: ${res.status}`);
  if (data.choices?.[0]?.message?.content) return stripMarkdown(data.choices[0].message.content);
  throw new Error('Invalid MIMO response');
}

// ============ MAIN HANDLER ============
export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.url || '/';
  const method = req.method || 'GET';

  try {
    // ===== CHAT =====
    if (url === '/api/chat/health' && method === 'GET') {
      const keys = getGeminiKeys();
      return ok(res, { status: 'ok', providers: { primary: keys.length > 0, secondary: !!process.env.MIMO_API_KEY } });
    }

    if (url === '/api/chat' && method === 'POST') {
      const token = getAuthToken(req);
      if (!token) return err(res, 401, 'Auth required.');
      const user = await verifyToken(token);
      if (!user) return err(res, 401, 'Invalid token.');

      const { message, history = [], model = 'gemini', conversationId } = req.body || {};
      if (!message?.trim()) return err(res, 400, 'Message required.');

      const supabase = getSupabase();
      const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single();
      const limits = getPlanLimits(profile?.plan || 'free');

      if (!limits.allowedModels.includes(model)) return err(res, 403, `Plan does not support ${model}.`);

      const today = new Date().toISOString().split('T')[0];
      const { data: rpcResult } = await supabase.rpc('increment_usage', { p_user_id: user.id, p_date: today, p_max_requests: limits.maxRequestsPerDay });
      if (rpcResult === -1) return err(res, 429, 'Daily limit reached.');

      let aiResponse: string;
      let usedModel = model;
      try {
        aiResponse = model === 'gemini' ? await callGemini(message.trim(), history) : await callMimo(message.trim(), history);
      } catch {
        const fallback = model === 'gemini' ? 'mimo' : 'gemini';
        aiResponse = fallback === 'gemini' ? await callGemini(message.trim(), history) : await callMimo(message.trim(), history);
        usedModel = fallback;
      }

      if (conversationId) {
        const { data: convo } = await supabase.from('conversations').select('id').eq('id', conversationId).eq('user_id', user.id).single();
        if (convo) {
          await supabase.from('messages').insert([
            { conversation_id: conversationId, user_id: user.id, role: 'user', content: message.trim() },
            { conversation_id: conversationId, user_id: user.id, role: 'assistant', content: aiResponse, model: usedModel },
          ]);
        }
      }

      return ok(res, { message: aiResponse, model: usedModel, cached: false });
    }

    // ===== CONVERSATIONS =====
    if (url === '/api/conversations' && method === 'GET') {
      const token = getAuthToken(req);
      if (!token) return err(res, 401, 'Auth required.');
      const user = await verifyToken(token);
      if (!user) return err(res, 401, 'Invalid token.');
      const { data } = await getSupabase().from('conversations').select('id, title, model, created_at, updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(50);
      return ok(res, { conversations: data });
    }

    if (url === '/api/conversations' && method === 'POST') {
      const token = getAuthToken(req);
      if (!token) return err(res, 401, 'Auth required.');
      const user = await verifyToken(token);
      if (!user) return err(res, 401, 'Invalid token.');
      const { title, model } = req.body || {};
      const { data } = await getSupabase().from('conversations').insert({ user_id: user.id, title: title || 'New Chat', model: model || 'gemini' }).select('id, title, model, created_at').single();
      return ok(res, { conversation: data });
    }

    // /api/conversations/:id
    const convoMatch = url.match(/^\/api\/conversations\/([^/]+)$/);
    if (convoMatch) {
      const token = getAuthToken(req);
      if (!token) return err(res, 401, 'Auth required.');
      const user = await verifyToken(token);
      if (!user) return err(res, 401, 'Invalid token.');
      const id = convoMatch[1];

      if (method === 'PATCH') {
        const { title, model } = req.body || {};
        const updates: any = {};
        if (title !== undefined) updates.title = title;
        if (model !== undefined) updates.model = model;
        const { data } = await getSupabase().from('conversations').update(updates).eq('id', id).eq('user_id', user.id).select('id, title, model, updated_at').single();
        return ok(res, { conversation: data });
      }
      if (method === 'DELETE') {
        await getSupabase().from('conversations').delete().eq('id', id).eq('user_id', user.id);
        return ok(res, {});
      }
    }

    // /api/conversations/:id/messages
    const msgsMatch = url.match(/^\/api\/conversations\/([^/]+)\/messages$/);
    if (msgsMatch && method === 'GET') {
      const token = getAuthToken(req);
      if (!token) return err(res, 401, 'Auth required.');
      const user = await verifyToken(token);
      if (!user) return err(res, 401, 'Invalid token.');
      const id = msgsMatch[1];
      const { data } = await getSupabase().from('messages').select('id, role, content, model, created_at').eq('conversation_id', id).order('created_at', { ascending: true }).limit(500);
      return ok(res, { messages: data });
    }

    // ===== MEMORIES =====
    if (url === '/api/memories' && method === 'GET') {
      const token = getAuthToken(req);
      if (!token) return err(res, 401, 'Auth required.');
      const user = await verifyToken(token);
      if (!user) return err(res, 401, 'Invalid token.');
      const { data } = await getSupabase().from('memories').select('id, memory_type, content, importance, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(200);
      return ok(res, { memories: data });
    }

    if (url === '/api/memories' && method === 'POST') {
      const token = getAuthToken(req);
      if (!token) return err(res, 401, 'Auth required.');
      const user = await verifyToken(token);
      if (!user) return err(res, 401, 'Invalid token.');
      const { memory_type, content, importance } = req.body || {};
      const { data } = await getSupabase().from('memories').insert({ user_id: user.id, memory_type, content, importance: importance || 1 }).select('id, memory_type, content, importance, created_at').single();
      return ok(res, { memory: data });
    }

    if (url === '/api/memories' && method === 'DELETE') {
      const token = getAuthToken(req);
      if (!token) return err(res, 401, 'Auth required.');
      const user = await verifyToken(token);
      if (!user) return err(res, 401, 'Invalid token.');
      await getSupabase().from('memories').delete().eq('user_id', user.id);
      return ok(res, {});
    }

    // /api/memories/:id
    const memMatch = url.match(/^\/api\/memories\/([^/]+)$/);
    if (memMatch && method === 'DELETE') {
      const token = getAuthToken(req);
      if (!token) return err(res, 401, 'Auth required.');
      const user = await verifyToken(token);
      if (!user) return err(res, 401, 'Invalid token.');
      await getSupabase().from('memories').delete().eq('id', memMatch[1]).eq('user_id', user.id);
      return ok(res, {});
    }

    // ===== PROMPT CACHE =====
    if (url === '/api/prompt-cache' && method === 'GET') {
      const token = getAuthToken(req);
      if (!token) return err(res, 401, 'Auth required.');
      const user = await verifyToken(token);
      if (!user) return err(res, 401, 'Invalid token.');
      const { cache_key } = req.query;
      if (!cache_key) return err(res, 400, 'cache_key required.');
      const { data } = await getSupabase().from('prompt_cache').select('id, response, model, expires_at').eq('user_id', user.id).eq('cache_key', cache_key as string).gt('expires_at', new Date().toISOString()).single();
      if (!data) return ok(res, { cached: false });
      return ok(res, { cached: true, response: data.response, model: data.model });
    }

    if (url === '/api/prompt-cache' && method === 'POST') {
      const token = getAuthToken(req);
      if (!token) return err(res, 401, 'Auth required.');
      const user = await verifyToken(token);
      if (!user) return err(res, 401, 'Invalid token.');
      const { cache_key, model, response: cachedResponse, ttl_hours } = req.body || {};
      const expiresAt = new Date(Date.now() + (ttl_hours || 24) * 3600000).toISOString();
      await getSupabase().from('prompt_cache').upsert({ user_id: user.id, cache_key, model: model || 'gemini', response: cachedResponse, expires_at: expiresAt }, { onConflict: 'user_id,cache_key' });
      return ok(res, {});
    }

    if (url === '/api/prompt-cache' && method === 'DELETE') {
      const token = getAuthToken(req);
      if (!token) return err(res, 401, 'Auth required.');
      const user = await verifyToken(token);
      if (!user) return err(res, 401, 'Invalid token.');
      await getSupabase().from('prompt_cache').delete().eq('user_id', user.id);
      return ok(res, {});
    }

    // ===== SUBSCRIPTION =====
    if (url === '/api/subscription/status' && method === 'GET') {
      const token = getAuthToken(req);
      if (!token) return err(res, 401, 'Auth required.');
      const user = await verifyToken(token);
      if (!user) return err(res, 401, 'Invalid token.');
      const { data: sub } = await getSupabase().from('subscriptions').select('paddle_subscription_id, status, current_period_end').eq('user_id', user.id).single();
      if (!sub) return ok(res, { active: false, plan: 'free' });
      const isActive = sub.status === 'active' && (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
      return ok(res, { active: isActive, plan: isActive ? 'pro' : 'free' });
    }

    if (url === '/api/subscription/config' && method === 'GET') {
      return ok(res, { clientToken: process.env.PADDLE_CLIENT_TOKEN || '', environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox' });
    }

    if (url === '/api/subscription/webhook' && method === 'POST') {
      const rawBody = JSON.stringify(req.body);
      const secret = process.env.PADDLE_WEBHOOK_SECRET;
      if (secret) {
        const sig = req.headers['paddle-signature'] || '';
        let ts = '', h1 = '';
        for (const part of sig.split(';')) { const [k, v] = part.split('='); if (k === 'ts') ts = v; if (k === 'h1') h1 = v; }
        if (!ts || !h1) return err(res, 401, 'Invalid sig.');
        const expected = crypto.createHmac('sha256', secret).update(`${ts}:${rawBody}`).digest('hex');
        if (!crypto.timingSafeEqual(Buffer.from(h1), Buffer.from(expected))) return err(res, 401, 'Invalid sig.');
      }
      const event = req.body;
      const eventType = event.event_type || event.alert_name;
      const eventId = event.event_id || `${eventType}-${Date.now()}`;
      const supabase = getSupabase();
      const { data: existing } = await supabase.from('webhook_events').select('id').eq('event_id', eventId).single();
      if (existing) return ok(res, { message: 'Already processed.' });
      const email = event.data?.customer?.email;
      if (email) {
        const { data: profile } = await supabase.from('profiles').select('id').eq('email', email).single();
        if (profile) {
          const isPro = !['subscription.canceled', 'subscription.deleted'].includes(eventType);
          await supabase.from('profiles').update({ plan: isPro ? 'pro' : 'free' }).eq('id', profile.id);
          await supabase.from('subscriptions').upsert({ user_id: profile.id, paddle_customer_id: event.data?.customer?.id || '', paddle_subscription_id: event.data?.id || '', status: isPro ? 'active' : 'canceled', plan: isPro ? 'pro' : 'free' }, { onConflict: 'user_id' });
        }
      }
      await supabase.from('webhook_events').insert({ event_id: eventId, event_type: eventType, processed: true, payload: event });
      return ok(res, {});
    }

    return err(res, 404, 'Not found.');
  } catch (error: any) {
    console.error('API Error:', error);
    return err(res, 500, error.message || 'Something went wrong.');
  }
}
