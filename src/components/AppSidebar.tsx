"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter, usePathname } from "next/navigation";
import LoginModal from "@/components/LoginModal";

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

function formatDate(d: string): string {
  try {
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
  } catch {
    return "";
  }
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
  const { user, signOut, isElectron, getToken } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showHistory, setShowHistory] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [myUsername, setMyUsername] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      setMyUsername(null);
      return;
    }
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

  useEffect(() => {
    const handler = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    if (!showAccount) return;
    const handler = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setShowAccount(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showAccount]);

  const deleteSession = async (sid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/sessions/${sid}`, { method: "DELETE" });
      onFetchSessions();
    } catch {}
  };

  const navItems = [
    {
      title: "নতুন চ্যাট",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      action: () => {
        onNewChat();
        if (pathname !== "/chat") router.push("/chat");
        setMobileOpen(false);
      },
      active: false,
    },
    {
      title: "চ্যাট ইতিহাস",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      action: toggleHistory,
      active: showHistory,
    },
    {
      title: "Messages (DM)",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      action: () => {
        router.push("/chat/dm");
        setMobileOpen(false);
      },
      active: pathname === "/chat/dm",
      requiresAuth: true,
    },
    {
      title: "গ্রুপ চ্যাট",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      action: () => {
        router.push("/chat/groups");
        setMobileOpen(false);
      },
      active: pathname === "/chat/groups",
      requiresAuth: true,
    },
  ];

  const sidebarContent = (
    <>
      <div className="flex flex-col items-center gap-2 pt-3 pb-2">
        {!isElectron && (
          <button
            onClick={() => router.push("/")}
            className="w-10 h-10 rounded-2xl p-1 hover:scale-105 transition-transform mb-2"
            title="হোমপেজ"
          >
            <img src="/logo.png" alt="CholoShikhi" className="w-full h-full object-contain rounded-xl shadow-md shadow-violet-500/25" />
          </button>
        )}

        {navItems.map((item, idx) => {
          if (item.requiresAuth && !user) return null;
          return (
            <button
              key={idx}
              onClick={item.action}
              className={`sidebar-btn group relative ${item.active ? "sidebar-btn-active" : ""}`}
              title={item.title}
            >
              {item.icon}
              <span className="sidebar-tooltip">{item.title}</span>
            </button>
          );
        })}
      </div>

      <div className="flex-1" />

      {/* Bottom Profile / Login Button */}
      <div className="flex flex-col items-center gap-2 pb-4 pt-2">
        {user ? (
          <div className="relative" ref={accountRef}>
            <button
              onClick={() => setShowAccount((v) => !v)}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-violet-500/20 hover:scale-105 transition-transform"
              title="আমার প্রোফাইল"
            >
              {user.name?.[0] || user.email?.[0] || "U"}
            </button>
            <span className="sidebar-tooltip">প্রোফাইল</span>

            {showAccount && (
              <div className="absolute bottom-full left-full ml-3 mb-0 w-64 glass-dock border border-white/[0.1] rounded-2xl shadow-2xl p-3 z-50 text-left animate-scale-up">
                <div className="pb-2.5 mb-2.5 border-b border-white/[0.08]">
                  <p className="text-xs font-semibold text-white truncate">{user.name || "শিক্ষার্থী"}</p>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{user.email}</p>
                  {myUsername && (
                    <div className="flex items-center gap-2 mt-2 bg-white/[0.04] px-2 py-1 rounded-lg border border-white/[0.06]">
                      <p className="text-[10px] text-violet-300 font-mono font-medium">{myUsername}</p>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(myUsername);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1500);
                        }}
                        className="text-slate-400 hover:text-white transition-colors ml-auto text-[10px]"
                        title="কপি আইডি"
                      >
                        {copied ? "কপি হয়েছে ✓" : "কপি"}
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    signOut();
                    setShowAccount(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>লগআউট</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setShowLoginModal(true)}
            className="w-9 h-9 rounded-xl glass-panel-subtle flex items-center justify-center text-slate-400 hover:text-violet-400 hover:border-violet-500/30 transition-all"
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

  const historyPanel = (
    <div className="flex flex-col h-full bg-[#0d0d16]">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06]">
        <span className="text-xs font-semibold text-slate-300">চ্যাট ইতিহাস</span>
        <button
          onClick={() => setShowHistory(false)}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
        >
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {!user ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-center px-4">
            <p className="text-slate-400 text-xs">ইতিহাস দেখতে লগইন করুন</p>
            <button
              onClick={() => setShowLoginModal(true)}
              className="text-xs text-violet-400 hover:text-violet-300 font-medium"
            >
              লগইন
            </button>
          </div>
        ) : loadingSessions ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-slate-700 border-t-violet-400 rounded-full animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-slate-500 text-xs py-8 text-center">কোনো পূর্ববর্তী চ্যাট নেই</p>
        ) : (
          sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                onLoadSession(s.id);
                setMobileOpen(false);
              }}
              className={`w-full text-left px-3 py-2.5 rounded-xl hover:bg-white/[0.05] transition-all group relative flex items-center justify-between ${
                activeSessionId === s.id ? "bg-white/[0.08] text-white border border-white/[0.08]" : "text-slate-300"
              }`}
            >
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-xs truncate font-medium">{s.title}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{formatDate(s.updated_at)}</p>
              </div>
              <button
                onClick={(e) => deleteSession(s.id, e)}
                className="text-slate-500 hover:text-rose-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                title="মুছুন"
              >
                ✕
              </button>
            </button>
          ))
        )}
      </div>
    </div>
  );

  return (
    <>
      <LoginModal open={showLoginModal} onClose={() => setShowLoginModal(false)} />

      {/* Mobile Hamburger Toggle Button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 w-9 h-9 rounded-xl glass-dock flex items-center justify-center text-slate-300 hover:text-white transition-all shadow-lg"
        title="মেনু"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex animate-fade-in">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setMobileOpen(false)} />
          <div className="relative w-[280px] bg-[#0c0c14] border-r border-white/[0.08] flex flex-col h-full shadow-2xl">
            <div className="flex items-center justify-between p-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="CholoShikhi" className="w-7 h-7 rounded-lg object-contain" />
                <span className="text-xs font-semibold text-white">চলো শিখি AI</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="text-slate-400 hover:text-white p-1">✕</button>
            </div>
            <div className="py-2">{sidebarContent}</div>
            <div className="flex-1 border-t border-white/[0.06] overflow-hidden">{historyPanel}</div>
          </div>
        </div>
      )}

      {/* Desktop Vertical Dock */}
      <aside className="hidden md:flex flex-col w-14 border-r border-white/[0.06] bg-[#0c0c14]/90 backdrop-blur-2xl shrink-0 z-20">
        {sidebarContent}
      </aside>

      {/* Desktop History Slideout Panel */}
      {showHistory && (
        <div className="hidden md:flex flex-col w-64 border-r border-white/[0.06] bg-[#0c0c14]/95 backdrop-blur-2xl shrink-0 z-20 animate-fade-in">
          {historyPanel}
        </div>
      )}
    </>
  );
}
