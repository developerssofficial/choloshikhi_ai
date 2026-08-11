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
      const { data, error } = await supabase
        .from('memories')
        .select('id, memory_type, content, importance, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) return jsonError(res, 500, 'Failed to load memories.', requestId);
      return res.json({ success: true, memories: data });
    }

    if (req.method === 'POST') {
      const { memory_type, content, importance } = req.body || {};
      if (!memory_type || !content) return jsonError(res, 400, 'memory_type and content are required.', requestId);
      const { data, error } = await supabase
        .from('memories')
        .insert({ user_id: user.id, memory_type, content, importance: importance || 1 })
        .select('id, memory_type, content, importance, created_at')
        .single();
      if (error) return jsonError(res, 500, 'Failed to save memory.', requestId);
      return res.json({ success: true, memory: data });
    }

    if (req.method === 'DELETE') {
      const { error } = await supabase.from('memories').delete().eq('user_id', user.id);
      if (error) return jsonError(res, 500, 'Failed to clear memories.', requestId);
      return res.json({ success: true });
    }

    return jsonError(res, 405, 'Method not allowed.', requestId);
  } catch (error: any) {
    return jsonError(res, 500, error.message || 'Something went wrong.', requestId);
  }
}
