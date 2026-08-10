import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger.js';

// Custom application error
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// Centralized error handler
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const requestId = req.requestId || 'unknown';

  // Operational errors (expected, user-friendly)
  if (err instanceof AppError) {
    logger.warn(requestId, err.message, { statusCode: err.statusCode, route: req.path });
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      requestId,
    });
    return;
  }

  // Unexpected errors (log full details, return safe message)
  logger.error(requestId, 'Unexpected error', {
    error: err.message,
    stack: err.stack,
    route: req.path,
    method: req.method,
    userId: req.user?.id,
  });

  res.status(500).json({
    success: false,
    message: 'Something went wrong. Please try again.',
    requestId,
  });
}
