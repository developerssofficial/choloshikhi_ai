"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { createClient, Session } from "@supabase/supabase-js";

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
  /** Whether student profile is complete (has full_name, school, etc.) */
  profileComplete: boolean;
  /** Refresh profile status after setup */
  refreshProfile: () => Promise<void>;
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
  profileComplete: false,
  refreshProfile: async () => {},
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

/** Check if student profile is complete (has required fields) */
async function checkProfileComplete(userId: string, token: string): Promise<boolean> {
  try {
    const res = await fetch("/api/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return false;
    const data = await res.json();
    // Profile is complete if it has displayName or username that's not auto-generated
    return !!(data.displayName && data.displayName !== "Student");
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthState["user"]>(null);
  const [loading, setLoading] = useState(true);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);
  const prevAnonUserIdRef = useRef<string | null>(null);
  const initDoneRef = useRef(false);

  const refreshProfile = useCallback(async () => {
    if (!user || !supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    const complete = await checkProfileComplete(user.id, session.access_token);
    setProfileComplete(complete);
  }, [user]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // ── Check for existing session ──
    supabase.auth.getSession().then(async ({ data: { session } }) => {
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
        prevAnonUserIdRef.current = anon ? session.user.id : null;

        // Check profile completeness
        if (session?.access_token) {
          const complete = await checkProfileComplete(session.user.id, session.access_token);
          setProfileComplete(complete);
        }
      } else {
        // No session → create anonymous user (first visit only)
        try {
          await supabase.auth.signInAnonymously();
        } catch (err) {
          console.warn("[Auth] Anonymous sign-in unavailable:", (err as any)?.message);
        }
      }
      initDoneRef.current = true;
      setLoading(false);
    });

    // ── Listen for auth state changes ──
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!initDoneRef.current) return; // Skip events during initialization

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

          // On Google login: detect anonymous → authenticated transition
          if (!anon && prevAnonId && prevAnonId !== session.user.id) {
            try {
              const { data: { session: currentSession } } = await supabase!.auth.getSession();
              const token = currentSession?.access_token;
              if (token) {
                // Merge guest data into new account
                await fetch("/api/auth/merge-guest-data", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                  },
                  body: JSON.stringify({ anonymousUserId: prevAnonId }),
                });
                // Create profile for new Google user
                await fetch("/api/setup", {
                  method: "POST",
                  headers: { "Authorization": `Bearer ${token}` },
                });
                // Check profile completeness
                const complete = await checkProfileComplete(session.user.id, token);
                setProfileComplete(complete);
              }
            } catch (err) {
              console.error("[Auth] Guest merge failed:", err);
            }
            prevAnonUserIdRef.current = null;
          }

          // On session refresh, check profile completeness
          if (event === "TOKEN_REFRESHED" && session?.access_token) {
            const complete = await checkProfileComplete(session.user.id, session.access_token);
            setProfileComplete(complete);
          }
        } else if (event === "SIGNED_OUT") {
          // User explicitly signed out — don't auto-recreate anonymous session
          // Let the page reload handle it, or user clicks login again
          setUser(null);
          setIsAnonymous(false);
          setGuestId(null);
          setProfileComplete(false);
          prevAnonUserIdRef.current = null;
        }
        setLoading(false);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // ── Electron browser auth data listener ──
  useEffect(() => {
    if (!isElectron) return;
    const api = (window as any).electronAPI;

    api.onAuthData(async (callbackData: { type: string; data: string }) => {
      if (!supabase) return;
      try {
        if (callbackData.type === "code") {
          const { data, error } = await supabase.auth.exchangeCodeForSession(callbackData.data);
          if (error) console.error("[Auth] Code exchange failed:", error.message);
          else console.log("[Auth] PKCE login successful:", data.user?.email);
        } else if (callbackData.type === "token") {
          const params = parseHashParams(callbackData.data);
          const accessToken = params.access_token;
          const refreshToken = params.refresh_token;
          if (accessToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || "",
            });
            if (error) console.error("[Auth] setSession failed:", error.message);
          }
        }
      } catch (err) {
        console.error("[Auth] Auth data handler error:", err);
      }
    });
  }, []);

  // ── Google sign-in ──
  const signInWithGoogle = async () => {
    if (!supabase) return;
    const currentPath =
      typeof window !== "undefined" ? window.location.pathname : "/chat";
    const redirectUrl = `${window.location.origin}${currentPath}`;

    if (isElectron) {
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
    setProfileComplete(false);
    prevAnonUserIdRef.current = null;
    if (isElectron) {
      await (window as any).electronAPI.electronLogout();
    }
    // Reload page to get fresh anonymous session
    if (typeof window !== "undefined") {
      window.location.reload();
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
        profileComplete,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
