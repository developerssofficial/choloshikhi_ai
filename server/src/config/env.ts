import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root (two directories up from server/src/config/)
dotenv.config({ path: join(__dirname, '..', '..', '..', '.env') });

export const env = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_API_KEY_FALLBACK: process.env.GEMINI_API_KEY_FALLBACK || '',
  MIMO_API_KEY: process.env.MIMO_API_KEY || '',
  PORT: parseInt(process.env.PORT || '3001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  PADDLE_API_KEY: process.env.PADDLE_API_KEY || '',
  PADDLE_CLIENT_TOKEN: process.env.PADDLE_CLIENT_TOKEN || '',
  PADDLE_WEBHOOK_SECRET: process.env.PADDLE_WEBHOOK_SECRET || '',
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  CORS_ORIGINS: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174,http://localhost:3000,http://localhost:4173').split(',').map(s => s.trim()),
};

export function validateEnv(): void {
  const missing: string[] = [];
  if (!env.GEMINI_API_KEY) missing.push('GEMINI_API_KEY');
  if (!env.MIMO_API_KEY) missing.push('MIMO_API_KEY');
  if (missing.length > 0) {
    console.warn(`[WARNING] Missing environment variables: ${missing.join(', ')}`);
    console.warn('Some API providers may not work. Check your .env file.');
  }
}
