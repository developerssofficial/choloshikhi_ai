import { generateRequestId, jsonError, getAuthToken, setCorsHeaders } from '../../_lib/helpers';
import { verifyToken, getSupabase } from '../../_lib/supabase';

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const requestId = generateRequestId();

  try {
    if (req.method !== 'GET') return jsonError(res, 405, 'Method not allowed.', requestId);

    const token = getAuthToken(req);
    if (!token) return jsonError(res, 401, 'Authentication required.', requestId);
    const user = await verifyToken(token);
    if (!user) return jsonError(res, 401, 'Invalid token.', requestId);

    const supabase = getSupabase();
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('paddle_subscription_id, status, current_period_end')
      .eq('user_id', user.id)
      .single();

    if (!sub) return res.json({ success: true, active: false, plan: 'free' });

    const now = new Date();
    const isActive = sub.status === 'active' && (!sub.current_period_end || new Date(sub.current_period_end) > now);

    return res.json({
      success: true,
      active: isActive,
      plan: isActive ? 'pro' : 'free',
      subscriptionId: sub.paddle_subscription_id,
      expiresAt: sub.current_period_end,
    });
  } catch (error: any) {
    return jsonError(res, 500, error.message || 'Something went wrong.', requestId);
  }
}
