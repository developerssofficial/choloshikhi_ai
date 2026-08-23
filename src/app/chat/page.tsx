"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { ViewTransition } from "react";
import RenderMessage from "@/components/RenderMessage";
import TaskFlowChart from "@/components/TaskFlowChart";
import TaskExecutionPanel from "@/components/TaskExecutionPanel";
import AppSidebar from "@/components/AppSidebar";
import EmojiPicker from "@/components/EmojiPicker";
import { parseEmoji } from "@/lib/emoji";
import type { TaskGraph, TaskClarification, TaskNodeStatus } from "@/lib/taskTypes";

interface Message {
  role: "user" | "assistant";
  content: string;
  image?: string;
  sources?: { title: string; url: string }[];
  taskGraph?: TaskGraph;
  taskClarification?: TaskClarification;
}

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "সুপ্রভাত";
  if (h < 17) return "শুভ অপরাহ্ন";
  return "শুভ সন্ধ্যা";
}

const SUGGESTIONS = [
  { icon: "🔍", label: "Research", text: "আমাকে একটা বিষয়ে জানাও" },
  { icon: "✏️", label: "Write", text: "আমাকে একটা লেখা লিখে দাও" },
  { icon: "🧮", label: "Solve", text: "আমাকে গণিত সমস্যা সমাধান করো" },
  { icon: "💡", label: "Explain", text: "আমাকে একটা ধারণা বোঝাও" },
  { icon: "📋", label: "Plan", text: "আমাকে একটা প্ল্যান তৈরি করে দাও" },
  { icon: "📝", label: "Help", text: "/help" },
];

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

// Guest memory: localStorage-based conversation memory for non-logged-in users
const GUEST_MEMORY_KEY = "choloshikhi_guest_memory";
const GUEST_MEMORY_LIMIT = 50;

function loadGuestMemory(): Array<{ role: string; content: string }> {
  try {
    const raw = localStorage.getItem(GUEST_MEMORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveGuestMemory(memory: Array<{ role: string; content: string }>) {
  try {
    localStorage.setItem(GUEST_MEMORY_KEY, JSON.stringify(memory.slice(-GUEST_MEMORY_LIMIT)));
  } catch {}
}

function SourcesCard({ sources }: { sources: { title: string; url: string }[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2 border border-white/[0.06] rounded-xl overflow-hidden bg-white/[0.02]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-[10px] text-gray-500 hover:text-gray-400 hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <svg className="w-3 h-3 text-violet-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
          <span>{sources.length} source{sources.length > 1 ? "s" : ""}</span>
        </div>
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      <div
        className={`transition-all duration-200 ease-out ${open ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0"} overflow-hidden`}
      >
        <div className="px-3 pb-2 space-y-1">
          {sources.map((src, j) => (
            <a
              key={j}
              href={src.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 text-[10px] text-gray-500 hover:text-violet-300 py-1 rounded transition-colors"
            >
              <span className="text-violet-400/50 font-mono mt-px flex-shrink-0">[{j + 1}]</span>
              <div className="min-w-0">
                <p className="truncate">{src.title}</p>
                <p className="text-[8px] text-gray-600 truncate">{getDomain(src.url)}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Sanitize display text — strip any leaked JSON that shouldn't be user-facing */
function sanitizeDisplayText(text: string): string {
  if (!text) return text;
  let clean = text.replace(/```json\s*[\s\S]*?```/g, "").trim();
  if (/\{\s*"action"\s*:/.test(clean) || /\{\s*"taskGraph"\s*:/.test(clean) || /\{\s*"nodes"\s*:/.test(clean)) {
    clean = clean.replace(/\{[\s\S]*\}/g, "").trim();
  }
  return clean || "";
}

export default function ChatPage() {
  const { user, loading, signInWithGoogle, signOut, getToken } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [typingIdx, setTypingIdx] = useState<number | null>(null);
  const [typingText, setTypingText] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [mode, setMode] = useState<"normal" | "education" | "taskplan">("normal");
  const [searching, setSearching] = useState(false);
  const [searchComplete, setSearchComplete] = useState<number | null>(null);
  const [searchComplexity, setSearchComplexity] = useState<"simple" | "standard" | "heavy">("standard");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const searchCompleteRef = useRef<NodeJS.Timeout | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingRef = useRef<NodeJS.Timeout | null>(null);
  const sessionCreatedRef = useRef(false);

  // ── Task Execution State ──────────────────────────────────────
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [stepStatusOverrides, setStepStatusOverrides] = useState<Map<string, TaskNodeStatus>>(new Map());
  const [stepOutputMap, setStepOutputMap] = useState<Map<string, string>>(new Map());
  const [taskExecutionComplete, setTaskExecutionComplete] = useState(false);

  const chatActive = messages.length > 0;

  const handleCopy = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    } catch {}
  };

  // Fetch user's sessions
  const fetchSessions = async () => {
    if (!user) return;
    setLoadingSessions(true);
    try {
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/sessions", { headers });
      const data = await res.json();
      if (data.sessions) setSessions(data.sessions);
    } catch {}
    setLoadingSessions(false);
  };

  useEffect(() => {
    if (user) fetchSessions();
  }, [user]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingText]);

  // Typewriter effect
  useEffect(() => {
    if (typingIdx === null) return;
    const fullText = messages[typingIdx]?.content;
    if (!fullText) return;

    if (fullText.length < 6 || fullText.includes("Limit") || fullText.includes("সমস্যা") ||
        fullText.includes("\\frac") || fullText.includes("\\sqrt") || fullText.includes("\\sum") ||
        fullText.includes("\\int") || fullText.includes("\\alpha") || fullText.includes("\\beta") ||
        fullText.includes("$$") || fullText.includes("\\(") || fullText.includes("\\[") ||
        /\$[^$]+\$/.test(fullText)) {
      setTypingText(fullText);
      setTypingIdx(null);
      return;
    }

    setTypingText("");
    let pos = 0;
    typingRef.current = setInterval(() => {
      pos += 1;
      if (pos >= fullText.length) {
        pos = fullText.length;
        clearInterval(typingRef.current!);
        setTypingText(fullText);
        setTimeout(() => setTypingIdx(null), 150);
      } else {
        setTypingText(fullText.slice(0, pos));
      }
    }, 15);

    return () => { if (typingRef.current) clearInterval(typingRef.current); };
  }, [typingIdx, messages]);

  // Create new session
  const createSession = async (title: string): Promise<string | null> => {
    if (!user) return null;
    try {
      const token = await getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/sessions", {
        method: "POST",
        headers,
        body: JSON.stringify({ title }),
      });
      const data = await res.json();
      if (data.session) {
        setSessions((prev) => [data.session, ...prev]);
        return data.session.id;
      }
    } catch {}
    return null;
  };

  // Load session messages
  const loadSession = async (sid: string) => {
    try {
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/sessions/${sid}`, { headers });
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
        setSessionId(sid);
      }
    } catch {}
  };

  // Start new chat
  const startNewChat = () => {
    if (typingRef.current) clearInterval(typingRef.current);
    setTypingIdx(null);
    setTypingText("");
    setMessages([]);
    setSessionId(null);
    sessionCreatedRef.current = false;
  };

  const handleSend = async (text?: string) => {
    const msg = text || input.trim();
    if ((!msg && !imagePreview) || sending) return;

    if (typingRef.current) clearInterval(typingRef.current);
    setTypingIdx(null);
    setTypingText("");

    const userMsg = msg || "এই ছবিটি দেখো ও বর্ণনা করো";
    const imageToSend = imagePreview;
    setInput("");
    setImagePreview(null);
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: msg || "🖼️ ছবি পাঠানো হয়েছে",
        ...(imageToSend ? { image: imageToSend } : {}),
      },
    ]);
    setSending(true);
    setSearchComplete(null);
    if (searchCompleteRef.current) clearTimeout(searchCompleteRef.current);

    // Auto-create session on first message
    let activeSessionId = sessionId;
    if (user && !activeSessionId && !sessionCreatedRef.current) {
      sessionCreatedRef.current = true;
      const title = (msg || "Image chat").slice(0, 50);
      activeSessionId = await createSession(title);
      if (activeSessionId) setSessionId(activeSessionId);
    }

    try {
      const token = await getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
            message: userMsg,
            sessionId: activeSessionId,
            mode,
            image: imageToSend || null,
            guestMemory: !user ? loadGuestMemory() : undefined,
          }),
      });

      const data = await res.json();

      if (res.status === 429) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.error || "Limit shesheche!" }]);
        return;
      }

      if (!res.ok) throw new Error(data.error || "সার্ভার সমস্যা");

      setMessages((prev) => {
        const next = [...prev, {
          role: "assistant" as const,
          content: data.response,
          ...(data.sources ? { sources: data.sources } : {}),
          ...(data.taskGraph ? { taskGraph: data.taskGraph } : {}),
          ...(data.taskClarification ? { taskClarification: data.taskClarification } : {}),
        }];
        setTimeout(() => setTypingIdx(next.length - 1), 50);
        return next;
      });

      if (data.sources && data.sources.length > 0) {
        setSearching(false);
        setSearchComplete(data.sources.length);
        if (data.searchComplexity) setSearchComplexity(data.searchComplexity);
        searchCompleteRef.current = setTimeout(() => setSearchComplete(null), 3000);
      } else {
        setSearching(false);
      }

      // Save to guest memory (localStorage) for non-logged-in users
      if (!user && data.response) {
        const mem = loadGuestMemory();
        mem.push({ role: "user", content: userMsg });
        mem.push({ role: "assistant", content: data.response });
        saveGuestMemory(mem);
      }
    } catch (err: any) {
      setSearching(false);
      setMessages((prev) => [...prev, { role: "assistant", content: err.message || "কিছু সমস্যা হয়েছে।" }]);
    } finally {
      setSending(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("ছবির সাইজ ৫MB এর বেশি হতে পারবে না।"); return; }
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0f]">
        <div className="flex flex-col items-center gap-3">
          <img src="/logo-source.png" alt="CholoShikhi" className="w-12 h-12 rounded-xl object-contain shadow-lg shadow-violet-500/25" />
          <div className="w-5 h-5 border-2 border-gray-600 border-t-violet-400 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const isDesktop = !!(globalThis as any).electronAPI?.isElectron;

  return (
    <ViewTransition enter="page-enter" default="none">
    <div className="flex h-screen bg-[#0a0a0f] overflow-hidden">
      {/* ===== SIDEBAR (web/mobile only) ===== */}
      {!isDesktop && (
      <AppSidebar
        onNewChat={startNewChat}
        onLoadSession={loadSession}
        activeSessionId={sessionId}
        sessions={sessions}
        loadingSessions={loadingSessions}
        onFetchSessions={fetchSessions}
      />
      )}

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header — Desktop: drag region + logo + window controls */}
        {isDesktop ? (
          <header
            className="flex items-center justify-between px-4 h-12 border-b border-white/[0.04] shrink-0 bg-[#0d0d14]/80 backdrop-blur-xl select-none"
            style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
          >
            {/* Left: logo */}
            <div className="flex items-center gap-2.5" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
              <img src="/logo-source.png" alt="CholoShikhi" className="w-7 h-7 rounded-lg object-contain shadow-lg shadow-violet-500/25" />
              <span className="text-[12px] font-semibold text-white/90 tracking-wide">CholoShikhi</span>
            </div>

            {/* Center: empty drag zone */}
            <div className="flex-1" />

            {/* Right: login + window controls */}
            <div className="flex items-center gap-1" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
              {/* Login button */}
              {user ? (
                <button
                  onClick={signOut}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] text-gray-400 hover:text-white hover:bg-white/[0.06] transition-all mr-2"
                  title="লগআউট"
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-[8px] font-bold">
                    {user.name?.[0] || user.email?.[0] || "U"}
                  </div>
                  <span className="hidden lg:inline">{user.email?.split("@")[0]}</span>
                </button>
              ) : (
                <button
                  onClick={signInWithGoogle}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] text-gray-400 hover:text-violet-400 hover:bg-white/[0.06] transition-all mr-2"
                  title="লগইন"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>লগইন</span>
                </button>
              )}
              <button
                onClick={() => (window as any).electronAPI?.minimize()}
                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-300 hover:bg-white/[0.06] rounded transition-all"
              >
                <svg width="10" height="10" viewBox="0 0 12 12"><rect y="5.5" width="12" height="1" fill="currentColor"/></svg>
              </button>
              <button
                onClick={() => (window as any).electronAPI?.maximize()}
                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-300 hover:bg-white/[0.06] rounded transition-all"
              >
                <svg width="10" height="10" viewBox="0 0 12 12"><rect x="1" y="1" width="10" height="10" stroke="currentColor" strokeWidth="1" fill="none"/></svg>
              </button>
              <button
                onClick={() => (window as any).electronAPI?.close()}
                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-white hover:bg-red-600 rounded transition-all"
              >
                <svg width="10" height="10" viewBox="0 0 12 12"><line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" strokeWidth="1.2"/><line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" strokeWidth="1.2"/></svg>
              </button>
            </div>
          </header>
        ) : (
        /* Header — Web/Mobile: mode toggle in center */
        <header className="flex items-center justify-between px-4 h-14 border-b border-white/[0.04] shrink-0 bg-[#0d0d14]/80 backdrop-blur-xl">
          {/* Left: mobile spacer for hamburger */}
          <div className="w-9 md:w-0" />

          {/* Center: Mode Toggle */}
          <div className="flex items-center bg-[#141420] border border-white/[0.08] rounded-full p-0.5 shadow-inner">
            <button
              onClick={() => setMode("normal")}
              className={`px-4 py-1.5 text-[11px] font-medium rounded-full transition-all ${
                mode === "normal"
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25"
                  : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"
              }`}>
              Normal
            </button>
            <button
              onClick={() => setMode("education")}
              className={`px-4 py-1.5 text-[11px] font-medium rounded-full transition-all flex items-center gap-1.5 ${
                mode === "education"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25"
                  : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"
              }`}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              Shikkhok
            </button>
            <button
              onClick={() => setMode("taskplan")}
              className={`px-4 py-1.5 text-[11px] font-medium rounded-full transition-all flex items-center gap-1.5 ${
                mode === "taskplan"
                  ? "bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md shadow-sky-500/25"
                  : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"
              }`}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
              Task
            </button>
          </div>

          {/* Right: user info */}
          <div className="flex items-center gap-3">
            {user && (
              <span className="text-[10px] text-gray-500 hidden lg:block">{user.email}</span>
            )}
          </div>
        </header>
        )}

        {/* Messages or Welcome */}
        {chatActive ? (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
              {messages.map((msg, i) => {
                const isTyping = typingIdx === i;
                const rawText = isTyping ? typingText : msg.content;
                const displayText = msg.role === "assistant" ? sanitizeDisplayText(rawText) : rawText;
                return (
                <div key={i} className={`mb-3 group/msg flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <img src="/icons/icon-192.png" alt="AI" className="w-6 h-6 rounded-md mr-2 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="relative max-w-[80%]">
                    <div className={`px-4 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-2xl rounded-br-md shadow-lg shadow-violet-500/10"
                        : "text-gray-300 rounded-2xl rounded-bl-md bg-white/[0.04] border border-white/[0.04]"
                    }`}>
                      {msg.image && <img src={msg.image} alt="" className="mb-2 rounded-xl max-h-48 object-cover" />}
                    {msg.role === "assistant" ? (
                      <RenderMessage text={displayText} />
                    ) : (
                      displayText
                    )}
                    {isTyping && <span className="inline-block w-[2px] h-3.5 bg-violet-400 ml-0.5 align-middle animate-pulse" />}
                    </div>
                    <button
                      onClick={() => handleCopy(displayText, i)}
                      className={`absolute -bottom-5 ${msg.role === "user" ? "right-0" : "left-8"} opacity-0 group-hover/msg:opacity-100 transition-opacity text-gray-600 hover:text-gray-400`}
                      title="Copy">
                      {copiedIdx === i ? (
                        <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      )}
                    </button>
                    {msg.sources && msg.sources.length > 0 && (
                      <SourcesCard sources={msg.sources} />
                    )}
                    {msg.taskGraph && (
                      <>
                        <TaskFlowChart
                          graph={msg.taskGraph}
                          stepStatusOverrides={stepStatusOverrides}
                          stepOutputs={stepOutputMap}
                        />
                        <TaskExecutionPanel
                          graph={msg.taskGraph}
                          executionId={executionId}
                          userId={user?.id || ""}
                          onExecutionStart={(id) => setExecutionId(id)}
                          onStepStatusChange={(stepId, status, output) => {
                            setStepStatusOverrides((prev) => {
                              const next = new Map(prev);
                              next.set(stepId, status);
                              return next;
                            });
                            if (output) {
                              setStepOutputMap((prev) => {
                                const next = new Map(prev);
                                next.set(stepId, output);
                                return next;
                              });
                            }
                          }}
                          onAllComplete={() => setTaskExecutionComplete(true)}
                        />
                      </>
                    )}
                    {msg.taskClarification && (
                      <div className="mt-3 border border-amber-500/20 rounded-2xl bg-amber-500/[0.04] p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-amber-400 text-[11px]">{"\uD83D\uDCAC"}</span>
                          <p className="text-[11px] font-medium text-amber-400">{"\u0986\u09B0\u09CB \u09A4\u09A5\u09CD\u09AF \u09A6\u09B0\u0995\u09BE\u09B0"}</p>
                        </div>
                        <div className="space-y-3">
                          {msg.taskClarification.questions.map((q, qi) => (
                            <div key={q.id} className="rounded-xl bg-amber-500/[0.03] border border-amber-500/10 p-3">
                              <div className="flex items-start gap-2.5">
                                <div className="w-5 h-5 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <span className="text-[9px] font-bold text-amber-400">{qi + 1}</span>
                                </div>
                                <div className="flex-1">
                                  <p className="text-[12px] text-white/90 leading-snug">{q.question}</p>
                                  <p className="text-[10px] text-gray-500 mt-0.5">{q.why}</p>
                                </div>
                              </div>
                              {q.options && q.options.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2 ml-7">
                                  {q.options.map((opt) => (
                                    <button
                                      key={opt}
                                      onClick={() => {
                                        const answer = `${q.question}\n\nMy answer: ${opt}`;
                                        setInput(answer);
                                        setTimeout(() => handleSend(answer), 100);
                                      }}
                                      className="px-2.5 py-1 text-[10px] text-amber-300/80 bg-amber-500/[0.08] border border-amber-500/15 rounded-lg hover:bg-amber-500/[0.15] hover:text-amber-200 transition-all"
                                    >
                                      {opt}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-gray-600 mt-3 border-t border-amber-500/10 pt-2">
                          {"\u09A1\u09BE\u09A4\u09BE \u09A6\u09BF\u09AF\u09BC\u09C7 \u0986\u09AC\u09BE\u09B0 Task mode-\u09A4\u09C7 \u09AA\u09BE\u09A0\u09BE\u09A4\u09C7 \u2014 \u09A4\u09BE\u09B9\u09B2\u09C7 customized plan \u09AA\u09BE\u09AC\u09C7\u0964"}
                        </p>
                      </div>
                    )}
                    {searchComplete !== null && i === messages.length - 1 && msg.role === "assistant" && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-[9px] text-emerald-400/70 animate-[fadeout_3s_ease-in_forwards]">
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        <span>Web search complete · {searchComplete} source{searchComplete > 1 ? "s" : ""}</span>
                      </div>
                    )}
                  </div>
                </div>
                );
              })}
              {sending && (
                <div className="flex justify-start">
                  <img src="/icons/icon-192.png" alt="AI" className="w-6 h-6 rounded-md mr-2 mt-0.5 flex-shrink-0" />
                  <div className="px-3 py-2.5">
                    {mode === "taskplan" ? (
                      <div className="flex items-center gap-2 text-[11px] text-sky-400/70">
                        <div className="flex gap-0.5">
                          <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" />
                          <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                          <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                        </div>
                        <span>Building your plan...</span>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce [animation-delay:0.1s]" />
                        <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>
        ) : (
          /* ===== WELCOME STATE ===== */
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            <div className="mb-6 relative">
              <img src="/logo-source.png" alt="CholoShikhi" className="w-16 h-16 rounded-2xl object-contain shadow-2xl shadow-violet-500/25" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#0a0a0f] shadow-md" />
            </div>
            <p className="text-gray-200 text-lg font-medium mb-1">{getGreeting()}{user ? `, ${user.name || "বন্ধু"}` : ""}</p>
            {mode === "education" ? (
              <p className="text-emerald-400/70 text-xs mb-6">Education Mode — আমি তোমার ব্যক্তিগত শিক্ষক</p>
            ) : mode === "taskplan" ? (
              <p className="text-sky-400/70 text-xs mb-6">Task Mode — জটিল কাজ বুঝি, গবেষণা করি, পরিকল্পনা তৈরি করি</p>
            ) : (
              <p className="text-gray-500 text-xs mb-6">আমি CholoShikhi — তোমার AI সহকারী</p>
            )}
          </div>
        )}

        {/* ===== INPUT AREA ===== */}
        <div className="px-4 pb-4 md:pb-6 shrink-0">
          <div className="max-w-2xl mx-auto">
            {/* Suggestions */}
            {!chatActive && (
              <div className="flex items-center justify-center gap-2 mb-3 flex-wrap">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => handleSend(s.text)}
                    className="px-3.5 py-1.5 text-[11px] text-gray-400 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:bg-white/[0.06] hover:text-gray-300 hover:border-violet-500/20 transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <span>{s.icon}</span>
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            {/* Desktop Mode Toggle (integrated into input area) */}
            {isDesktop && (
              <div className="flex items-center gap-1 mb-2 px-1">
                <svg className="w-3 h-3 text-gray-600 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                <button onClick={() => setMode("normal")}
                  className={`px-3 py-1.5 text-[10px] font-medium rounded-xl transition-all ${mode === "normal" ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25" : "text-gray-600 hover:text-gray-400 hover:bg-white/[0.04]"}`}>
                  Normal
                </button>
                <button onClick={() => setMode("education")}
                  className={`px-3 py-1.5 text-[10px] font-medium rounded-xl transition-all ${mode === "education" ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25" : "text-gray-600 hover:text-gray-400 hover:bg-white/[0.04]"}`}>
                  Shikkhok
                </button>
                <button onClick={() => setMode("taskplan")}
                  className={`px-3 py-1.5 text-[10px] font-medium rounded-xl transition-all ${mode === "taskplan" ? "bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md shadow-sky-500/25" : "text-gray-600 hover:text-gray-400 hover:bg-white/[0.04]"}`}>
                  Task
                </button>
              </div>
            )}

            {/* Image Preview */}
            {imagePreview && (
              <div className="mb-2 flex items-center gap-2">
                <img src={imagePreview} alt="" className="h-14 rounded-lg object-cover border border-white/[0.1]" />
                <button onClick={() => setImagePreview(null)} className="text-gray-600 hover:text-red-400 text-xs transition-colors">✕</button>
              </div>
            )}

            {/* Input Box */}
            <div className="relative flex items-center bg-[#141420] border border-white/[0.08] rounded-2xl px-4 py-3 focus-within:border-violet-500/30 focus-within:shadow-lg focus-within:shadow-violet-500/5 transition-all">
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
              <button onClick={() => fileRef.current?.click()} disabled={sending}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-500 hover:text-violet-400 hover:bg-white/[0.04] transition-all disabled:opacity-40 mr-1 flex-shrink-0"
                title="ছবি">
                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </button>
              {/* Emoji Button */}
              <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} disabled={sending}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-500 hover:text-violet-400 hover:bg-white/[0.04] transition-all disabled:opacity-40 mr-1 flex-shrink-0"
                title="Emoji">
                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </button>
              {showEmojiPicker && (
                <EmojiPicker
                  onSelect={(emoji) => setInput((prev) => prev + emoji)}
                  onClose={() => setShowEmojiPicker(false)}
                />
              )}
              <input ref={inputRef} type="text" value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder={mode === "education" ? "কোনো বিষয় শিখতে চাও? প্রশ্ন করো..." : mode === "taskplan" ? "কোনো বড় কাজ আছে? বিস্তারিত লিখো..." : "কিছু জিজ্ঞাসা করো..."}
                disabled={sending}
                className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none text-sm disabled:opacity-40"
              />
              <button onClick={() => handleSend()} disabled={(!input.trim() && !imagePreview) || sending}
                className={`ml-2 w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
                  (input.trim() || imagePreview) && !sending
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105"
                    : "bg-white/[0.04] text-gray-700 cursor-not-allowed"
                }`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            </div>

            {/* Model badge */}
            <div className="flex items-center justify-center mt-2">
              <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
                <span className={`w-1.5 h-1.5 rounded-full ${mode === "education" ? "bg-emerald-500" : mode === "taskplan" ? "bg-sky-500" : "bg-violet-500"}`} />
                {mode === "education" ? "CholoShikhi Shikkhok" : mode === "taskplan" ? "CholoShikhi Task Planner" : "CholoShikhi 1.0"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </ViewTransition>
  );
}
