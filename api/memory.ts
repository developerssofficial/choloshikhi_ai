import { generateRequestId, jsonError, getAuthToken, setCorsHeaders } from './_lib/helpers';
import { verifyToken, getSupabase } from './_lib/supabase';

// DELETE /api/memories?id=xxx
export default async function handler(req: any, res: any) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const requestId = generateRequestId();
  const id = req.query.id as string;

  try {
    if (req.method !== 'DELETE') return jsonError(res, 405, 'Method not allowed.', requestId);
    if (!id) return jsonError(res, 400, 'Memory ID required.', requestId);

    const token = getAuthToken(req);
    if (!token) return jsonError(res, 401, 'Authentication required.', requestId);
    const user = await verifyToken(token);
    if (!user) return jsonError(res, 401, 'Invalid token.', requestId);

    const { error } = await getSupabase().from('memories').delete().eq('id', id).eq('user_id', user.id);
    if (error) return jsonError(res, 500, 'Failed to delete memory.', requestId);
    return res.json({ success: true });
  } catch (error: any) {
    return jsonError(res, 500, error.message || 'Something went wrong.', requestId);
  }
}
