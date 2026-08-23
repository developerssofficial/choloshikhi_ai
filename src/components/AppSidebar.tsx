"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import LoginModal from "@/components/LoginModal";

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

function formatDate(d: string): string {
  const date = new Date(d);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "এইমাত্র";
  if (mins < 60) return `${mins} মিনিট আগে`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ঘণ্টা আগে`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} দিন আগে`;
  return date.toLocaleDateString("bn-BD", { month: "short", day: "numeric" });
}

interface Props {
  onNewChat: () => void;
  onLoadSession: (id: string) => void;
  activeSessionId: string | null;
  sessions: ChatSession[];
  loadingSessions: boolean;
  onFetchSessions: () => void;
}

export default function AppSidebar({
  onNewChat,
  onLoadSession,
  activeSessionId,
  sessions,
  loadingSessions,
  onFetchSessions,
}: Props) {
  const { user, signInWithGoogle, signOut, isElectron, getToken } = useAuth();
  const router = useRouter();
  const [showHistory, setShowHistory] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [myUsername, setMyUsername] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  // Fetch username on login
  useEffect(() => {
    if (!user) { setMyUsername(null); return; }
    (async () => {
      try {
        const token = await getToken();
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch("/api/profile", { headers });
        const data = await res.json();
        if (data.username) setMyUsername(data.username);
      } catch {}
    })();
  }, [user, getToken]);

  const toggleHistory = () => {
    const next = !showHistory;
    setShowHistory(next);
    if (next && user) onFetchSessions();
  };

  // Close mobile sidebar on resize
  useEffect(() => {
    const handler = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // Close account dropdown on outside click
  useEffect(() => {
    if (!showAccount) return;
    const handler = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setShowAccount(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showAccount]);

  const deleteSession = async (sid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/sessions/${sid}`, { method: "DELETE" });
      // Notify parent to refresh
      onFetchSessions();
    } catch {}
  };

  // ── Sidebar content (shared between desktop & mobile) ──
  const sidebarContent = (
    <>
      {/* Top section */}
      <div className="flex flex-col items-center gap-1 pt-3 pb-2">
        {/* Logo — hidden in Electron (titlebar has it) */}
        {!isElectron && (
          <img src="/logo-source.png" alt="CholoShikhi" className="w-9 h-9 rounded-xl object-contain shadow-lg shadow-violet-500/25 mb-2" />
        )}
        {isElectron && <div className="mb-2" />}

        {/* New Chat */}
        <button
          onClick={() => { onNewChat(); setMobileOpen(false); }}
          className="sidebar-btn group relative"
          title="নতুন চ্যাট"
        >
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="sidebar-tooltip">নতুন চ্যাট</span>
        </button>

        {/* History */}
        <button
          onClick={toggleHistory}
          className={`sidebar-btn group relative ${showHistory ? "sidebar-btn-active" : ""}`}
          title="চ্যাট ইতিহাস"
        >
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="sidebar-tooltip">চ্যাট ইতিহাস</span>
        </button>

        {/* DM — Messages */}
        {user && (
          <button
            onClick={() => router.push("/chat/dm")}
            className="sidebar-btn group relative"
            title="Messages"
          >
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="sidebar-tooltip">Messages</span>
          </button>
        )}

        {/* Groups */}
        {user && (
          <button
            onClick={() => router.push("/chat/groups")}
            className="sidebar-btn group relative"
            title="Groups"
          >
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="sidebar-tooltip">Groups</span>
          </button>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom section */}
      <div className="flex flex-col items-center gap-1 pb-3 pt-2">
        {/* User */}
        {user ? (
          <div className="relative" ref={accountRef}>
            <button
              onClick={() => setShowAccount((v) => !v)}
              className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-[11px] font-bold hover:shadow-lg hover:shadow-violet-500/25 transition-all"
              title="Account"
            >
              {user.name?.[0] || user.email?.[0] || "U"}
            </button>
            <span className="sidebar-tooltip">Account</span>

            {showAccount && (
              <div className="absolute bottom-full left-full ml-2 mb-0 w-60 bg-[#141420] border border-white/[0.06] rounded-2xl shadow-2xl shadow-black/80 overflow-hidden z-50 text-left backdrop-blur-xl">
                <div className="px-4 py-3 border-b border-white/[0.04]">
                  <p className="text-xs font-medium text-white truncate">{user.name || "User"}</p>
                  <p className="text-[10px] text-gray-600 truncate mt-0.5">{user.email}</p>
                  {myUsername && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <p className="text-[10px] text-violet-400/70 font-mono">{myUsername}</p>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(myUsername);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1500);
                        }}
                        className="text-gray-500 hover:text-violet-400 transition-colors"
                        title="Username কপি করো"
                      >
                        {copied ? (
                          <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => { signOut(); setShowAccount(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[11px] text-gray-400 hover:text-red-400 hover:bg-red-500/[0.05] transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setShowLoginModal(true)}
            className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-gray-500 hover:text-violet-400 hover:bg-white/[0.06] hover:border-violet-500/20 transition-all"
            title="লগইন"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </button>
        )}
      </div>
    </>
  );

  // ── History panel content ──
  const historyPanel = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
        <span className="text-xs font-medium text-gray-400">চ্যাট ইতিহাস</span>
        <button onClick={() => setShowHistory(false)} className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-600 hover:text-white hover:bg-white/[0.06] transition-all">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {!user ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <p className="text-gray-600 text-[11px]">লগইন করুন</p>
            <button onClick={() => setShowLoginModal(true)} className="text-[10px] text-violet-400 hover:text-violet-300 transition-colors">
              লগইন করুন
            </button>
          </div>
        ) : loadingSessions ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-gray-700 border-t-violet-400 rounded-full animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-gray-600 text-[11px] p-4 text-center">কোনো চ্যাট নেই</p>
        ) : (
          sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => { onLoadSession(s.id); setMobileOpen(false); }}
              className={`w-full text-left px-4 py-3 hover:bg-white/[0.03] transition-all group relative ${
                activeSessionId === s.id ? "bg-white/[0.04]" : ""
              }`}
            >
              {activeSessionId === s.id && <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-gradient-to-b from-violet-500 to-indigo-500" />}
              <div className="flex items-center justify-between">
                <p className={`text-[12px] truncate flex-1 ${activeSessionId === s.id ? "text-white" : "text-gray-300 group-hover:text-white"} transition-colors`}>{s.title}</p>
                <button
                  onClick={(e) => deleteSession(s.id, e)}
                  className="text-gray-700 hover:text-red-400 text-[10px] ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="মুছুন"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-[9px] text-gray-600 mt-0.5">{formatDate(s.updated_at)}</p>
            </button>
          ))
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* ===== LOGIN MODAL ===== */}
      <LoginModal open={showLoginModal} onClose={() => setShowLoginModal(false)} />

      {/* ===== MOBILE HAMBURGER BUTTON ===== */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 w-9 h-9 rounded-xl bg-[#0d0d14] border border-white/[0.06] flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.06] transition-all shadow-lg"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* ===== MOBILE OVERLAY ===== */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative w-[260px] bg-[#0d0d14] border-r border-white/[0.04] flex flex-col h-full animate-slide-in-left">
            {sidebarContent}
            <div className="border-t border-white/[0.04] flex-1 overflow-hidden flex flex-col">
              {historyPanel}
            </div>
          </div>
        </div>
      )}

      {/* ===== DESKTOP SIDEBAR ===== */}
      <aside className="hidden md:flex flex-col w-[52px] border-r border-white/[0.04] bg-[#0d0d14] shrink-0">
        {sidebarContent}
      </aside>

      {/* ===== DESKTOP HISTORY PANEL ===== */}
      {showHistory && (
        <div className="hidden md:flex flex-col w-[240px] border-r border-white/[0.04] bg-[#0d0d14] shrink-0 animate-slide-in-left">
          {historyPanel}
        </div>
      )}
    </>
  );
}
