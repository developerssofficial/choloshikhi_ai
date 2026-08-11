import crypto from 'crypto';

export function generateRequestId(): string {
  return `req_${crypto.randomBytes(8).toString('hex')}`;
}

export function jsonError(res: any, status: number, message: string, requestId?: string) {
  return res.status(status).json({ success: false, message, ...(requestId ? { requestId } : {}) });
}

export function getAuthToken(req: any): string | null {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.substring(7);
}

export function setCorsHeaders(res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}
