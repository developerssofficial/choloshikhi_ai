"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import ChatModal from "@/components/ChatModal";

interface Message {
  role: "user" | "assistant";
  content: string;
  image?: string;
}

const GUEST_LIMIT = 15;
const GUEST_KEY = "guest_msg_count";
const GUEST_DATE_KEY = "guest_msg_date";

function getGuestCount(): number {
  if (typeof window === "undefined") return 0;
  const today = new Date().toISOString().split("T")[0];
  const storedDate = localStorage.getItem(GUEST_DATE_KEY);
  if (storedDate !== today) {
    localStorage.setItem(GUEST_DATE_KEY, today);
    localStorage.setItem(GUEST_KEY, "0");
    return 0;
  }
  return parseInt(localStorage.getItem(GUEST_KEY) || "0", 10);
}

function addGuestCount(): number {
  if (typeof window === "undefined") return 0;
  const count = getGuestCount() + 1;
  localStorage.setItem(GUEST_KEY, String(count));
  return count;
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

export default function ChatPage() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [todayUsage, setTodayUsage] = useState(0);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [typingIdx, setTypingIdx] = useState<number | null>(null);
  const [typingText, setTypingText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingRef = useRef<NodeJS.Timeout | null>(null);

  const guestRemaining = GUEST_LIMIT - getGuestCount();
  const isGuest = !user;
  const isBlocked = isGuest && guestRemaining <= 0;
  const chatActive = messages.length > 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingText]);

  // Typewriter effect for AI responses
  useEffect(() => {
    if (typingIdx === null) return;
    const fullText = messages[typingIdx]?.content;
    if (!fullText) return;

    // Short or error messages — skip animation
    if (fullText.length < 6 || fullText.includes("Limit") || fullText.includes("সমস্যা")) {
      setTypingText(fullText);
      setTypingIdx(null);
      return;
    }

    setTypingText("");
    let pos = 0;
    typingRef.current = setInterval(() => {
      pos += 3; // 3 chars per tick for Bengali
      if (pos >= fullText.length) {
        pos = fullText.length;
        clearInterval(typingRef.current!);
        setTypingText(fullText);
        setTimeout(() => setTypingIdx(null), 150);
      } else {
        setTypingText(fullText.slice(0, pos));
      }
    }, 18);

    return () => { if (typingRef.current) clearInterval(typingRef.current); };
  }, [typingIdx, messages]);

  const handleSend = async (text?: string) => {
    const msg = text || input.trim();
    if ((!msg && !imagePreview) || sending || isBlocked) return;

    // Clear any ongoing typewriter animation
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

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          userId: user?.id || null,
          image: imageToSend || null,
        }),
      });

      const data = await res.json();

      if (res.status === 429) {
        if (!user) {
          addGuestCount();
          setShowModal(true);
        }
        setMessages((prev) => [...prev, { role: "assistant", content: data.error || "Limit shesheche!" }]);
        return;
      }

      if (!res.ok) throw new Error(data.error || "সার্ভার সমস্যা");

      setMessages((prev) => {
        const next = [...prev, { role: "assistant" as const, content: data.response }];
        setTimeout(() => setTypingIdx(next.length - 1), 50);
        return next;
      });
      user ? setTodayUsage((p) => p + 1) : addGuestCount();
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

  const handleLogin = () => { setShowModal(false); signInWithGoogle(); };

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
          <Link href="/chat"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/[0.06] transition-all"
            title="নতুন চ্যাট">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </Link>
          <button
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/[0.06] transition-all"
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

      {/* ===== MAIN ===== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 h-12 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2 md:hidden">
            <Link href="/" className="w-7 h-7 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white text-[9px] font-bold">চ</span>
            </Link>
          </div>
          <h2 className="text-xs font-medium text-gray-400">চলো শিখি Ai</h2>
          <div className="flex items-center gap-3">
            {user ? (
              <span className="text-[10px] text-gray-500">{todayUsage}<span className="text-gray-600">/50</span></span>
            ) : (
              <span className="text-[10px] text-gray-500">{guestRemaining > 0 ? `${guestRemaining} free` : "limit done"}</span>
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
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                      <span className="text-white text-[8px] font-bold">চ</span>
                    </div>
                  )}
                  <div className={`max-w-[80%] px-4 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-violet-600 text-white rounded-2xl rounded-br-md"
                      : "text-gray-300 rounded-2xl rounded-bl-md"
                  }`}>
                    {msg.image && <img src={msg.image} alt="" className="mb-2 rounded-xl max-h-48 object-cover" />}
                    {displayText}
                    {isTyping && <span className="inline-block w-[2px] h-3.5 bg-violet-400 ml-0.5 align-middle animate-pulse" />}
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
            <p className="text-gray-300 text-xl font-medium mb-8">{getGreeting()}{user ? `, ${user.name || "বন্ধু"}` : ""}</p>
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
              <button onClick={() => fileRef.current?.click()} disabled={sending || isBlocked}
                className="text-gray-500 hover:text-violet-400 transition-colors disabled:opacity-40 mr-2 flex-shrink-0"
                title="ছবি">
                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </button>
              <input ref={inputRef} type="text" value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder={isBlocked ? "লগইন করুন..." : "কিছু জিজ্ঞাসা করো..."}
                disabled={sending || isBlocked}
                className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none text-sm disabled:opacity-40"
              />
              <button onClick={() => handleSend()} disabled={(!input.trim() && !imagePreview) || sending || isBlocked}
                className="ml-2 w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center text-white hover:bg-violet-500 disabled:opacity-20 disabled:cursor-not-allowed transition-all flex-shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            </div>

            {/* Model badge */}
            <div className="flex items-center justify-center mt-2">
              <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                CholoShikhi 1.0
              </div>
            </div>
          </div>
        </div>
      </div>

      {showModal && <ChatModal onLogin={handleLogin} onClose={() => setShowModal(false)} />}
    </div>
  );
}