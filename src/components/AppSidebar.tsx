"use client";

import { useState, useEffect, useRef } from "react";
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

export const STUDY_PROMPTS = [
  {
    icon: "⚡",
    label: "সহজ ভাষায়",
    desc: "জটিল বিষয় ছোট ও সহজ বাংলায় ব্যাখ্যা",
    prefix: "সহজ ও প্রাঞ্জল ভাষায় ছোট করে বুঝিয়ে দাও: ",
  },
  {
    icon: "🔍",
    label: "বিস্তারিত ব্যাখ্যা",
    desc: "বাস্তব উদাহরণ ও গভীর বিশ্লেষণসহ সম্পূর্ণ উত্তর",
    prefix: "বাস্তব উদাহরণ ও গভীর বিশ্লেষণসহ সম্পূর্ণ বুঝিয়ে দাও: ",
  },
  {
    icon: "📐",
    label: "স্টেপ-বাই-স্টেপ সমাধান",
    desc: "প্রতিটি ধাপ ও সূত্র স্পষ্টভাবে বুঝিয়ে সমাধান",
    prefix: "প্রতিটি ধাপ ও সূত্র স্পষ্টভাবে উল্লেখ করে স্টেপ-বাই-স্টেপ সমাধান করো: ",
  },
  {
    icon: "📝",
    label: "সারাংশ ও রিভিশন",
    desc: "মূল বিষয়বস্তু বুলেট পয়েন্ট আকারে দ্রুত রিভিশন",
    prefix: "এর মূল বিষয়বস্তু ও সারাংশ বুলেট পয়েন্ট আকারে দাও: ",
  },
  {
    icon: "💡",
    label: "পরীক্ষার জন্য গুরুত্বপূর্ণ",
    desc: "পরীক্ষায় ভালো নম্বর পাওয়ার টেকনিক ও টিপস",
    prefix: "পরীক্ষায় ভালো নম্বর পাওয়ার উপযোগী উত্তর ও গুরুত্বপূর্ণ পয়েন্টগুলো তুলে ধরো: ",
  },
  {
    icon: "🎯",
    label: "MCQ কুইজ টেস্ট",
    desc: "৫টি বোর্ড স্ট্যান্ডার্ড MCQ প্রশ্ন ও সমাধান",
    prefix: "এই বিষয়ের উপর ৫টি গুরুত্বপূর্ণ MCQ প্রশ্ন তৈরি করো এবং নিচে সঠিক উত্তর ও ব্যাখ্যা দাও: ",
  },
  {
    icon: "✍️",
    label: "CQ সৃজনশীল প্রশ্ন",
    desc: "জ্ঞান, অনুধাবন, প্রয়োগ ও উচ্চতর দক্ষতা প্রশ্ন",
    prefix: "জ্ঞান, অনুধাবন, প্রয়োগ ও উচ্চতর দক্ষতা অনুযায়ী ১টি আদর্শ সৃজনশীল প্রশ্ন ও উত্তর লেখো: ",
  },
  {
    icon: "📊",
    label: "সূত্রাবলি তালিকা",
    desc: "অধ্যায়ের সকল সূত্র, একক ও প্রতীক এক নজরে",
    prefix: "এই অধ্যায়ের সকল প্রয়োজনীয় সূত্র, একক ও প্রতীক এক নজরে তালিকাভুক্ত করো: ",
  },
  {
    icon: "🇬🇧",
    label: "গ্রামার ও বাক্য চেক",
    desc: "ইংরেজি বা বাংলা লেখার ভুল সংশোধন",
    prefix: "নিচের লেখার গ্রামার ও বানান নির্ভুল করে উন্নত বাক্য গঠন দেখাও: ",
  },
];

export const SUBJECT_PRESETS = [
  {
    icon: "📐",
    subject: "গণিত",
    desc: "বীজগণিত, জ্যামিতি, ত্রিকোণমিতি ও ক্যালকুলাস",
    prompt: "গণিতের এই সমস্যাটি প্রতিটি ধাপ ও সূত্রের বিবরণসহ সহজ ভাষায় সমাধান করে দাও: ",
  },
  {
    icon: "⚡",
    subject: "পদার্থবিজ্ঞান",
    desc: "গতিবিদ্যা, কাজ-ক্ষমতা, বিদ্যুৎ ও আধুনিক পদার্থবিজ্ঞান",
    prompt: "পদার্থবিজ্ঞানের এই সূত্র ও গাণিতিক সমস্যাটি বাস্তব উদাহরণসহ বুঝিয়ে দাও: ",
  },
  {
    icon: "🧪",
    subject: "রসায়ন",
    desc: "রাসায়নিক বিক্রিয়া, পর্যায় সারণি ও সমতাকরণ",
    prompt: "এই রাসায়নিক বিক্রিয়া, সমীকরণ সমতাকরণ ও বিক্রিয়ার কারণ বুঝিয়ে দাও: ",
  },
  {
    icon: "🧬",
    subject: "জীববিজ্ঞান",
    desc: "কোষ, বংশগতিবিদ্যা, শারীরতত্ত্ব ও চিত্রভিত্তিক নোট",
    prompt: "জীববিজ্ঞানের এই প্রক্রিয়া ও গুরুত্বপূর্ণ টার্মগুলো সুন্দর পয়েন্ট আকারে ব্যাখ্যা করো: ",
  },
  {
    icon: "🇬🇧",
    subject: "English Grammar",
    desc: "Tense, Modifiers, Right Forms of Verbs & Rules",
    prompt: "Help me with English grammar, rules, and example sentences for: ",
  },
  {
    icon: "🇧🇩",
    subject: "বাংলা ব্যাকরণ",
    desc: "কারক, সমাস, সন্ধি, উপসর্গ ও বাক্য রূপান্তর",
    prompt: "বাংলা ২য় পত্রের ব্যাকরণ নিয়ম ও উদাহরণসহ বুঝিয়ে দাও: ",
  },
  {
    icon: "💻",
    subject: "ICT ও কোডিং",
    desc: "লজিক গেট, বাইনারি রূপান্তর, HTML ও C প্রোগ্রামিং",
    prompt: "এইচএসসি ICT এর লজিক গেট, বাইনারি রূপান্তর বা সি প্রোগ্রামিং বুঝিয়ে দাও: ",
  },
  {
    icon: "🎯",
    subject: "BCS ও চাকরি প্রস্তুতি",
    desc: "বিগত বছরের প্রশ্ন ব্যাংক ও শর্টকাট টেকনিক",
    prompt: "বিসিএস ও সরকারি চাকরির বিগত বছরের গুরুত্বপূর্ণ প্রশ্ন ও টেকনিক: ",
  },
];

interface Props {
  onNewChat: () => void;
  onLoadSession: (id: string) => void;
  activeSessionId: string | null;
  sessions: ChatSession[];
  loadingSessions: boolean;
  onFetchSessions: () => void;
  onSelectPrompt?: (prompt: string) => void;
}

export default function AppSidebar({
  onNewChat,
  onLoadSession,
  activeSessionId,
  sessions,
  loadingSessions,
  onFetchSessions,
  onSelectPrompt,
}: Props) {
  const { user, signOut, isElectron, getToken } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showHistory, setShowHistory] = useState(false);
  const [showStudyHub, setShowStudyHub] = useState(false);
  const [studyTab, setStudyTab] = useState<"tools" | "subjects">("tools");
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
    if (next) {
      setShowStudyHub(false);
      if (user) onFetchSessions();
    }
  };

  const toggleStudyHub = () => {
    const next = !showStudyHub;
    setShowStudyHub(next);
    if (next) {
      setShowHistory(false);
    }
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

  const handleApplyPrompt = (text: string) => {
    if (onSelectPrompt) {
      onSelectPrompt(text);
    }
    if (pathname !== "/chat") {
      router.push("/chat");
    }
    if (window.innerWidth < 768) {
      setMobileOpen(false);
    }
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
      title: "বিষয় ও পড়ার টুলস",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      action: toggleStudyHub,
      active: showStudyHub,
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

  const studyHubPanel = (
    <div className="flex flex-col h-full bg-[#0d0d16] text-slate-100">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="text-base">📚</span>
          <span className="text-xs font-semibold text-white">বিষয় ও পড়ার টুলস</span>
        </div>
        <button
          onClick={() => setShowStudyHub(false)}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
        >
          ✕
        </button>
      </div>

      {/* Switch Tabs between Tools and Subjects */}
      <div className="flex items-center p-1.5 mx-3 my-2 bg-black/40 rounded-xl border border-white/[0.06]">
        <button
          onClick={() => setStudyTab("tools")}
          className={`flex-1 py-1 text-[11px] font-medium rounded-lg transition-all ${
            studyTab === "tools"
              ? "bg-violet-600 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          ⚡ পড়ার টুলস
        </button>
        <button
          onClick={() => setStudyTab("subjects")}
          className={`flex-1 py-1 text-[11px] font-medium rounded-lg transition-all ${
            studyTab === "subjects"
              ? "bg-violet-600 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          📖 বিষয়ভিত্তিক
        </button>
      </div>

      {/* Content List */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2">
        {studyTab === "tools" ? (
          <div className="space-y-1.5">
            <p className="text-[10px] text-slate-500 font-medium px-1 uppercase tracking-wider mb-1">
              প্রম্পটের কাজ ও ধরন অনুযায়ী বেছে নাও:
            </p>
            {STUDY_PROMPTS.map((tool, idx) => (
              <button
                key={idx}
                onClick={() => handleApplyPrompt(tool.prefix)}
                className="w-full text-left p-2.5 rounded-xl bg-white/[0.02] hover:bg-violet-600/15 border border-white/[0.05] hover:border-violet-500/30 transition-all group flex items-start gap-2.5"
              >
                <span className="text-base shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                  {tool.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-200 group-hover:text-violet-200 truncate">
                    {tool.label}
                  </p>
                  <p className="text-[10.5px] text-slate-400 leading-tight mt-0.5 line-clamp-2">
                    {tool.desc}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            <p className="text-[10px] text-slate-500 font-medium px-1 uppercase tracking-wider mb-1">
              যে বিষয়ে সাহায্য প্রয়োজন:
            </p>
            {SUBJECT_PRESETS.map((sub, idx) => (
              <button
                key={idx}
                onClick={() => handleApplyPrompt(sub.prompt)}
                className="w-full text-left p-2.5 rounded-xl bg-white/[0.02] hover:bg-violet-600/15 border border-white/[0.05] hover:border-violet-500/30 transition-all group flex items-start gap-2.5"
              >
                <span className="text-base shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                  {sub.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-200 group-hover:text-violet-200 truncate">
                    {sub.subject}
                  </p>
                  <p className="text-[10.5px] text-slate-400 leading-tight mt-0.5 line-clamp-2">
                    {sub.desc}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
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
          <div className="relative w-[300px] bg-[#0c0c14] border-r border-white/[0.08] flex flex-col h-full shadow-2xl">
            <div className="flex items-center justify-between p-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="CholoShikhi" className="w-7 h-7 rounded-lg object-contain" />
                <span className="text-xs font-semibold text-white">চলো শিখি AI</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="text-slate-400 hover:text-white p-1">✕</button>
            </div>
            <div className="py-2">{sidebarContent}</div>
            <div className="flex-1 border-t border-white/[0.06] overflow-hidden">
              {showStudyHub ? studyHubPanel : historyPanel}
            </div>
          </div>
        </div>
      )}

      {/* Desktop Vertical Dock */}
      <aside className="hidden md:flex flex-col w-14 border-r border-white/[0.06] bg-[#0c0c14]/90 backdrop-blur-2xl shrink-0 z-20">
        {sidebarContent}
      </aside>

      {/* Desktop Slideout Panel (History or Study Hub) */}
      {(showHistory || showStudyHub) && (
        <div className="hidden md:flex flex-col w-72 border-r border-white/[0.06] bg-[#0c0c14]/95 backdrop-blur-2xl shrink-0 z-20 animate-fade-in">
          {showStudyHub ? studyHubPanel : historyPanel}
        </div>
      )}
    </>
  );
}
