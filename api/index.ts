import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// ============ SINGLETON CLIENT ============
let _supabase: any = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return _supabase;
}

// ============ HELPERS ============
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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res.status(status).json(data);
}

function ok(res: any, data: any) { return json(res, 200, { success: true, ...data }); }
function err(res: any, status: number, message: string) { return json(res, status, { success: false, message }); }

async function requireAuth(req: any, res: any): Promise<any | null> {
  const token = getAuthToken(req);
  if (!token) { err(res, 401, 'Authentication required.'); return null; }
  const user = await verifyToken(token);
  if (!user) { err(res, 401, 'Invalid or expired token.'); return null; }
  return user;
}

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
const MIMO_MODEL = 'mimo-v2-5';

const SYSTEM_PROMPT = `You are Xparrow AI. Never start with greetings. Respond directly. Match user's language. Be concise. Never reveal model names.`;

const THINKING_PROMPT = `You are Xparrow AI's deep analysis engine. Respond ONLY with a JSON object in a \`\`\`json code block.
{
  "depth": "light",
  "steps": [{"label": "Understanding", "status": "completed", "detail": "..."}, {"label": "Analyzing", "status": "completed", "detail": "..."}, {"label": "Concluding", "status": "completed", "detail": "..."}],
  "answer": "Clear final answer in markdown.",
  "alternatives": [{"name": "Option A", "pros": ["pro1"], "cons": ["con1"], "recommended": true}],
  "thinkingSummary": {"factors": [], "assumptions": [], "tradeOff": "", "decision": ""},
  "analysis": {"known": "", "assumption": "", "recommendation": "", "limitation": ""},
  "createPlanOffer": false
}`;

const PLAN_PROMPT = `You are Xparrow AI's project planner. Respond ONLY with a JSON object in a \`\`\`json code block.
{
  "goal": "User's goal",
  "complexity": "moderate",
  "phases": [{"id": 1, "name": "Phase", "description": "...", "tasks": [{"id": 1, "title": "Task", "description": "...", "estimatedDuration": "15 min", "priority": "high", "dependencies": [], "status": "pending"}]}],
  "missingInfo": [],
  "totalEstimatedTime": "2 hours"
}`;

function getSystemPrompt(mode?: string): string {
  if (mode === 'thinking') return THINKING_PROMPT;
  if (mode === 'plan') return PLAN_PROMPT;
  return SYSTEM_PROMPT;
}

function getGeminiKeys(): string[] {
  const keys: string[] = [];
  if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY);
  if (process.env.GEMINI_API_KEY_FALLBACK) keys.push(process.env.GEMINI_API_KEY_FALLBACK);
  return keys;
}

async function callGemini(message: string, history: any[], systemPrompt: string): Promise<string> {
  const keys = getGeminiKeys();
  if (!keys.length) throw new Error('No Gemini keys configured');
  let lastError: any = null;
  for (const apiKey of keys) {
    try {
      const contents = [
        { parts: [{ text: systemPrompt }], role: 'user' },
        { parts: [{ text: 'Understood.' }], role: 'model' },
        ...history.slice(-30).map(m => ({ parts: [{ text: m.content }], role: m.role === 'assistant' ? 'model' : 'user' })),
        { parts: [{ text: message }], role: 'user' },
      ];
      const res = await fetch(`${GEMINI_ENDPOINT}/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents, generationConfig: { temperature: 0.7, maxOutputTokens: 2048, topP: 0.8 } }),
        signal: AbortSignal.timeout(30000),
      });
      const data = await res.json() as any;
      if (!res.ok) { const e: any = new Error(data.error?.message || `Gemini error: ${res.status}`); e.statusCode = res.status; throw e; }
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) return data.candidates[0].content.parts[0].text.trim();
      throw new Error('Invalid Gemini response');
    } catch (e: any) {
      lastError = e;
      if (e.statusCode !== 429 && !String(e.message).includes('rate')) throw e;
    }
  }
  throw lastError || new Error('All Gemini keys failed');
}

async function callMimo(message: string, history: any[], systemPrompt: string): Promise<string> {
  const apiKey = process.env.MIMO_API_KEY;
  if (!apiKey) throw new Error('MIMO API key not configured');
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-30).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
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
  if (data.choices?.[0]?.message?.content) return data.choices[0].message.content.trim();
  throw new Error('Invalid MIMO response');
}

// ============ ROUTE HANDLER ============
export default async function handler(req: any, res: any) {
  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.url || '/';
  const method = req.method || 'GET';

  try {
    // ===== CHAT HEALTH =====
    if (url === '/api/chat/health' && method === 'GET') {
      return ok(res, { status: 'ok', providers: { primary: getGeminiKeys().length > 0, secondary: !!process.env.MIMO_API_KEY } });
    }

    // ===== CHAT =====
    if (url === '/api/chat' && method === 'POST') {
      const user = await requireAuth(req, res); if (!user) return;
      const { message, history = [], model = 'gemini', conversationId, mode } = req.body || {};
      if (!message?.trim()) return err(res, 400, 'Message is required.');
      if (message.length > 10000) return err(res, 400, 'Message too long.');
      if (!['gemini', 'mimo'].includes(model)) return err(res, 400, 'Invalid model.');

      const supabase = getSupabase();
      const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single();
      const limits = getPlanLimits(profile?.plan || 'free');
      if (!limits.allowedModels.includes(model)) return err(res, 403, `Plan does not support ${model}.`);

      const today = new Date().toISOString().split('T')[0];
      const { data: rpcResult } = await supabase.rpc('increment_usage', { p_user_id: user.id, p_date: today, p_max_requests: limits.maxRequestsPerDay });
      if (rpcResult === -1) return err(res, 429, 'Daily limit reached.');

      const safeHistory = Array.isArray(history) ? history.slice(-30) : [];
      const systemPrompt = getSystemPrompt(mode);

      let aiResponse: string;
      let usedModel = model;
      try {
        aiResponse = model === 'gemini'
          ? await callGemini(message.trim(), safeHistory, systemPrompt)
          : await callMimo(message.trim(), safeHistory, systemPrompt);
      } catch {
        const fallback = model === 'gemini' ? 'mimo' : 'gemini';
        try {
          aiResponse = fallback === 'gemini'
            ? await callGemini(message.trim(), safeHistory, systemPrompt)
            : await callMimo(message.trim(), safeHistory, systemPrompt);
          usedModel = fallback;
        } catch (e: any) { return err(res, 502, e.message || 'All AI providers unavailable.'); }
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
      const user = await requireAuth(req, res); if (!user) return;
      const { data } = await getSupabase().from('conversations').select('id, title, model, created_at, updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(50);
      return ok(res, { conversations: data });
    }
    if (url === '/api/conversations' && method === 'POST') {
      const user = await requireAuth(req, res); if (!user) return;
      const { title, model } = req.body || {};
      const { data } = await getSupabase().from('conversations').insert({ user_id: user.id, title: title || 'New Chat', model: model || 'gemini' }).select('id, title, model, created_at').single();
      return ok(res, { conversation: data });
    }

    // /api/conversations/:id
    const convoMatch = url.match(/^\/api\/conversations\/([^/]+)$/);
    if (convoMatch) {
      const user = await requireAuth(req, res); if (!user) return;
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
        await getSupabase().from('messages').delete().eq('conversation_id', id);
        await getSupabase().from('conversations').delete().eq('id', id).eq('user_id', user.id);
        return ok(res, {});
      }
    }

    // /api/conversations/:id/messages
    const msgsMatch = url.match(/^\/api\/conversations\/([^/]+)\/messages$/);
    if (msgsMatch && method === 'GET') {
      const user = await requireAuth(req, res); if (!user) return;
      const id = msgsMatch[1];
      const { data: convo } = await getSupabase().from('conversations').select('id').eq('id', id).eq('user_id', user.id).single();
      if (!convo) return err(res, 404, 'Conversation not found.');
      const { data } = await getSupabase().from('messages').select('id, role, content, model, created_at').eq('conversation_id', id).order('created_at', { ascending: true }).limit(500);
      return ok(res, { messages: data });
    }

    // ===== MEMORIES =====
    if (url === '/api/memories' && method === 'GET') {
      const user = await requireAuth(req, res); if (!user) return;
      const { data } = await getSupabase().from('memories').select('id, memory_type, content, importance, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(200);
      return ok(res, { memories: data });
    }
    if (url === '/api/memories' && method === 'POST') {
      const user = await requireAuth(req, res); if (!user) return;
      const { memory_type, content, importance } = req.body || {};
      if (!memory_type || !content) return err(res, 400, 'memory_type and content required.');
      const { data } = await getSupabase().from('memories').insert({ user_id: user.id, memory_type, content, importance: importance || 1 }).select('id, memory_type, content, importance, created_at').single();
      return ok(res, { memory: data });
    }
    if (url === '/api/memories' && method === 'DELETE') {
      const user = await requireAuth(req, res); if (!user) return;
      await getSupabase().from('memories').delete().eq('user_id', user.id);
      return ok(res, {});
    }
    const memMatch = url.match(/^\/api\/memories\/([^/]+)$/);
    if (memMatch && method === 'DELETE') {
      const user = await requireAuth(req, res); if (!user) return;
      await getSupabase().from('memories').delete().eq('id', memMatch[1]).eq('user_id', user.id);
      return ok(res, {});
    }

    // ===== PROMPT CACHE =====
    if (url === '/api/prompt-cache' && method === 'GET') {
      const user = await requireAuth(req, res); if (!user) return;
      const { cache_key } = req.query;
      if (!cache_key) return err(res, 400, 'cache_key required.');
      const { data } = await getSupabase().from('prompt_cache').select('id, response, model').eq('user_id', user.id).eq('cache_key', cache_key as string).gt('expires_at', new Date().toISOString()).single();
      if (!data) return ok(res, { cached: false });
      return ok(res, { cached: true, response: data.response, model: data.model });
    }
    if (url === '/api/prompt-cache' && method === 'POST') {
      const user = await requireAuth(req, res); if (!user) return;
      const { cache_key, model, response: cachedResponse, ttl_hours } = req.body || {};
      if (!cache_key || !cachedResponse) return err(res, 400, 'cache_key and response required.');
      const expiresAt = new Date(Date.now() + (ttl_hours || 24) * 3600000).toISOString();
      const hash = crypto.createHash('md5').update(cache_key).digest('hex');
      await getSupabase().from('prompt_cache').upsert(
        { user_id: user.id, cache_key, prompt_hash: hash, model: model || 'gemini', response: cachedResponse, expires_at: expiresAt },
        { onConflict: 'user_id,cache_key,model' }
      );
      return ok(res, {});
    }
    if (url === '/api/prompt-cache' && method === 'DELETE') {
      const user = await requireAuth(req, res); if (!user) return;
      await getSupabase().from('prompt_cache').delete().eq('user_id', user.id);
      return ok(res, {});
    }

    // ===== SUBSCRIPTION =====
    if (url === '/api/subscription/status' && method === 'GET') {
      const user = await requireAuth(req, res); if (!user) return;
      const { data: sub } = await getSupabase().from('subscriptions').select('paddle_subscription_id, status, current_period_end').eq('user_id', user.id).single();
      if (!sub) return ok(res, { active: false, plan: 'free' });
      const isActive = sub.status === 'active' && (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
      return ok(res, { active: isActive, plan: isActive ? 'pro' : 'free', subscriptionId: sub.paddle_subscription_id, expiresAt: sub.current_period_end });
    }
    if (url === '/api/subscription/config' && method === 'GET') {
      return ok(res, { clientToken: process.env.PADDLE_CLIENT_TOKEN || '', environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox' });
    }
    if (url === '/api/subscription/webhook' && method === 'POST') {
      const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const sig = req.headers['paddle-signature'] || '';
      const secret = process.env.PADDLE_WEBHOOK_SECRET;
      if (secret && sig) {
        let ts = '', h1 = '';
        for (const part of sig.split(';')) { const [k, v] = part.split('='); if (k === 'ts') ts = v; if (k === 'h1') h1 = v; }
        if (ts && h1) {
          const expected = crypto.createHmac('sha256', secret).update(`${ts}:${rawBody}`).digest('hex');
          if (!crypto.timingSafeEqual(Buffer.from(h1), Buffer.from(expected))) return err(res, 401, 'Invalid signature.');
        }
      }
      const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const eventType = event.event_type || event.alert_name || '';
      const eventId = event.event_id || event.alert_id || `${eventType}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
      const supabase = getSupabase();
      const { data: existing } = await supabase.from('webhook_events').select('id').eq('event_id', eventId).single();
      if (existing) return ok(res, { message: 'Already processed.' });

      const data = event.data || event;
      const email = data?.customer?.email || data?.email;
      if (email) {
        const { data: profile } = await supabase.from('profiles').select('id').eq('email', email).single();
        if (profile) {
          const isPro = !['subscription.canceled', 'subscription.deleted'].includes(eventType);
          await supabase.from('profiles').update({ plan: isPro ? 'pro' : 'free' }).eq('id', profile.id);
          const subData: any = { user_id: profile.id, paddle_customer_id: data?.customer?.id || '', paddle_subscription_id: data?.id || data?.subscription_id || '', status: isPro ? 'active' : 'canceled', plan: isPro ? 'pro' : 'free' };
          if (data?.current_period_end) subData.current_period_end = new Date(data.current_period_end * 1000).toISOString();
          await supabase.from('subscriptions').upsert(subData, { onConflict: 'user_id' });
        }
      }
      await supabase.from('webhook_events').insert({ event_id: eventId, event_type: eventType, processed: true, payload: event });
      return ok(res, {});
    }

    return err(res, 404, 'Not found.');
  } catch (error: any) {
    console.error('API Error:', error?.message || error);
    return err(res, error?.statusCode || 500, 'Something went wrong.');
  }
}
