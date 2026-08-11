import { generateRequestId, jsonError, getAuthToken, setCorsHeaders } from '../../_lib/helpers';
import { verifyToken, getSupabase } from '../../_lib/supabase';

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const requestId = generateRequestId();
  const id = req.query.id as string;

  try {
    if (req.method !== 'GET') return jsonError(res, 405, 'Method not allowed.', requestId);
    if (!id) return jsonError(res, 400, 'Conversation ID required.', requestId);

    const token = getAuthToken(req);
    if (!token) return jsonError(res, 401, 'Authentication required.', requestId);
    const user = await verifyToken(token);
    if (!user) return jsonError(res, 401, 'Invalid token.', requestId);

    const supabase = getSupabase();

    const { data: convo } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();
    if (!convo) return jsonError(res, 404, 'Conversation not found.', requestId);

    const { data, error } = await supabase
      .from('messages')
      .select('id, role, content, model, created_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })
      .limit(500);
    if (error) return jsonError(res, 500, 'Failed to load messages.', requestId);

    return res.json({ success: true, messages: data });
  } catch (error: any) {
    return jsonError(res, 500, error.message || 'Something went wrong.', requestId);
  }
}
