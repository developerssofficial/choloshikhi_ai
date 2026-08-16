"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import LoginModal from "@/components/LoginModal";
import AccountMenu from "@/components/AccountMenu";

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
  const { user, isElectron } = useAuth();
  const [showHistory, setShowHistory] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

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
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20 mb-2">
            <span className="text-white text-sm font-bold">চ</span>
          </div>
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

        {/* Download App */}
        <a
          href="/download"
          className="sidebar-btn group relative"
          title="ডাউনলোড"
        >
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="sidebar-tooltip">ডাউনলোড</span>
        </a>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom section */}
      <div className="flex flex-col items-center gap-1 pb-3 pt-2">
        <AccountMenu />
      </div>
    </>
  );

  // ── History panel content ──
  const historyPanel = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <span className="text-xs font-medium text-gray-400">চ্যাট ইতিহাস</span>
        <button onClick={() => setShowHistory(false)} className="text-gray-600 hover:text-gray-400 text-xs transition-colors">
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
            <div className="w-5 h-5 border-2 border-gray-600 border-t-violet-400 rounded-full animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-gray-600 text-[11px] p-4 text-center">কোনো চ্যাট নেই</p>
        ) : (
          sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => { onLoadSession(s.id); setMobileOpen(false); }}
              className={`w-full text-left px-4 py-2.5 border-b border-white/[0.03] hover:bg-white/[0.04] transition-colors group ${
                activeSessionId === s.id ? "bg-white/[0.06]" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-gray-300 truncate flex-1">{s.title}</p>
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
        className="md:hidden fixed top-3 left-3 z-50 w-9 h-9 rounded-lg bg-[#1a1a24] border border-white/[0.08] flex items-center justify-center text-gray-400 hover:text-white transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* ===== MOBILE OVERLAY ===== */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative w-[260px] bg-[#111118] border-r border-white/[0.06] flex flex-col h-full animate-slide-in-left">
            {sidebarContent}
            {/* Mobile history section */}
            <div className="border-t border-white/[0.06] flex-1 overflow-hidden flex flex-col">
              {historyPanel}
            </div>
          </div>
        </div>
      )}

      {/* ===== DESKTOP SIDEBAR ===== */}
      <aside className="hidden md:flex flex-col w-[52px] border-r border-white/[0.06] bg-[#111118] shrink-0">
        {sidebarContent}
      </aside>

      {/* ===== DESKTOP HISTORY PANEL ===== */}
      {showHistory && (
        <div className="hidden md:flex flex-col w-[240px] border-r border-white/[0.06] bg-[#111118] shrink-0 animate-slide-in-left">
          {historyPanel}
        </div>
      )}
    </>
  );
}
