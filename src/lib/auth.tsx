"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const isSupabaseConfigured =
  supabaseUrl.startsWith("http") && supabaseKey.length > 10;

const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;

const GUEST_STORAGE_KEY = "choloshikhi_guest_id";

// ── Electron detection ──
const isElectron =
  typeof window !== "undefined" && !!(window as any).electronAPI?.isElectron;

interface AuthState {
  user: { id: string; email: string; name: string } | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  guestId: string | null;
  isElectron: boolean;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  guestId: null,
  isElectron: false,
});

function getOrCreateGuestId(): string {
  if (typeof window === "undefined") return crypto.randomUUID();
  let guestId = sessionStorage.getItem(GUEST_STORAGE_KEY);
  if (!guestId) {
    guestId = crypto.randomUUID();
    sessionStorage.setItem(GUEST_STORAGE_KEY, guestId);
  }
  return guestId;
}

async function mergeGuestToUser(guestId: string, realUserId: string) {
  try {
    await supabase!.from("chat_sessions").update({ user_id: realUserId }).eq("user_id", guestId);
    await supabase!.from("chat_history").update({ user_id: realUserId }).eq("user_id", guestId);
    await supabase!.from("task_executions").update({ user_id: realUserId }).eq("user_id", guestId);
    await supabase!.from("user_usage").delete().eq("user_id", guestId);
  } catch (err) {
    console.error("Guest merge error:", err);
  }
}

/** Parse URL hash string into key-value pairs */
function parseHashParams(hash: string): Record<string, string> {
  const params: Record<string, string> = {};
  hash.split("&").forEach((pair) => {
    const [key, value] = pair.split("=");
    if (key && value) params[key] = decodeURIComponent(value);
  });
  return params;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthState["user"]>(null);
  const [loading, setLoading] = useState(true);
  const [guestId, setGuestId] = useState<string | null>(null);

  useEffect(() => {
    setGuestId(getOrCreateGuestId());

    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? "",
          name: session.user.user_metadata?.full_name ?? "",
        });
        const currentGuestId = getOrCreateGuestId();
        if (currentGuestId && currentGuestId !== session.user.id) {
          mergeGuestToUser(currentGuestId, session.user.id);
        }
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email ?? "",
            name: session.user.user_metadata?.full_name ?? "",
          });
          const currentGuestId = getOrCreateGuestId();
          if (currentGuestId && currentGuestId !== session.user.id) {
            mergeGuestToUser(currentGuestId, session.user.id);
          }
        } else {
          setUser(null);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // ── Electron auth callback listener ──
  useEffect(() => {
    if (!isElectron) return;
    const api = (window as any).electronAPI;

    api.onAuthCallback(async (callbackData: { type: string; data: string }) => {
      if (!supabase) return;
      console.log("[Auth] Received callback:", callbackData.type);

      try {
        if (callbackData.type === "code") {
          // PKCE flow — exchange code for session
          console.log("[Auth] Exchanging PKCE code for session...");
          const { data, error } = await supabase.auth.exchangeCodeForSession(callbackData.data);
          if (error) {
            console.error("[Auth] Code exchange failed:", error.message);
          } else {
            console.log("[Auth] PKCE login successful:", data.user?.email);
          }
        } else if (callbackData.type === "token") {
          // Implicit flow — tokens in hash
          const params = parseHashParams(callbackData.data);
          const accessToken = params.access_token;
          const refreshToken = params.refresh_token;

          if (accessToken) {
            console.log("[Auth] Setting session with access token...");
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || "",
            });
            if (error) {
              console.error("[Auth] setSession failed:", error.message);
            } else {
              console.log("[Auth] Token login successful");
            }
          }
        }
      } catch (err) {
        console.error("[Auth] Callback handler error:", err);
      }
    });
  }, []);

  const signInWithGoogle = async () => {
    if (!supabase) return;

    if (isElectron) {
      // ── Electron: popup flow ──
      const api = (window as any).electronAPI;
      const { data } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          skipBrowserRedirect: true,
          redirectTo: window.location.origin,
        },
      });
      if (data?.url) {
        await api.electronLogin(data.url);
      }
    } else {
      // ── Web: redirect flow ──
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    if (isElectron) {
      await (window as any).electronAPI.electronLogout();
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut, guestId, isElectron }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
