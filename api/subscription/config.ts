import { setCorsHeaders } from '../../_lib/helpers';

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method not allowed' });

  return res.json({
    success: true,
    clientToken: process.env.PADDLE_CLIENT_TOKEN || '',
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
  });
}
