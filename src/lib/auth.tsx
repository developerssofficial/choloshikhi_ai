"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

/* ===================================================================
   Auth Provider — Supabase Anonymous Auth + Google OAuth
   
   Identity model:
   - Every visitor gets a real Supabase anonymous user (auth.users row)
   - Anonymous users have a real JWT with is_anonymous=true claim
   - When they sign in with Google, the session switches to the Google user
   - guestId = the anonymous user's real auth.users UUID (null when authenticated)
   - isAnonymous = true when session is anonymous
   
   Requires Supabase Dashboard:
   - Authentication → Providers → Anonymous Sign-ins: ENABLED
   - Authentication → Providers → Manual Linking: ENABLED
   =================================================================== */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const isSupabaseConfigured =
  supabaseUrl.startsWith("http") && supabaseKey.length > 10;

const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// ── Electron detection ──
const isElectron =
  typeof window !== "undefined" && !!(window as any).electronAPI?.isElectron;

interface AuthState {
  user: { id: string; email: string; name: string } | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  /** When anonymous: the real auth.users UUID. When authenticated: null. */
  guestId: string | null;
  /** True when session is anonymous (not linked to email/Google) */
  isAnonymous: boolean;
  /** Get the current JWT access token for API calls */
  getToken: () => Promise<string | null>;
  isElectron: boolean;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  guestId: null,
  isAnonymous: false,
  getToken: async () => null,
  isElectron: false,
});

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
  const [isAnonymous, setIsAnonymous] = useState(false);
  const prevAnonUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // ── Check for existing session ──
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Existing session — anonymous or authenticated
        const anon = (session.user as any).is_anonymous ?? false;
        setUser({
          id: session.user.id,
          email: session.user.email ?? "",
          name: session.user.user_metadata?.full_name ?? "",
        });
        setIsAnonymous(anon);
        setGuestId(anon ? session.user.id : null);
      } else {
        // No session → create anonymous user (if feature enabled in dashboard)
        supabase.auth.signInAnonymously().catch((err) => {
          console.warn(
            "[Auth] Anonymous sign-in unavailable — enable it in Supabase Dashboard:",
            err?.message
          );
        });
        // onAuthStateChange will handle the result if successful
      }
      setLoading(false);
    });

    // ── Listen for auth state changes ──
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const anon = (session.user as any).is_anonymous ?? false;
          const prevAnonId = prevAnonUserIdRef.current;

          setUser({
            id: session.user.id,
            email: session.user.email ?? "",
            name: session.user.user_metadata?.full_name ?? "",
          });
          setIsAnonymous(anon);
          setGuestId(anon ? session.user.id : null);

          // Track anonymous user ID for merge detection
          if (anon) {
            prevAnonUserIdRef.current = session.user.id;
          }

          // Detect: was anonymous, now authenticated (different user ID)
          if (!anon && prevAnonId && prevAnonId !== session.user.id) {
            try {
              const { data: { session: currentSession } } = await supabase!.auth.getSession();
              const token = currentSession?.access_token;
              if (token) {
                await fetch("/api/auth/merge-guest-data", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                  },
                  body: JSON.stringify({ anonymousUserId: prevAnonId }),
                });
              }
            } catch (err) {
              console.error("[Auth] Guest merge failed:", err);
            }
            prevAnonUserIdRef.current = null;
          }
        } else {
          // Session ended (sign-out) → create new anonymous session
          setUser(null);
          setIsAnonymous(false);
          setGuestId(null);
          prevAnonUserIdRef.current = null;
          supabase?.auth.signInAnonymously().catch(() => {});
        }
        setLoading(false);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // ── Electron browser auth data listener ──
  // Preserves the exact existing callback contract with desktop/src/main.js
  useEffect(() => {
    if (!isElectron) return;
    const api = (window as any).electronAPI;

    api.onAuthData(async (callbackData: { type: string; data: string }) => {
      if (!supabase) return;
      console.log("[Auth] Received auth data:", callbackData.type);

      try {
        if (callbackData.type === "code") {
          // PKCE flow — exchange code for session
          console.log("[Auth] Exchanging PKCE code for session...");
          const { data, error } = await supabase.auth.exchangeCodeForSession(
            callbackData.data
          );
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
        } else if (callbackData.type === "error") {
          console.error("[Auth] Auth error from browser:", callbackData.data);
        }
      } catch (err) {
        console.error("[Auth] Auth data handler error:", err);
      }
    });
  }, []);

  // ── Google sign-in (Web redirect or Electron browser flow) ──
  // Preserves the exact existing OAuth flow for both platforms
  const signInWithGoogle = async () => {
    if (!supabase) return;
    const currentPath =
      typeof window !== "undefined" ? window.location.pathname : "/chat";
    const redirectUrl = `${window.location.origin}${currentPath}`;

    if (isElectron) {
      // ── Electron: browser flow ──
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
        options: { redirectTo: redirectUrl },
      });
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setIsAnonymous(false);
    setGuestId(null);
    // onAuthStateChange will re-create an anonymous session
    if (isElectron) {
      await (window as any).electronAPI.electronLogout();
    }
  };

  const getToken = async (): Promise<string | null> => {
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle,
        signOut,
        guestId,
        isAnonymous,
        getToken,
        isElectron,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
