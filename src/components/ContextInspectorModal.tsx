"use client";

import { useState, useEffect, useCallback } from "react";

export interface MemoryFact {
  id: string;
  category: string;
  key: string;
  value: string;
  confidence?: number;
  updated_at?: string;
}

export interface UserTopic {
  id: string;
  topic: string;
  coverage: "introduced" | "practiced" | "mastered" | "struggled" | string;
  mention_count: number;
  last_practiced?: string;
}

interface ContextInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionMessagesCount: number;
  totalWordsInSession: number;
  isLoggedIn: boolean;
  getToken: () => Promise<string | null>;
  activeMode: "normal" | "education" | "taskplan";
  recentTopicsFromChat?: string[];
}

export default function ContextInspectorModal({
  isOpen,
  onClose,
  sessionMessagesCount,
  totalWordsInSession,
  isLoggedIn,
  getToken,
  activeMode,
  recentTopicsFromChat = [],
}: ContextInspectorModalProps) {
  const [activeTab, setActiveTab] = useState<"facts" | "topics" | "session">("facts");
  const [facts, setFacts] = useState<MemoryFact[]>([]);
  const [topics, setTopics] = useState<UserTopic[]>([]);
  const [totalLifetimeMessages, setTotalLifetimeMessages] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);

  const fetchMemory = useCallback(async () => {
    if (!isLoggedIn) {
      // Guest mode fallback
      return;
    }
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const res = await fetch("/api/memory", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFacts(data.facts || []);
        setTopics(data.topics || []);
        setTotalLifetimeMessages(data.totalMessagesCount || 0);
      }
    } catch (e) {
      console.error("Failed to load memory:", e);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, getToken]);

  useEffect(() => {
    if (isOpen) {
      fetchMemory();
    }
  }, [isOpen, fetchMemory]);

  const handleDeleteFact = async (id: string) => {
    setDeletingId(id);
    try {
      const token = await getToken();
      const res = await fetch(`/api/memory?id=${id}&type=fact`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        setFacts((prev) => prev.filter((f) => f.id !== id));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteTopic = async (id: string) => {
    setDeletingId(id);
    try {
      const token = await getToken();
      const res = await fetch(`/api/memory?id=${id}&type=topic`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        setTopics((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    if (!confirm("আপনি কি নিশ্চিত যে AI-এর সংরক্ষিত সব মেমোরি ক্লিয়ার করতে চান?")) return;
    setClearingAll(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/memory?type=all`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        setFacts([]);
        setTopics([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setClearingAll(false);
    }
  };

  if (!isOpen) return null;

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "learning":
        return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
      case "personal":
        return "bg-violet-500/15 text-violet-300 border-violet-500/30";
      case "preference":
        return "bg-sky-500/15 text-sky-300 border-sky-500/30";
      case "progress":
        return "bg-amber-500/15 text-amber-300 border-amber-500/30";
      default:
        return "bg-slate-500/15 text-slate-300 border-slate-500/30";
    }
  };

  const getCoverageBadge = (coverage: string) => {
    switch (coverage) {
      case "mastered":
        return <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">✨ মাস্টার করেছে</span>;
      case "struggled":
        return <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">⚠️ অতিরিক্ত নজর দরকার</span>;
      case "practiced":
        return <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">📖 প্র্যাকটিস করছে</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-500/20 text-slate-300 border border-slate-500/30">💡 পরিচিতি</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-fadeIn">
      {/* Container with sleek neon border & glassmorphism */}
      <div className="relative w-full max-w-2xl bg-[#0d0e17]/95 border border-white/[0.12] shadow-[0_0_50px_rgba(139,92,246,0.2)] rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[90vh] text-slate-100">
        
        {/* Glow Accents */}
        <div className="absolute top-0 right-1/4 w-40 h-40 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-40 h-40 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-4.5 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">
                  রিয়েল-টাইম কনটেক্সট ও মেমোরি HUD
                </h3>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <p className="text-xs text-slate-400">
                AI আপনার বর্তমান সেশন ও প্রোফাইল থেকে কী মনে রাখছে
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 sm:p-6 bg-black/20 border-b border-white/[0.06]">
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-col justify-between">
            <span className="text-[11px] font-medium text-slate-400">সেশন মেসেজ</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold text-violet-300">{sessionMessagesCount}</span>
              <span className="text-[10px] text-slate-500">টি টার্ন</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-col justify-between">
            <span className="text-[11px] font-medium text-slate-400">কনটেক্সট হেলথ</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold text-emerald-400">১০০%</span>
              <span className="text-[10px] text-emerald-500/80">সক্রিয়</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-col justify-between">
            <span className="text-[11px] font-medium text-slate-400">লার্নিং টপিকস</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold text-sky-300">
                {isLoggedIn ? topics.length : recentTopicsFromChat.length}
              </span>
              <span className="text-[10px] text-slate-500">টি ট্র্যাকড</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-col justify-between">
            <span className="text-[11px] font-medium text-slate-400">সেভড মেমোরি</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold text-amber-300">
                {isLoggedIn ? facts.length : "লাইভ"}
              </span>
              <span className="text-[10px] text-slate-500">পয়েন্টস</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 px-5 sm:px-6 pt-3 border-b border-white/[0.06] bg-white/[0.01]">
          <button
            onClick={() => setActiveTab("facts")}
            className={`pb-3 text-xs sm:text-sm font-medium transition-all relative ${
              activeTab === "facts"
                ? "text-violet-300 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            📌 মনে রাখা তথ্য ({facts.length})
            {activeTab === "facts" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("topics")}
            className={`pb-3 text-xs sm:text-sm font-medium transition-all relative ${
              activeTab === "topics"
                ? "text-sky-300 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            🎯 আলোচিত বিষয় ও প্রগ্রেস ({topics.length})
            {activeTab === "topics" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-500 to-blue-500 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("session")}
            className={`pb-3 text-xs sm:text-sm font-medium transition-all relative ${
              activeTab === "session"
                ? "text-emerald-300 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            ⚡ সেশন কনটেক্সট
            {activeTab === "session" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" />
            )}
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 max-h-[50vh]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-3">
              <div className="w-7 h-7 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400">মেমোরি লোড হচ্ছে...</p>
            </div>
          ) : activeTab === "facts" ? (
            <div>
              {!isLoggedIn ? (
                <div className="p-4 rounded-xl bg-violet-950/20 border border-violet-500/20 text-center space-y-2">
                  <p className="text-xs text-violet-200">
                    💡 আপনি গেস্ট মোডে আছেন। আপনার ব্রাউজারের চলতি সেশনের কনটেক্সট স্বয়ংক্রিয়ভাবে সক্রিয় আছে।
                  </p>
                  <p className="text-[11px] text-slate-400">
                    লগইন করলে আপনার দীর্ঘমেয়াদী পড়ালেখার অগ্রগতি ও মেমোরি ক্লাউডে সুরক্ষিত থাকবে।
                  </p>
                </div>
              ) : facts.length === 0 ? (
                <div className="text-center py-8 space-y-2 text-slate-400">
                  <div className="text-3xl">🧠</div>
                  <p className="text-xs">এখনও কোনো দীর্ঘমেয়াদী তথ্য সেভ হয়নি।</p>
                  <p className="text-[11px] text-slate-500">
                    চ্যাট করার সাথে সাথে AI আপনার পড়ালেখার বিষয়, দুর্বলতা বা পছন্দের বিষয়গুলো স্বয়ংক্রিয়ভাবে মনে রাখবে।
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {facts.map((fact) => (
                    <div
                      key={fact.id}
                      className="flex items-start justify-between gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.07] transition-all group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 text-[10px] uppercase font-semibold tracking-wider rounded-md border ${getCategoryColor(
                              fact.category
                            )}`}
                          >
                            {fact.category}
                          </span>
                          <span className="text-xs font-medium text-slate-300">{fact.key}</span>
                        </div>
                        <p className="text-xs text-slate-100 font-normal pl-0.5">{fact.value}</p>
                      </div>

                      <button
                        onClick={() => handleDeleteFact(fact.id)}
                        disabled={deletingId === fact.id}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 text-xs"
                        title="এই তথ্যটি মুছে ফেলুন"
                      >
                        {deletingId === fact.id ? (
                          <span className="w-3.5 h-3.5 border border-rose-400 border-t-transparent rounded-full animate-spin inline-block" />
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === "topics" ? (
            <div>
              {!isLoggedIn ? (
                <div className="text-center py-6 text-slate-400">
                  <p className="text-xs">গেস্ট মোডে চলতি সেশনের টপিকগুলো চ্যাট কনটেক্সটে সংরক্ষিত হচ্ছে।</p>
                </div>
              ) : topics.length === 0 ? (
                <div className="text-center py-8 space-y-2 text-slate-400">
                  <div className="text-3xl">🎯</div>
                  <p className="text-xs">এখনও কোনো টপিক ট্র্যাক হয়নি।</p>
                  <p className="text-[11px] text-slate-500">
                    আপনি যখন কোনো অধ্যায় বা বিষয়ে প্রশ্ন করবেন, তখন সেগুলো এখানে তালিকাভুক্ত হবে।
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {topics.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.07] flex items-center justify-between gap-2"
                    >
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-slate-200 capitalize">{t.topic}</p>
                        <div className="flex items-center gap-2">
                          {getCoverageBadge(t.coverage)}
                          <span className="text-[10px] text-slate-500 font-mono">
                            {t.mention_count} বার আলোচিত
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteTopic(t.id)}
                        disabled={deletingId === t.id}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded-md hover:bg-rose-500/10 text-xs"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Active Session Tab */
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-violet-950/30 to-indigo-950/20 border border-violet-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-violet-300">বর্তমান মোড</span>
                  <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-violet-600/30 text-violet-200 border border-violet-500/40 capitalize">
                    {activeMode === "education"
                      ? "শিক্ষক মোড (Interactive Tutoring)"
                      : activeMode === "taskplan"
                      ? "টাস্ক প্ল্যানার (Dynamic Execution)"
                      : "সাধারণ চ্যাট (General Assistant)"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  AI আপনার সেশনের পূর্ববর্তী ৫০টি আদান-প্রদান রিয়েল-টাইমে মেমোরিতে ধরে রাখে যাতে ধারাবাহিক আলোচনা বজায় থাকে।
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>সেশনে আনুমানিক শব্দ সংখ্যা:</span>
                  <span className="font-mono text-emerald-400 font-semibold">{totalWordsInSession} words</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>মেমোরি উইন্ডো ধারণক্ষমতা:</span>
                  <span className="font-mono text-violet-400 font-semibold">আনলিমিটেড (স্মার্ট উইন্ডো)</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>সর্বমোট লাইফটাইম চ্যাট:</span>
                  <span className="font-mono text-slate-400">{isLoggedIn ? totalLifetimeMessages : "গেস্ট সেশন"}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-3.5 border-t border-white/[0.08] bg-black/40">
          <div className="flex items-center gap-2">
            <button
              onClick={fetchMemory}
              disabled={loading || !isLoggedIn}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
            >
              <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              রিফ্রেশ
            </button>

            {isLoggedIn && (facts.length > 0 || topics.length > 0) && (
              <button
                onClick={handleClearAll}
                disabled={clearingAll}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 transition-all"
              >
                {clearingAll ? "ক্লিয়ার হচ্ছে..." : "সব মেমোরি মুছুন"}
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-md shadow-violet-600/25 transition-all"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>
    </div>
  );
}
