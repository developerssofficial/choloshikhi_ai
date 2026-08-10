import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Generate unique request ID for each request
export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction): void {
  req.requestId = `req_${crypto.randomBytes(8).toString('hex')}`;
  next();
}
