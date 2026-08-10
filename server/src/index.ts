import express from 'express';
import cors from 'cors';
import { env, validateEnv } from './config/env.js';
import { securityHeaders, requestTimeout } from './middleware.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { errorHandler } from './middleware/errorHandler.js';
import chatRouter from './routes/chat.js';
import subscriptionRouter from './routes/subscription.js';
import conversationRouter from './routes/conversations.js';
import memoryRouter from './routes/memories.js';
import promptCacheRouter from './routes/promptCache.js';
import { logger } from './lib/logger.js';

const app = express();

// Validate environment on startup
validateEnv();

// Request ID (first — all subsequent logs use this)
app.use(requestIdMiddleware);

// Security middleware
app.use(securityHeaders);
app.use(cors({
  origin: env.CORS_ORIGINS,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Webhook route needs raw body for signature verification (BEFORE json parser)
app.use('/api/subscription/webhook', express.raw({ type: 'application/json', limit: '1mb' }));

app.use(express.json({ limit: '100kb' }));

// Request timeout (30 seconds)
app.use(requestTimeout(30000));

// Routes
app.use('/api/chat', chatRouter);
app.use('/api/subscription', subscriptionRouter);
app.use('/api/conversations', conversationRouter);
app.use('/api/memories', memoryRouter);
app.use('/api/prompt-cache', promptCacheRouter);

// 404 handler
app.use('/api/*', (_req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found.',
  });
});

// Centralized error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(env.PORT, () => {
  logger.info(undefined, 'Server started', {
    port: env.PORT,
    environment: env.NODE_ENV,
    supabase: env.SUPABASE_URL ? 'configured' : 'not configured',
    paddle: env.PADDLE_API_KEY ? 'configured' : 'not configured',
  });
});

export default app;
