"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import RenderMessage from "@/components/RenderMessage";

interface Message {
  role: "user" | "assistant";
  content: string;
  image?: string;
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
  { icon: "📝", label: "Help", text: "/help" },
];

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

export default function ChatPage() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [typingIdx, setTypingIdx] = useState<number | null>(null);
  const [typingText, setTypingText] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [mode, setMode] = useState<"normal" | "education">("normal");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingRef = useRef<NodeJS.Timeout | null>(null);
  const sessionCreatedRef = useRef(false);

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
      const res = await fetch("/api/sessions", {
        headers: { "x-user-id": user.id },
      });
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
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, title }),
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
      const res = await fetch(`/api/sessions/${sid}`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
        setSessionId(sid);
        setShowHistory(false);
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
    setShowHistory(false);
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

    // Auto-create session on first message (with first message as title)
    let activeSessionId = sessionId;
    if (user && !activeSessionId && !sessionCreatedRef.current) {
      sessionCreatedRef.current = true;
      const title = (msg || "Image chat").slice(0, 50);
      activeSessionId = await createSession(title);
      if (activeSessionId) setSessionId(activeSessionId);
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            message: userMsg,
            userId: user?.id || null,
            sessionId: activeSessionId,
            mode,
            image: imageToSend || null,
          }),
      });

      const data = await res.json();

      if (res.status === 429) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.error || "Limit shesheche!" }]);
        return;
      }

      if (!res.ok) throw new Error(data.error || "সার্ভার সমস্যা");

      setMessages((prev) => {
        const next = [...prev, { role: "assistant" as const, content: data.response }];
        setTimeout(() => setTypingIdx(next.length - 1), 50);
        return next;
      });
    } catch (err: any) {
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

  const deleteSession = async (sid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/sessions/${sid}`, { method: "DELETE" });
      setSessions((prev) => prev.filter((s) => s.id !== sid));
      if (sessionId === sid) startNewChat();
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0f0f14]">
        <div className="w-7 h-7 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0f0f14]">
      {/* ===== SIDEBAR ===== */}
      <aside className="hidden md:flex flex-col w-[60px] border-r border-white/[0.06] py-4 items-center gap-4">
        <Link href="/" className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center hover:opacity-80 transition-opacity">
          <span className="text-white text-xs font-bold">চ</span>
        </Link>

        <div className="flex flex-col items-center gap-3 mt-4">
          <button onClick={startNewChat}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/[0.06] transition-all"
            title="নতুন চ্যাট">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </button>
          <button
            onClick={() => { setShowHistory(!showHistory); if (user) fetchSessions(); }}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${showHistory ? "text-white bg-white/[0.06]" : "text-gray-500 hover:text-white hover:bg-white/[0.06]"}`}
            title="History">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </button>
        </div>

        <div className="mt-auto">
          {user ? (
            <button onClick={signOut} className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-[10px] font-bold hover:bg-violet-500 transition-colors" title="লগআউট">
              {user.name?.[0] || user.email?.[0] || "U"}
            </button>
          ) : (
            <Link href="/" className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-gray-500 hover:text-white transition-colors" title="হোম">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            </Link>
          )}
        </div>
      </aside>

      {/* ===== HISTORY PANEL ===== */}
      {showHistory && (
        <div className="hidden md:flex flex-col w-[240px] border-r border-white/[0.06] bg-[#12121a]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <span className="text-xs font-medium text-gray-400">চ্যাট ইতিহাস</span>
            <button onClick={() => setShowHistory(false)} className="text-gray-600 hover:text-gray-400 text-xs">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {!user ? (
              <p className="text-gray-600 text-[11px] p-4 text-center">লগইন করুন</p>
            ) : loadingSessions ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-gray-600 text-[11px] p-4 text-center">কোনো চ্যাট নেই</p>
            ) : (
              sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => loadSession(s.id)}
                  className={`w-full text-left px-4 py-2.5 border-b border-white/[0.03] hover:bg-white/[0.04] transition-colors group ${sessionId === s.id ? "bg-white/[0.06]" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-gray-300 truncate flex-1">{s.title}</p>
                    <button
                      onClick={(e) => deleteSession(s.id, e)}
                      className="text-gray-700 hover:text-red-400 text-[10px] ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="মুছুন">
                      ✕
                    </button>
                  </div>
                  <p className="text-[9px] text-gray-600 mt-0.5">{formatDate(s.updated_at)}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* ===== MOBILE HISTORY DRAWER ===== */}
      {showHistory && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowHistory(false)} />
          <div className="relative w-[260px] bg-[#12121a] border-r border-white/[0.06] flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <span className="text-xs font-medium text-gray-400">চ্যাট ইতিহাস</span>
              <button onClick={() => setShowHistory(false)} className="text-gray-600 hover:text-gray-400 text-xs">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {!user ? (
                <p className="text-gray-600 text-[11px] p-4 text-center">লগইন করুন</p>
              ) : sessions.length === 0 ? (
                <p className="text-gray-600 text-[11px] p-4 text-center">কোনো চ্যাট নেই</p>
              ) : (
                sessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => loadSession(s.id)}
                    className={`w-full text-left px-4 py-2.5 border-b border-white/[0.03] hover:bg-white/[0.04] transition-colors group ${sessionId === s.id ? "bg-white/[0.06]" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-gray-300 truncate flex-1">{s.title}</p>
                      <button
                        onClick={(e) => deleteSession(s.id, e)}
                        className="text-gray-700 hover:text-red-400 text-[10px] ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        ✕
                      </button>
                    </div>
                    <p className="text-[9px] text-gray-600 mt-0.5">{formatDate(s.updated_at)}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== MAIN ===== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 h-12 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2">
            <Link href="/" className="md:hidden w-7 h-7 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white text-[9px] font-bold">চ</span>
            </Link>
            <button onClick={startNewChat} className="md:hidden text-gray-500 hover:text-white transition-colors" title="নতুন চ্যাট">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </button>
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center bg-[#1a1a24] border border-white/[0.08] rounded-full p-0.5">
            <button
              onClick={() => setMode("normal")}
              className={`px-3 py-1 text-[10px] font-medium rounded-full transition-all ${
                mode === "normal"
                  ? "bg-violet-600 text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}>
              Normal
            </button>
            <button
              onClick={() => setMode("education")}
              className={`px-3 py-1 text-[10px] font-medium rounded-full transition-all flex items-center gap-1 ${
                mode === "education"
                  ? "bg-emerald-600 text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              Shikkhok
            </button>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <span className="text-[10px] text-gray-500">{user.email}</span>
            )}
          </div>
        </header>

        {/* Messages */}
        {chatActive ? (
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="max-w-2xl mx-auto space-y-4">
              {messages.map((msg, i) => {
                const isTyping = typingIdx === i;
                const displayText = isTyping ? typingText : msg.content;
                return (
                <div key={i} className={`mb-3 group/msg flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                      <span className="text-white text-[8px] font-bold">চ</span>
                    </div>
                  )}
                  <div className="relative max-w-[80%]">
                    <div className={`px-4 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-violet-600 text-white rounded-2xl rounded-br-md"
                        : "text-gray-300 rounded-2xl rounded-bl-md"
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
                  </div>
                </div>
                );
              })}
              {sending && (
                <div className="flex justify-start">
                  <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                    <span className="text-white text-[8px] font-bold">চ</span>
                  </div>
                  <div className="px-3 py-2.5">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:0.1s]" />
                      <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>
        ) : (
          /* ===== LANDING STATE ===== */
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            <p className="text-gray-300 text-xl font-medium mb-2">{getGreeting()}{user ? `, ${user.name || "বন্ধু"}` : ""}</p>
            {mode === "education" && (
              <p className="text-emerald-400/70 text-xs">Education Mode — আমি তোমার ব্যক্তিগত শিক্ষক</p>
            )}
          </div>
        )}

        {/* ===== INPUT AREA ===== */}
        <div className="px-4 pb-4 md:pb-6 shrink-0">
          <div className="max-w-2xl mx-auto">
            {/* Suggestions (show when no messages) */}
            {!chatActive && (
              <div className="flex items-center justify-center gap-2 mb-3 flex-wrap">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => handleSend(s.text)}
                    className="px-3 py-1.5 text-[11px] text-gray-400 bg-white/[0.04] border border-white/[0.08] rounded-full hover:bg-white/[0.08] hover:text-gray-300 transition-all flex items-center gap-1.5"
                  >
                    <span>{s.icon}</span>
                    {s.label}
                  </button>
                ))}
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
            <div className="flex items-center bg-[#1a1a24] border border-white/[0.08] rounded-2xl px-4 py-3 focus-within:border-white/[0.15] transition-colors">
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
              <button onClick={() => fileRef.current?.click()} disabled={sending}
                className="text-gray-500 hover:text-violet-400 transition-colors disabled:opacity-40 mr-2 flex-shrink-0"
                title="ছবি">
                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </button>
              <input ref={inputRef} type="text" value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder={mode === "education" ? "কোনো বিষয় শিখতে চাও? প্রশ্ন করো..." : "কিছু জিজ্ঞাসা করো..."}
                disabled={sending}
                className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none text-sm disabled:opacity-40"
              />
              <button onClick={() => handleSend()} disabled={(!input.trim() && !imagePreview) || sending}
                className="ml-2 w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center text-white hover:bg-violet-500 disabled:opacity-20 disabled:cursor-not-allowed transition-all flex-shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            </div>

            {/* Model badge */}
            <div className="flex items-center justify-center mt-2">
              <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
                <span className={`w-1.5 h-1.5 rounded-full ${mode === "education" ? "bg-emerald-500" : "bg-violet-500"}`} />
                {mode === "education" ? "CholoShikhi Shikkhok" : "CholoShikhi 1.0"}
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
