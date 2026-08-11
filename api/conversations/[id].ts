import { generateRequestId, jsonError, getAuthToken, setCorsHeaders } from '../_lib/helpers';
import { verifyToken, getSupabase } from '../_lib/supabase';

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const requestId = generateRequestId();
  const id = req.query.id as string;

  try {
    if (!id) return jsonError(res, 400, 'Conversation ID required.', requestId);

    const token = getAuthToken(req);
    if (!token) return jsonError(res, 401, 'Authentication required.', requestId);
    const user = await verifyToken(token);
    if (!user) return jsonError(res, 401, 'Invalid token.', requestId);

    const supabase = getSupabase();

    if (req.method === 'PATCH') {
      const { title, model } = req.body || {};
      const updates: Record<string, any> = {};
      if (title !== undefined) updates.title = title;
      if (model !== undefined) updates.model = model;

      const { data, error } = await supabase
        .from('conversations')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select('id, title, model, updated_at')
        .single();
      if (error || !data) return jsonError(res, 404, 'Conversation not found.', requestId);
      return res.json({ success: true, conversation: data });
    }

    if (req.method === 'DELETE') {
      const { error } = await supabase.from('conversations').delete().eq('id', id).eq('user_id', user.id);
      if (error) return jsonError(res, 500, 'Failed to delete conversation.', requestId);
      return res.json({ success: true });
    }

    return jsonError(res, 405, 'Method not allowed.', requestId);
  } catch (error: any) {
    return jsonError(res, 500, error.message || 'Something went wrong.', requestId);
  }
}
