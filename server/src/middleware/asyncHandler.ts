import { Request, Response, NextFunction } from 'express';

// Wraps async route handlers so that rejected promises are forwarded to Express error handler.
// Without this, Express 4 silently swallows async errors.
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
