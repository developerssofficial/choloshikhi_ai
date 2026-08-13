"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const isSupabaseConfigured =
  supabaseUrl.startsWith("http") && supabaseKey.length > 10;

const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;

const GUEST_STORAGE_KEY = "choloshikhi_guest_id";

interface AuthState {
  user: { id: string; email: string; name: string } | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  guestId: string | null;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  guestId: null,
});

/**
 * Get or create a stable guest UUID for this browser session.
 */
function getOrCreateGuestId(): string {
  if (typeof window === "undefined") return crypto.randomUUID();
  let guestId = sessionStorage.getItem(GUEST_STORAGE_KEY);
  if (!guestId) {
    guestId = crypto.randomUUID();
    sessionStorage.setItem(GUEST_STORAGE_KEY, guestId);
  }
  return guestId;
}

/**
 * Merge guest data into real user account after login.
 */
async function mergeGuestToUser(guestId: string, realUserId: string) {
  try {
    // Transfer chat sessions
    await supabase!.from("chat_sessions").update({ user_id: realUserId }).eq("user_id", guestId);
    // Transfer chat history
    await supabase!.from("chat_history").update({ user_id: realUserId }).eq("user_id", guestId);
    // Transfer task executions
    await supabase!.from("task_executions").update({ user_id: realUserId }).eq("user_id", guestId);
    // Clean up guest usage
    await supabase!.from("user_usage").delete().eq("user_id", guestId);
  } catch (err) {
    console.error("Guest merge error:", err);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthState["user"]>(null);
  const [loading, setLoading] = useState(true);
  const [guestId, setGuestId] = useState<string | null>(null);

  useEffect(() => {
    // Initialize guest ID on mount
    setGuestId(getOrCreateGuestId());

    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const realUserId = session.user.id;
        setUser({
          id: realUserId,
          email: session.user.email ?? "",
          name: session.user.user_metadata?.full_name ?? "",
        });

        // Merge guest data if guest ID exists
        const currentGuestId = getOrCreateGuestId();
        if (currentGuestId && currentGuestId !== realUserId) {
          mergeGuestToUser(currentGuestId, realUserId);
        }
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          const realUserId = session.user.id;
          setUser({
            id: realUserId,
            email: session.user.email ?? "",
            name: session.user.user_metadata?.full_name ?? "",
          });

          // Merge guest data on login
          const currentGuestId = getOrCreateGuestId();
          if (currentGuestId && currentGuestId !== realUserId) {
            mergeGuestToUser(currentGuestId, realUserId);
          }
        } else {
          setUser(null);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut, guestId }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);