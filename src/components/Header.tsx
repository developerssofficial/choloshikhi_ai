import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

type ModelTier = "low" | "medium" | "pro";
type SystemMode = "chat" | "thinking" | "plan";

interface HeaderProps {
  selectedTier: ModelTier;
  onSelectTier: (tier: ModelTier) => void;
  systemMode: SystemMode;
  onSystemModeChange: (mode: SystemMode) => void;
  isPro: boolean;
  onToggleSidebar: () => void;
}

const MODELS = [
  { id: "low" as ModelTier, label: "Xparrow 1.0 Lite", icon: "rocket" },
  { id: "medium" as ModelTier, label: "Xparrow 1.0 Medium", icon: "rocket" },
  { id: "pro" as ModelTier, label: "Xparrow 1.0 Pro", icon: "crown" },
];

const MODES: { id: SystemMode; label: string; icon: React.ReactNode }[] = [
  { id: "chat", label: "Chat", icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg> },
  { id: "thinking", label: "Thinking", icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg> },
  { id: "plan", label: "Plan", icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg> },
];

export default function Header({
  selectedTier, onSelectTier, systemMode, onSystemModeChange, isPro, onToggleSidebar,
}: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user, signOut } = useAuth();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUserMenu(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="h-14 bg-[#0a0a12]/80 backdrop-blur-xl border-b border-white/[0.06] px-4 flex items-center justify-between relative z-30">
      {/* Left */}
      <div className="flex items-center space-x-2">
        {/* Mobile menu */}
        <button onClick={onToggleSidebar} className="lg:hidden text-gray-500 hover:text-white p-1.5 rounded-lg hover:bg-white/[0.06]">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Model Tabs — Inline like reference */}
        <div className="hidden sm:flex items-center bg-white/[0.03] rounded-xl border border-white/[0.06] p-1">
          {MODELS.map((model) => {
            const locked = model.id === "pro" && !isPro;
            return (
              <button
                key={model.id}
                onClick={() => {
                  if (locked) window.location.href = "/pro";
                  else onSelectTier(model.id);
                }}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all whitespace-nowrap ${
                  selectedTier === model.id
                    ? "bg-gradient-to-r from-purple-600/40 to-indigo-600/40 text-white shadow-sm"
                    : locked
                    ? "text-gray-700 cursor-default"
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"
                }`}
              >
                {model.icon === "crown" ? (
                  <svg className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14v2H5v-2z" />
                  </svg>
                ) : (
                  <svg className={`w-3.5 h-3.5 ${selectedTier === model.id ? "text-purple-400" : "text-gray-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                )}
                <span>{model.label}</span>
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-white/[0.08] hidden sm:block"></div>

        {/* Mode Buttons */}
        <div className="flex items-center bg-white/[0.03] rounded-lg border border-white/[0.06] p-0.5">
          {MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => onSystemModeChange(mode.id)}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-all ${
                systemMode === mode.id
                  ? mode.id === "chat"
                    ? "bg-indigo-500/20 text-indigo-300"
                    : mode.id === "thinking"
                    ? "bg-amber-500/20 text-amber-300"
                    : "bg-emerald-500/20 text-emerald-300"
                  : "text-gray-600 hover:text-gray-400"
              }`}
            >
              {mode.icon}
              <span className="hidden md:inline">{mode.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center space-x-1">
        <button className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
        <button className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        <button className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors relative">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-purple-500 rounded-full"></div>
        </button>

        {/* Avatar */}
        <div className="relative" ref={userMenuRef}>
          <button onClick={() => setShowUserMenu(!showUserMenu)} className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold hover:ring-2 hover:ring-purple-500/30 transition-all ml-1">
            {user?.email?.charAt(0).toUpperCase() || "?"}
          </button>
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-[#12121c] border border-white/[0.08] rounded-xl shadow-2xl shadow-black/50 py-2 z-50 animate-scale-up">
              <div className="px-3 py-2 border-b border-white/[0.06]">
                <p className="text-[13px] text-gray-300 truncate">{user?.email}</p>
              </div>
              <Link to="/pro" className="block px-3 py-2 text-[13px] text-gray-400 hover:bg-white/[0.04] hover:text-white transition-colors">
                {isPro ? "Pro Member" : "Upgrade to Pro"}
              </Link>
              <button onClick={signOut} className="w-full text-left px-3 py-2 text-[13px] text-red-400 hover:bg-red-500/10 transition-colors">
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
