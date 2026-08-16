"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";

interface Props {
  /** Compact mode for header (smaller avatar/text) */
  compact?: boolean;
}

export default function AccountMenu({ compact }: Props) {
  const { user, signInWithGoogle, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Not logged in → show login button
  if (!user) {
    return (
      <button
        onClick={signInWithGoogle}
        className={`flex items-center gap-1.5 rounded-lg text-gray-400 hover:text-violet-400 hover:bg-white/[0.06] transition-all ${
          compact ? "px-2.5 py-1.5 text-[10px]" : "px-3 py-2 text-xs"
        }`}
        title="লগইন"
      >
        <svg className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span>লগইন</span>
      </button>
    );
  }

  // Logged in → show avatar + dropdown
  const initial = user.name?.[0] || user.email?.[0] || "U";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 rounded-lg transition-all hover:bg-white/[0.06] ${
          compact ? "p-1.5" : "p-2"
        }`}
        title="Account"
      >
        <div className={`rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-violet-500/20 ${
          compact ? "w-6 h-6 text-[9px]" : "w-7 h-7 text-[10px]"
        }`}>
          {initial}
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className={`absolute right-0 z-50 w-56 bg-[#1a1a24] border border-white/[0.08] rounded-xl shadow-2xl shadow-black/60 overflow-hidden ${
          compact ? "bottom-full mb-2" : "top-full mt-1"
        }`}>
          {/* User info */}
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <p className="text-xs font-medium text-white truncate">{user.name || "User"}</p>
            <p className="text-[10px] text-gray-500 truncate mt-0.5">{user.email}</p>
          </div>

          {/* Logout */}
          <button
            onClick={() => { signOut(); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[11px] text-gray-400 hover:text-red-400 hover:bg-white/[0.04] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>লগআউট</span>
          </button>
        </div>
      )}
    </div>
  );
}
