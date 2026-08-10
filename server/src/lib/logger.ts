// ============================================
// Xparrow AI — Structured Logger
// ============================================

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function formatMessage(level: LogLevel, requestId: string | undefined, message: string, data?: Record<string, any>): string {
  const ts = new Date().toISOString();
  const rid = requestId ? `[${requestId}]` : '';
  const prefix = `[${ts}] [${level.toUpperCase()}] ${rid}`;
  if (data) {
    return `${prefix} ${message} ${JSON.stringify(data)}`;
  }
  return `${prefix} ${message}`;
}

export const logger = {
  info(requestId: string | undefined, message: string, data?: Record<string, any>) {
    console.log(formatMessage('info', requestId, message, data));
  },

  warn(requestId: string | undefined, message: string, data?: Record<string, any>) {
    console.warn(formatMessage('warn', requestId, message, data));
  },

  error(requestId: string | undefined, message: string, data?: Record<string, any>) {
    console.error(formatMessage('error', requestId, message, data));
  },

  debug(requestId: string | undefined, message: string, data?: Record<string, any>) {
    if (process.env.NODE_ENV === 'development') {
      console.log(formatMessage('debug', requestId, message, data));
    }
  },
};
