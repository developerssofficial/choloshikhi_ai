import { createClient } from '@supabase/supabase-js';

let client: any = null;

export function getSupabase() {
  if (!client) {
    client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return client;
}

export async function verifyToken(token: string): Promise<{ id: string; email: string } | null> {
  try {
    const { data: { user }, error } = await getSupabase().auth.getUser(token);
    if (error || !user) return null;
    return { id: user.id, email: user.email || '' };
  } catch {
    return null;
  }
}
