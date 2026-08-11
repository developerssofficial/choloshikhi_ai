import { generateRequestId, jsonError, getAuthToken, setCorsHeaders } from './_lib/helpers';
import { verifyToken, getSupabase } from './_lib/supabase';

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const requestId = generateRequestId();

  try {
    const token = getAuthToken(req);
    if (!token) return jsonError(res, 401, 'Authentication required.', requestId);
    const user = await verifyToken(token);
    if (!user) return jsonError(res, 401, 'Invalid token.', requestId);

    const supabase = getSupabase();

    if (req.method === 'GET') {
      const { cache_key } = req.query;
      if (!cache_key || typeof cache_key !== 'string') return jsonError(res, 400, 'cache_key is required.', requestId);
      const { data, error } = await supabase
        .from('prompt_cache')
        .select('id, response, model, expires_at')
        .eq('user_id', user.id)
        .eq('cache_key', cache_key)
        .gt('expires_at', new Date().toISOString())
        .single();
      if (error || !data) return res.json({ success: true, cached: false });
      await supabase.from('prompt_cache').update({ last_accessed_at: new Date().toISOString() }).eq('id', data.id);
      return res.json({ success: true, cached: true, response: data.response, model: data.model });
    }

    if (req.method === 'POST') {
      const { cache_key, model, response: cachedResponse, ttl_hours } = req.body || {};
      if (!cache_key || !cachedResponse) return jsonError(res, 400, 'cache_key and response are required.', requestId);
      const expiresAt = new Date(Date.now() + (ttl_hours || 24) * 60 * 60 * 1000).toISOString();
      const { error } = await supabase
        .from('prompt_cache')
        .upsert({ user_id: user.id, cache_key, model: model || 'gemini', response: cachedResponse, expires_at: expiresAt }, { onConflict: 'user_id,cache_key' });
      if (error) return jsonError(res, 500, 'Failed to cache response.', requestId);
      return res.json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { error } = await supabase.from('prompt_cache').delete().eq('user_id', user.id);
      if (error) return jsonError(res, 500, 'Failed to clear cache.', requestId);
      return res.json({ success: true });
    }

    return jsonError(res, 405, 'Method not allowed.', requestId);
  } catch (error: any) {
    return jsonError(res, 500, error.message || 'Something went wrong.', requestId);
  }
}
