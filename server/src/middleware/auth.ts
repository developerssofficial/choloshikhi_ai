import { Request, Response, NextFunction } from 'express';
import { verifySupabaseToken } from '../config/supabase.js';
import { logger } from '../lib/logger.js';

// JWT authentication middleware
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Authentication required. Please sign in.',
    });
    return;
  }

  const token = authHeader.substring(7); // Remove "Bearer "

  try {
    const user = await verifySupabaseToken(token);

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token. Please sign in again.',
      });
      return;
    }

    req.user = user;
    logger.info(req.requestId, 'User authenticated', { userId: user.id });
    next();
  } catch (error: any) {
    logger.error(req.requestId, 'Auth verification failed', { error: error.message });
    res.status(401).json({
      success: false,
      message: 'Authentication failed. Please try again.',
    });
  }
}
