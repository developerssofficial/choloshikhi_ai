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
        .from('conversations')
        .select('id, title, model, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(50);
      if (error) return jsonError(res, 500, 'Failed to load conversations.', requestId);
      return res.json({ success: true, conversations: data });
    }

    if (req.method === 'POST') {
      const { title, model } = req.body || {};
      const { data, error } = await supabase
        .from('conversations')
        .insert({ user_id: user.id, title: title || 'New Chat', model: model || 'gemini' })
        .select('id, title, model, created_at')
        .single();
      if (error) return jsonError(res, 500, 'Failed to create conversation.', requestId);
      return res.json({ success: true, conversation: data });
    }

    return jsonError(res, 405, 'Method not allowed.', requestId);
  } catch (error: any) {
    return jsonError(res, 500, error.message || 'Something went wrong.', requestId);
  }
}
