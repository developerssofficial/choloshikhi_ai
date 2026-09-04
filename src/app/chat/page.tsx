"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import RenderMessage from "@/components/RenderMessage";
import TaskFlowChart from "@/components/TaskFlowChart";
import TaskExecutionPanel from "@/components/TaskExecutionPanel";
import AppSidebar from "@/components/AppSidebar";
import EmojiPicker from "@/components/EmojiPicker";
import ContextInspectorModal from "@/components/ContextInspectorModal";
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

const PROMPT_MODIFIERS = [
  { label: "⚡ সহজ ভাষায়", prefix: "সহজ ও প্রাঞ্জল ভাষায় ছোট করে বুঝিয়ে দাও: " },
  { label: "🔍 বিস্তারিত ব্যাখ্যা", prefix: "বাস্তব উদাহরণ ও গভীর বিশ্লেষণসহ সম্পূর্ণ বুঝিয়ে দাও: " },
  { label: "📐 স্টেপ-বাই-স্টেপ", prefix: "প্রতিটি ধাপ ও সূত্র স্পষ্টভাবে উল্লেখ করে স্টেপ-বাই-স্টেপ সমাধান করো: " },
  { label: "📝 সারাংশ", prefix: "এর মূল বিষয়বস্তু ও সারাংশ বুলেট পয়েন্ট আকারে দাও: " },
  { label: "💡 পরীক্ষার জন্য গুরুত্বপূর্ণ", prefix: "পরীক্ষায় ভালো নম্বর পাওয়ার উপযোগী উত্তর ও গুরুত্বপূর্ণ পয়েন্টগুলো তুলে ধরো: " },
  { label: "🎯 MCQ কুইজ তৈরি", prefix: "এই বিষয়ের উপর ৫টি গুরুত্বপূর্ণ MCQ প্রশ্ন তৈরি করো এবং নিচে সঠিক উত্তর ও ব্যাখ্যা দাও: " },
  { label: "✍️ CQ সৃজনশীল প্রশ্ন", prefix: "জ্ঞান, অনুধাবন, প্রয়োগ ও উচ্চতর দক্ষতা অনুযায়ী ১টি আদর্শ সৃজনশীল প্রশ্ন ও উত্তর লেখো: " },
  { label: "📊 সূত্রাবলি তালিকা", prefix: "এই অধ্যায়ের সকল প্রয়োজনীয় সূত্র, একক ও প্রতীক এক নজরে তালিকাভুক্ত করো: " },
  { label: "🇬🇧 ব্যাকরণ ও বানান চেক", prefix: "নিচের লেখার গ্রামার ও বানান নির্ভুল করে উন্নত বাক্য গঠন দেখাও: " },
];

const STUDENT_SUBJECTS = [
  { icon: "📐", label: "গণিত", prompt: "গণিতের এই সমস্যাটি প্রতিটি ধাপ ও সূত্রের বিবরণসহ সহজ ভাষায় সমাধান করে দাও: " },
  { icon: "⚡", label: "পদার্থবিজ্ঞান", prompt: "পদার্থবিজ্ঞানের এই সূত্র ও গাণিতিক সমস্যাটি বাস্তব উদাহরণসহ বুঝিয়ে দাও: " },
  { icon: "🧪", label: "রসায়ন", prompt: "এই রাসায়নিক বিক্রিয়া, সমীকরণ সমতাকরণ ও বিক্রিয়ার কারণ বুঝিয়ে দাও: " },
  { icon: "🧬", label: "জীববিজ্ঞান", prompt: "জীববিজ্ঞানের এই প্রক্রিয়া ও গুরুত্বপূর্ণ টার্মগুলো সুন্দর পয়েন্ট আকারে ব্যাখ্যা করো: " },
  { icon: "🇬🇧", label: "English Grammar", prompt: "Help me with English grammar, rules, and example sentences for: " },
  { icon: "🇧🇩", label: "বাংলা ব্যাকরণ", prompt: "বাংলা ২য় পত্রের ব্যাকরণ নিয়ম ও উদাহরণসহ বুঝিয়ে দাও: " },
  { icon: "💻", label: "ICT", prompt: "এইচএসসি ICT এর লজিক গেট, বাইনারি রূপান্তর বা সি প্রোগ্রামিং বুঝিয়ে দাও: " },
  { icon: "🎯", label: "BCS ও জব প্রস্তুতি", prompt: "বিসিএস ও সরকারি চাকরির বিগত বছরের গুরুত্বপূর্ণ প্রশ্ন ও টেকনিক: " },
];

const SUGGESTIONS = [
  { icon: "📐", label: "গণিত সমাধান", text: "দ্বিঘাত সমীকরণ ax² + bx + c = 0 কীভাবে সমাধান করতে হয় উদাহরণসহ দেখাও" },
  { icon: "⚡", label: "পদার্থবিজ্ঞান", text: "নিউটনের গতিসূত্র এবং ভরবেগের সংরক্ষণ সূত্র বাস্তব উদাহরণসহ বুঝিয়ে দাও" },
  { icon: "🧪", label: "রসায়ন বিক্রিয়া", text: "জারণ-বিজারণ বিক্রিয়া ইলেকট্রন স্থানান্তরের মাধ্যমে সহজ ভাষায় ব্যাখ্যা করো" },
  { icon: "🇬🇧", label: "English Grammar", text: "Right form of verbs এবং Modifiers এর নিয়মগুলো সহজ উদাহরণ দিয়ে শেখাও" },
  { icon: "💻", label: "ICT প্রোগ্রামিং", text: "NAND ও NOR গেট দিয়ে কীভাবে মৌলিক গেটগুলো বাস্তবায়ন করা যায়?" },
  { icon: "🎯", label: "MCQ কুইজ টেস্ট", text: "পর্যায় সারণি অধ্যায়ের উপর ৫টি গুরুত্বপূর্ণ বোর্ড স্ট্যান্ডার্ড MCQ কুইজ দাও" },
];

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

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
    <div className="mt-2.5 border border-white/[0.08] rounded-xl overflow-hidden bg-black/20 backdrop-blur-md">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3.5 py-2 text-[11px] text-slate-400 hover:text-white hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <span className="font-medium">{sources.length} টি তথ্যসূত্র (Sources)</span>
        </div>
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-3.5 pb-2.5 pt-1 space-y-1.5 border-t border-white/[0.04]">
          {sources.map((src, j) => (
            <a
              key={j}
              href={src.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 text-[11px] text-slate-400 hover:text-violet-300 py-1 transition-colors group"
            >
              <span className="text-violet-400/70 font-mono text-[10px] mt-0.5">[{j + 1}]</span>
              <div className="min-w-0">
                <p className="truncate group-hover:underline text-slate-300">{src.title}</p>
                <p className="text-[9px] text-slate-500 truncate">{getDomain(src.url)}</p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function sanitizeDisplayText(text: string): string {
  if (!text) return text;
  let clean = text.replace(/```json\s*[\s\S]*?```/g, "").trim();
  if (/\{\s*"action"\s*:/.test(clean) || /\{\s*"taskGraph"\s*:/.test(clean) || /\{\s*"nodes"\s*:/.test(clean)) {
    clean = clean.replace(/\{[\s\S]*\}/g, "").trim();
  }
  return clean || "";
}

export default function ChatPage() {
  const { user, loading, signInWithGoogle, getToken, isElectron } = useAuth();
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
  const [searchComplete, setSearchComplete] = useState<number | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showPromptModifiers, setShowPromptModifiers] = useState(false);
  const [showContextInspector, setShowContextInspector] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  const searchCompleteRef = useRef<NodeJS.Timeout | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const sessionCreatedRef = useRef(false);

  // Initialize Web Speech API for 100% Free Voice-to-Text
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "bn-BD"; // Bengali (Bangladesh) with natural English support

        recognition.onresult = (event: any) => {
          let currentTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          if (currentTranscript) {
            setInput((prev) => {
              const trimmed = currentTranscript.trim();
              if (!prev) return trimmed;
              if (prev.endsWith(trimmed)) return prev;
              return `${prev} ${trimmed}`;
            });
          }
        };

        recognition.onerror = (event: any) => {
          console.warn("[Voice] Speech recognition error:", event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!speechSupported) {
      alert("আপনার ব্রাউজারে Voice-to-Text সাপোর্ট করে না। দয়া করে Chrome বা Edge ব্রাউজার ব্যবহার করুন।");
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (err) {
        console.warn("[Voice] Start failed:", err);
        setIsListening(false);
      }
    }
  };

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
      setTimeout(() => setCopiedIdx(null), 1800);
    } catch {}
  };

  const fetchSessions = useCallback(async () => {
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
  }, [user, getToken]);

  useEffect(() => {
    if (user) fetchSessions();
  }, [user, fetchSessions]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);

  const handleScrollEvent = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    // If user is more than 150px away from bottom, they have scrolled up intentionally
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
    userScrolledUpRef.current = !isNearBottom;
  }, []);

  // Scroll to bottom only when user sends a message or when response finishes, without fighting user scroll
  useEffect(() => {
    if (!userScrolledUpRef.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages.length]);

  // High Performance Stream Typewriter Effect for CholoShikhi AI
  useEffect(() => {
    if (typingIdx === null) return;
    const fullText = messages[typingIdx]?.content;
    if (!fullText) return;

    if (
      fullText.length < 15 ||
      fullText.includes("$$") ||
      fullText.includes("\\(") ||
      fullText.includes("\\[") ||
      fullText.includes("\\frac") ||
      fullText.includes("```") ||
      /\$[^$]+\$/.test(fullText)
    ) {
      setTypingText(fullText);
      setTypingIdx(null);
      return;
    }

    setTypingText("");
    let currentLength = 0;
    const totalLength = fullText.length;
    const chunkSize = totalLength > 400 ? 6 : totalLength > 150 ? 3 : 2;

    const streamChunk = () => {
      currentLength = Math.min(currentLength + chunkSize, totalLength);
      setTypingText(fullText.slice(0, currentLength));

      if (currentLength < totalLength) {
        animationFrameRef.current = requestAnimationFrame(streamChunk);
      } else {
        setTypingIdx(null);
      }
    };

    animationFrameRef.current = requestAnimationFrame(streamChunk);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [typingIdx, messages]);

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

  const startNewChat = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    setTypingIdx(null);
    setTypingText("");
    setMessages([]);
    setSessionId(null);
    sessionCreatedRef.current = false;
  };

  const handleSend = async (text?: string) => {
    const msg = text || input.trim();
    if ((!msg && !imagePreview) || sending) return;

    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    setTypingIdx(null);
    setTypingText("");

    const userMsg = msg || "এই ছবিটি দেখে বুঝাও";
    const imageToSend = imagePreview;
    setInput("");
    setImagePreview(null);
    setShowPromptModifiers(false);

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: msg || "🖼️ ছবি পাঠানো হয়েছে",
        ...(imageToSend ? { image: imageToSend } : {}),
      },
    ]);
    setSending(true);
    setSearchComplete(null);
    if (searchCompleteRef.current) clearTimeout(searchCompleteRef.current);

    let activeSessionId = sessionId;
    if (user && !activeSessionId && !sessionCreatedRef.current) {
      sessionCreatedRef.current = true;
      const title = (msg || "Image chat").slice(0, 45);
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
        setMessages((prev) => [...prev, { role: "assistant", content: data.error || "সীমা অতিক্রম হয়েছে।" }]);
        return;
      }

      if (!res.ok) throw new Error(data.error || "সার্ভার রেসপন্সে সমস্যা হয়েছে।");

      setMessages((prev) => {
        const next = [
          ...prev,
          {
            role: "assistant" as const,
            content: data.response,
            ...(data.sources ? { sources: data.sources } : {}),
            ...(data.taskGraph ? { taskGraph: data.taskGraph } : {}),
            ...(data.taskClarification ? { taskClarification: data.taskClarification } : {}),
          },
        ];
        setTimeout(() => setTypingIdx(next.length - 1), 30);
        return next;
      });

      if (data.sources && data.sources.length > 0) {
        setSearchComplete(data.sources.length);
        searchCompleteRef.current = setTimeout(() => setSearchComplete(null), 4000);
      }

      if (!user && data.response) {
        const mem = loadGuestMemory();
        mem.push({ role: "user", content: userMsg });
        mem.push({ role: "assistant", content: data.response });
        saveGuestMemory(mem);
      }
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: "assistant", content: err.message || "দুঃখিত, কোনো একটি সমস্যা হয়েছে।" }]);
    } finally {
      setSending(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("ছবির সাইজ ৫MB এর বেশি হতে পারবে না।");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const applyModifier = (modifier: typeof PROMPT_MODIFIERS[0]) => {
    if (input.trim()) {
      setInput(modifier.prefix + input.trim());
    } else {
      setInput(modifier.prefix);
    }
    setShowPromptModifiers(false);
    inputRef.current?.focus();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] bg-[#09090e]">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <img src="/logo.png" alt="CholoShikhi" className="w-14 h-14 rounded-2xl object-contain shadow-[0_0_30px_rgba(139,92,246,0.35)]" />
          <div className="flex gap-1.5 items-center">
            <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce [animation-delay:0.15s]" />
            <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce [animation-delay:0.3s]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] bg-[#09090e] text-slate-100 overflow-hidden relative selection:bg-violet-500/30 selection:text-white">
      {/* Subtle ambient lighting */}
      <div className="ambient-glow-violet top-[-80px] left-[15%]" />
      <div className="ambient-glow-cyan bottom-[-100px] right-[10%]" />

      {/* ===== SIDEBAR ===== */}
      {!isElectron && (
        <AppSidebar
          onNewChat={startNewChat}
          onLoadSession={loadSession}
          activeSessionId={sessionId}
          sessions={sessions}
          loadingSessions={loadingSessions}
          onFetchSessions={fetchSessions}
          onSelectPrompt={(prompt) => {
            setInput(prompt);
            inputRef.current?.focus();
          }}
        />
      )}

      {/* ===== MAIN CHAT WORKSPACE ===== */}
      <div className="flex-1 flex flex-col min-w-0 z-10 relative">
        {/* Top Header */}
        <header className="flex items-center justify-between px-4 sm:px-6 h-14 border-b border-white/[0.07] shrink-0 glass-dock backdrop-blur-2xl">
          <div className="w-8 md:hidden" />

          {/* Mode Selector */}
          <div className="flex items-center bg-black/40 border border-white/[0.08] rounded-full p-1 shadow-inner">
            <button
              onClick={() => setMode("normal")}
              className={`px-3.5 sm:px-4 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${
                mode === "normal"
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              সাধারণ
            </button>
            <button
              onClick={() => setMode("education")}
              className={`px-3.5 sm:px-4 py-1.5 text-xs font-medium rounded-full transition-all duration-200 flex items-center gap-1.5 ${
                mode === "education"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              শিক্ষক
            </button>
            <button
              onClick={() => setMode("taskplan")}
              className={`px-3.5 sm:px-4 py-1.5 text-xs font-medium rounded-full transition-all duration-200 flex items-center gap-1.5 ${
                mode === "taskplan"
                  ? "bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md shadow-sky-500/25"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              টাস্ক প্ল্যানার
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Live Context & Memory Capacity HUD Button */}
            <button
              onClick={() => setShowContextInspector(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-violet-600/20 border border-violet-500/20 hover:border-violet-500/40 text-xs font-medium text-slate-300 hover:text-white transition-all shadow-sm group"
              title="AI মেমোরি ও রিয়েল-টাইম কনটেক্সট ক্যাপাসিটি দেখুন"
            >
              <div className="flex items-center gap-1.5">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] text-slate-300 font-semibold flex items-center gap-1">
                  🧠 মেমোরি: <span className="font-mono text-violet-300">{messages.length}/50</span>
                </span>
              </div>

              {/* Mini Context Capacity Bar */}
              <div className="hidden sm:flex items-center gap-1.5 pl-1.5 border-l border-white/10">
                <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-emerald-400 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(8, (messages.length / 50) * 100))}%` }}
                  />
                </div>
                <span className="text-[9px] text-emerald-400 font-mono font-medium">
                  {messages.length === 0 ? "স্মার্ট" : `${Math.min(100, Math.round((messages.length / 50) * 100))}%`}
                </span>
              </div>
            </button>

            {user ? (
              <span className="text-xs text-slate-400 hidden lg:inline font-mono">{user.email?.split("@")[0]}</span>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="text-xs px-3 py-1 rounded-full bg-violet-600/20 text-violet-300 hover:bg-violet-600 hover:text-white border border-violet-500/30 transition-all"
              >
                লগইন
              </button>
            )}
          </div>
        </header>

        {/* Message Stream or Empty Welcome State */}
        {chatActive ? (
          <div
            ref={scrollContainerRef}
            onScroll={handleScrollEvent}
            className="flex-1 overflow-y-auto px-4 sm:px-8 pt-8 pb-12 scroll-smooth"
          >
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg, i) => {
                const isTyping = typingIdx === i;
                const rawText = isTyping ? typingText : msg.content;
                const displayText = msg.role === "assistant" ? sanitizeDisplayText(rawText) : rawText;

                return (
                  <div
                    key={i}
                    className={`flex items-start gap-3 group/msg ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center p-1 shadow-md shadow-violet-500/20 shrink-0 mt-0.5">
                        <img src="/logo.png" alt="AI" className="w-full h-full object-contain rounded-lg" />
                      </div>
                    )}

                    <div className="relative max-w-[86%] sm:max-w-[80%]">
                      <div
                        className={`px-4 py-3 text-[13.5px] sm:text-[14px] leading-relaxed rounded-2xl shadow-sm ${
                          msg.role === "user"
                            ? "bg-gradient-to-br from-violet-600 to-indigo-700 text-white rounded-tr-sm shadow-violet-500/20"
                            : "glass-panel text-slate-200 rounded-tl-sm border border-white/[0.08]"
                        }`}
                      >
                        {msg.image && (
                          <img
                            src={msg.image}
                            alt="Uploaded attachment"
                            className="mb-2.5 rounded-xl max-h-56 w-auto object-cover border border-white/10"
                          />
                        )}

                        {msg.role === "assistant" ? (
                          <RenderMessage text={displayText} />
                        ) : (
                          <p className="whitespace-pre-wrap">{displayText}</p>
                        )}

                        {isTyping && (
                          <span className="inline-block w-1.5 h-3.5 bg-violet-400 ml-1 align-middle animate-pulse rounded-sm" />
                        )}
                      </div>

                      {/* Copy Action Button */}
                      <button
                        onClick={() => handleCopy(displayText, i)}
                        className={`absolute -bottom-5 ${
                          msg.role === "user" ? "right-1" : "left-1"
                        } opacity-0 group-hover/msg:opacity-100 transition-opacity text-slate-500 hover:text-slate-300 text-xs flex items-center gap-1`}
                        title="কপি করুন"
                      >
                        {copiedIdx === i ? (
                          <span className="text-emerald-400 text-[11px]">কপি হয়েছে ✓</span>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>

                      {/* Sources Card */}
                      {msg.sources && msg.sources.length > 0 && <SourcesCard sources={msg.sources} />}

                      {/* Task Planner Visuals */}
                      {msg.taskGraph && (
                        <div className="mt-3">
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
                        </div>
                      )}

                      {/* Clarification Questions */}
                      {msg.taskClarification && (
                        <div className="mt-3 border border-amber-500/20 rounded-2xl bg-amber-500/[0.04] p-3.5 backdrop-blur-md">
                          <div className="flex items-center gap-2 mb-2.5">
                            <span className="text-amber-400">💡</span>
                            <p className="text-xs font-semibold text-amber-300">আরও কিছু তথ্য জানা প্রয়োজন</p>
                          </div>
                          <div className="space-y-2.5">
                            {msg.taskClarification.questions.map((q, qi) => (
                              <div key={q.id} className="rounded-xl bg-black/30 border border-amber-500/10 p-2.5">
                                <p className="text-xs font-medium text-slate-200">{qi + 1}. {q.question}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">{q.why}</p>
                                {q.options && q.options.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {q.options.map((opt) => (
                                      <button
                                        key={opt}
                                        onClick={() => {
                                          const answer = `${q.question}\nউত্তর: ${opt}`;
                                          setInput(answer);
                                          setTimeout(() => handleSend(answer), 100);
                                        }}
                                        className="px-2.5 py-1 text-[11px] text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition-all"
                                      >
                                        {opt}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {searchComplete !== null && i === messages.length - 1 && msg.role === "assistant" && (
                        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-400 animate-fade-in font-medium">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>ওয়েব অনুসন্ধান সম্পন্ন হয়েছে · {searchComplete} টি তথ্যসূত্র</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {sending && (
                <div className="flex items-center gap-3 animate-fade-in">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center p-1 shrink-0 shadow-md shadow-violet-500/20">
                    <img src="/logo.png" alt="AI" className="w-full h-full object-contain rounded-lg" />
                  </div>
                  <div className="glass-panel px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2 text-xs text-slate-400">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                      <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                    </div>
                    <span>{mode === "education" ? "শিক্ষক উত্তর প্রস্তুত করছেন..." : mode === "taskplan" ? "টাস্ক প্ল্যান তৈরি হচ্ছে..." : "উত্তর প্রস্তুত হচ্ছে..."}</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>
        ) : (
          /* Welcome State */
          <div className="flex-1 flex flex-col items-center justify-center px-4 animate-fade-in text-center max-w-2xl mx-auto">
            <div className="mb-4 relative">
              <div className="absolute inset-0 bg-violet-600/30 rounded-3xl blur-2xl animate-pulse-subtle" />
              <img
                src="/logo.png"
                alt="CholoShikhi"
                className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-3xl object-contain shadow-[0_0_40px_rgba(139,92,246,0.35)]"
              />
            </div>
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-white mb-2">
              {getGreeting()}{user ? `, ${user.name || "শিক্ষার্থী"}` : ""}
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm max-w-md mb-5 leading-relaxed">
              {mode === "education"
                ? "শিক্ষক মোড সক্রিয় — যে কোনো জটিল বিষয় স্টেপ-বাই-স্টেপ সহজে শেখো।"
                : mode === "taskplan"
                ? "টাস্ক প্ল্যানার সক্রিয় — যে কোনো বড় কাজ স্বয়ংক্রিয় পরিকল্পনায় রূপান্তর করো।"
                : "আমি চলো শিখি AI — তোমার যে কোনো বিষয় ও পড়াশোনার বিশ্বস্ত সমাধানকারী।"}
            </p>

          </div>
        )}

        {/* ===== INPUT DOCK ===== */}
        <div className="px-3 sm:px-6 pb-4 sm:pb-6 shrink-0">
          <div className="max-w-3xl mx-auto">
            {/* Quick Suggestion Cards on Welcome Screen */}
            {!chatActive && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3.5 animate-fade-in">
                {SUGGESTIONS.slice(0, 4).map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(s.text)}
                    className="p-3.5 text-left glass-panel-subtle hover:glass-panel rounded-2xl hover:border-violet-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 group border border-white/[0.06]"
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold text-violet-300 group-hover:text-violet-200">
                      <span>{s.icon}</span>
                      <span>{s.label}</span>
                    </div>
                    <p className="text-xs text-slate-400 group-hover:text-slate-200 mt-1 line-clamp-1">{s.text}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Image Preview Chip */}
            {imagePreview && (
              <div className="mb-2.5 inline-flex items-center gap-2 px-3 py-1.5 glass-panel rounded-xl border border-violet-500/30 animate-fade-in">
                <img src={imagePreview} alt="Preview" className="h-8 w-8 rounded-md object-cover" />
                <span className="text-xs text-slate-300">ছবি যুক্ত হয়েছে</span>
                <button onClick={() => setImagePreview(null)} className="text-slate-400 hover:text-rose-400 text-xs ml-1">✕</button>
              </div>
            )}

            {/* Floating Glass Input Container */}
            <div className="relative glass-dock rounded-2xl sm:rounded-3xl p-2 flex items-center gap-2 border border-white/[0.1] shadow-2xl focus-within:border-violet-500/50 focus-within:shadow-[0_0_25px_rgba(139,92,246,0.15)] transition-all">
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />

              {/* Upload image */}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={sending}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 transition-colors disabled:opacity-40 shrink-0"
                title="ছবি আপলোড"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>

              {/* Emoji Picker */}
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                disabled={sending}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 transition-colors disabled:opacity-40 shrink-0"
                title="ইমোজি"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              {showEmojiPicker && (
                <EmojiPicker
                  onSelect={(emoji) => setInput((prev) => prev + emoji)}
                  onClose={() => setShowEmojiPicker(false)}
                />
              )}

              {/* Voice to Text (Mic) Button */}
              <button
                onClick={toggleVoiceInput}
                disabled={sending}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 shrink-0 ${
                  isListening
                    ? "bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.6)] animate-pulse scale-105"
                    : "text-slate-400 hover:text-violet-400 hover:bg-violet-500/10"
                }`}
                title={isListening ? "ভয়েস রেকর্ড বন্ধ করুন" : "মুখে বলে লিখুন (Voice-to-Text)"}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {isListening ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  )}
                </svg>
              </button>

              {/* Text Input */}
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder={
                  isListening
                    ? "🎤 মুখে বলুন... (বাংলা বা ইংরেজিতে)"
                    : mode === "education"
                    ? "কী শিখতে চাও? যেকোনো প্রশ্ন করো..."
                    : mode === "taskplan"
                    ? "কোন কাজটি সম্পন্ন করতে চাও লিখো..."
                    : "চলো শিখি AI কে কিছু জিজ্ঞাসা করো..."
                }
                disabled={sending}
                className={`flex-1 bg-transparent text-white focus:outline-none text-sm disabled:opacity-40 px-1 ${
                  isListening ? "placeholder-rose-300 animate-pulse font-medium" : "placeholder-slate-500"
                }`}
              />

              {/* Send Button */}
              <button
                onClick={() => handleSend()}
                disabled={(!input.trim() && !imagePreview) || sending}
                className={`w-10 h-10 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-200 shrink-0 ${
                  (input.trim() || imagePreview) && !sending
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/30 hover:scale-105 active:scale-95"
                    : "bg-white/[0.04] text-slate-600 cursor-not-allowed"
                }`}
                title="মেসেজ পাঠান"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19V5m0 0l-7 7m7-7l7 7" />
                </svg>
              </button>
            </div>

            {/* Engine & Live Context Memory Indicator */}
            <div className="flex flex-wrap items-center justify-between gap-2 mt-2 px-1 text-[11px] text-slate-500 font-medium">
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${mode === "education" ? "bg-emerald-400" : mode === "taskplan" ? "bg-sky-400" : "bg-violet-400"}`} />
                <span>{mode === "education" ? "CholoShikhi Shikkhok (AI শিক্ষক)" : mode === "taskplan" ? "CholoShikhi Task Planner (স্মার্ট প্ল্যানার)" : "CholoShikhi AI 1.0 (Advanced)"}</span>
              </div>

              {/* Clickable Live Context Memory Tracker Pill */}
              <button
                onClick={() => setShowContextInspector(true)}
                className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-violet-200 bg-white/[0.03] hover:bg-violet-600/15 px-2.5 py-0.5 rounded-full border border-white/[0.07] hover:border-violet-500/30 transition-all group"
                title="AI এর মেমোরি ও কনটেক্সট বিস্তারিত দেখুন"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-400 group-hover:text-slate-300">🧠 লাইভ মেমোরি:</span>
                <span className="text-violet-300 font-mono font-semibold">{messages.length}টি মেসেজ সক্রিয়</span>
                <span className="text-slate-500 hidden sm:inline">| (১০০% ক্যাপাসিটি)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Context & Memory Inspector Modal */}
      <ContextInspectorModal
        isOpen={showContextInspector}
        onClose={() => setShowContextInspector(false)}
        sessionMessagesCount={messages.length}
        totalWordsInSession={messages.reduce(
          (acc, m) => acc + (m.content ? m.content.trim().split(/\s+/).filter(Boolean).length : 0),
          0
        )}
        isLoggedIn={!!user}
        getToken={getToken}
        activeMode={mode}
      />
    </div>
  );
}
