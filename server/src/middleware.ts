import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

// Rate limiter: 60 requests per 15 minutes per IP
export const chatRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Input validation for chat requests
export function validateChatInput(req: Request, res: Response, next: NextFunction): void {
  const { message, history, model } = req.body;

  // Validate message
  if (!message || typeof message !== 'string') {
    res.status(400).json({
      success: false,
      message: 'Message is required and must be a string.',
    });
    return;
  }

  const trimmedMessage = message.trim();
  if (trimmedMessage.length === 0) {
    res.status(400).json({
      success: false,
      message: 'Message cannot be empty.',
    });
    return;
  }

  if (trimmedMessage.length > 10000) {
    res.status(400).json({
      success: false,
      message: 'Message is too long. Maximum 10,000 characters allowed.',
    });
    return;
  }

  // Validate model preference — accept provider names (gemini, mimo) or auto
  const validModels = ['gemini', 'mimo', 'auto'];
  if (model && typeof model === 'string' && !validModels.includes(model)) {
    res.status(400).json({
      success: false,
      message: `Invalid model. Must be one of: ${validModels.join(', ')}`,
    });
    return;
  }

  // Validate history (optional)
  if (history !== undefined) {
    if (!Array.isArray(history)) {
      res.status(400).json({
        success: false,
        message: 'History must be an array.',
      });
      return;
    }
    if (history.length > 50) {
      // Limit history to prevent abuse
      req.body.history = history.slice(-50);
    }
  }

  // Sanitize: trim message
  req.body.message = trimmedMessage;

  next();
}

// Request timeout middleware
export function requestTimeout(timeoutMs: number = 30000) {
  return (req: Request, res: Response, next: NextFunction) => {
    req.setTimeout(timeoutMs, () => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          message: 'Request timed out. Please try again.',
        });
      }
    });
    next();
  };
}

// Security headers middleware
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
}
