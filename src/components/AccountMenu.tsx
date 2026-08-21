"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";

interface Props {
  compact?: boolean;
}

interface SubStatus {
  plan: "free" | "unlimited";
  isUnlimited: boolean;
  teacherMonthlyLimit: number;
  teacherMonthlyUsed: number;
  teacherRemaining: number;
  username: string | null;
  displayName: string | null;
}

export default function AccountMenu({ compact }: Props) {
  const { user, signInWithGoogle, signOut, getToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [showRedeem, setShowRedeem] = useState(false);
  const [showEditName, setShowEditName] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState("");
  const [editName, setEditName] = useState("");
  const [editNameLoading, setEditNameLoading] = useState(false);
  const [sub, setSub] = useState<SubStatus | null>(null);
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

  // Fetch subscription status
  const fetchSub = async () => {
    if (!user) return;
    try {
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/subscription", { headers });
      const data = await res.json();
      setSub(data);
    } catch {}
  };

  useEffect(() => {
    if (user) fetchSub();
  }, [user]);

  // Redeem code
  const handleRedeem = async () => {
    if (!redeemCode.trim()) return;
    setRedeemLoading(true);
    setRedeemMsg("");
    try {
      const token = await getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/subscription", {
        method: "POST",
        headers,
        body: JSON.stringify({ code: redeemCode }),
      });
      const data = await res.json();
      setRedeemMsg(data.message || data.error || "Failed");
      if (data.success) {
        setRedeemCode("");
        fetchSub();
        setTimeout(() => { setShowRedeem(false); setRedeemMsg(""); }, 2000);
      }
    } catch {
      setRedeemMsg("Network error. Try again.");
    }
    setRedeemLoading(false);
  };

  // Update display name
  const handleEditName = async () => {
    if (!editName.trim()) return;
    setEditNameLoading(true);
    try {
      const token = await getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ displayName: editName }),
      });
      const data = await res.json();
      if (data.success) {
        setShowEditName(false);
        fetchSub();
      }
    } catch {}
    setEditNameLoading(false);
  };

  // Not logged in
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

  const initial = user.name?.[0] || user.email?.[0] || "U";
  const isUnlimited = sub?.isUnlimited || false;
  const teacherUsed = sub?.teacherMonthlyUsed || 0;
  const teacherLimit = sub?.teacherMonthlyLimit || 30;
  const teacherPct = Math.min(100, (teacherUsed / teacherLimit) * 100);
  const nearLimit = teacherPct >= 80;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 rounded-lg transition-all hover:bg-white/[0.06] ${
          compact ? "p-1.5" : "p-2"
        }`}
        title="Account"
      >
        <div className={`relative rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-violet-500/20 ${
          compact ? "w-6 h-6 text-[9px]" : "w-7 h-7 text-[10px]"
        }`}>
          {initial}
          {/* Plan badge dot */}
          {isUnlimited && (
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 border border-[#1a1a24]" title="Unlimited Plan" />
          )}
        </div>
      </button>

      {open && (
        <div className={`absolute right-0 z-50 w-64 bg-[#1a1a24] border border-white/[0.08] rounded-xl shadow-2xl shadow-black/60 overflow-hidden ${
          compact ? "bottom-full mb-2" : "top-full mt-1"
        }`}>
          {/* User info + username */}
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-white truncate">{user.name || "User"}</p>
              <button onClick={() => { setEditName(sub?.displayName || user.name || ""); setShowEditName(true); }}
                className="text-[9px] text-gray-500 hover:text-violet-400 transition-colors">Edit</button>
            </div>
            <p className="text-[10px] text-gray-500 truncate mt-0.5">{user.email}</p>
            {sub?.username && (
              <p className="text-[10px] text-violet-400/70 font-mono mt-1">{sub.username}</p>
            )}
          </div>

          {/* Plan badge + quota */}
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                isUnlimited
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  : "bg-white/[0.04] text-gray-400 border border-white/[0.06]"
              }`}>
                {isUnlimited ? "Unlimited" : "Free"}
              </span>
              {sub?.username && (
                <span className="text-[9px] text-gray-600 font-mono">{sub.username}</span>
              )}
            </div>

            {/* Shikkhok mode quota bar */}
            {!isUnlimited && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-[9px] mb-1">
                  <span className="text-gray-500">Shikkhok Mode</span>
                  <span className={nearLimit ? "text-amber-400" : "text-gray-500"}>
                    {teacherUsed}/{teacherLimit}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      nearLimit ? "bg-amber-500" : "bg-violet-500"
                    }`}
                    style={{ width: `${teacherPct}%` }}
                  />
                </div>
                {nearLimit && (
                  <p className="text-[8px] text-amber-400/70 mt-1">
                    {teacherLimit - teacherUsed} remaining this month
                  </p>
                )}
              </div>
            )}

            {isUnlimited && (
              <p className="text-[9px] text-amber-400/70 mt-1">All modes unlimited</p>
            )}
          </div>

          {/* Edit name modal */}
          {showEditName && (
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <p className="text-[10px] text-gray-400 mb-2">Display Name</p>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Your name"
                maxLength={30}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-[11px] text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/30"
              />
              <div className="flex gap-2 mt-2">
                <button onClick={handleEditName} disabled={editNameLoading}
                  className="flex-1 py-1 text-[10px] bg-violet-600 text-white rounded-lg hover:bg-violet-500 disabled:opacity-40">
                  {editNameLoading ? "..." : "Save"}
                </button>
                <button onClick={() => setShowEditName(false)}
                  className="flex-1 py-1 text-[10px] text-gray-400 border border-white/[0.06] rounded-lg hover:bg-white/[0.04]">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Redeem code section */}
          {!showRedeem ? (
            <button
              onClick={() => setShowRedeem(true)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[11px] text-amber-400 hover:bg-amber-500/[0.05] transition-colors border-b border-white/[0.06]"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
              <span>Redeem Code</span>
            </button>
          ) : (
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <p className="text-[10px] text-gray-400 mb-2">Enter redeem code</p>
              <input
                type="text"
                value={redeemCode}
                onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                placeholder="XXXXXXX"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-[11px] text-white font-mono placeholder-gray-600 focus:outline-none focus:border-amber-500/30 uppercase"
                onKeyDown={(e) => e.key === "Enter" && handleRedeem()}
              />
              {redeemMsg && (
                <p className={`text-[10px] mt-1.5 ${redeemMsg.includes("success") || redeemedMsg_check(redeemMsg) ? "text-emerald-400" : "text-red-400"}`}>
                  {redeemMsg}
                </p>
              )}
              <div className="flex gap-2 mt-2">
                <button onClick={handleRedeem} disabled={redeemLoading || !redeemCode.trim()}
                  className="flex-1 py-1 text-[10px] bg-amber-600 text-white rounded-lg hover:bg-amber-500 disabled:opacity-40">
                  {redeemLoading ? "..." : "Redeem"}
                </button>
                <button onClick={() => { setShowRedeem(false); setRedeemMsg(""); setRedeemCode(""); }}
                  className="flex-1 py-1 text-[10px] text-gray-400 border border-white/[0.06] rounded-lg hover:bg-white/[0.04]">
                  Cancel
                </button>
              </div>
            </div>
          )}

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

function redeemedMsg_check(msg: string): boolean {
  return msg.includes("unlimited") || msg.includes("now have");
}
