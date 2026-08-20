import { createClient } from "@supabase/supabase-js";

/* ===================================================================
   Server-Side JWT Verification Utility
   
   Verifies the Authorization header from API requests and returns
   the authenticated user identity (anonymous or permanent).
   
   Usage in API routes:
     import { verifyAuthUser } from "@/lib/supabase-auth";
     
     const authUser = await verifyAuthUser(request);
     if (!authUser) {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
     }
     const userId = authUser.id;  // trusted — extracted from verified JWT
   =================================================================== */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export interface AuthUser {
  /** Verified auth.users UUID — safe for foreign key references */
  id: string;
  /** True if the user signed in anonymously (no email/Google linked yet) */
  isAnonymous: boolean;
  /** User email if authenticated, null for anonymous users */
  email: string | null;
}

/**
 * Extract and verify the JWT from a Request's Authorization header.
 * Returns the verified user identity, or null if invalid/missing.
 *
 * This uses the anon key (not service role) to perform a getUser() call
 * against Supabase Auth, which validates the JWT signature and checks
 * that the user still exists and the session is active.
 */
export async function verifyAuthUser(
  request: Request
): Promise<AuthUser | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  if (!token) return null;

  try {
    const client = createClient(supabaseUrl, supabaseAnonKey);
    const {
      data: { user },
      error,
    } = await client.auth.getUser(token);

    if (error || !user) return null;

    return {
      id: user.id,
      isAnonymous: (user as any).is_anonymous ?? false,
      email: user.email ?? null,
    };
  } catch {
    return null;
  }
}
