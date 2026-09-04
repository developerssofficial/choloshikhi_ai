"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter, usePathname } from "next/navigation";
import RenderMessage from "@/components/RenderMessage";
import TaskFlowChart from "@/components/TaskFlowChart";
import TaskExecutionPanel from "@/components/TaskExecutionPanel";
import AppSidebar from "@/components/AppSidebar";
import EmojiPicker from "@/components/EmojiPicker";
import ContextInspectorModal from "@/components/ContextInspectorModal";
import TeacherCurriculumStudio, { SelectedTeacherLesson } from "@/components/TeacherCurriculumStudio";
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
  mode?: string;
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

const NORMAL_SUGGESTIONS = [
  { icon: "📚", label: "NCTB বইয়ের তথ্য", text: "২য় শ্রেণির 'আমার বাংলা বই'-এ মোট কয়টি পাঠ আছে এবং সম্পূর্ণ সূচিপত্র দাও" },
  { icon: "🏫", label: "৩য় শ্রেণির বিজ্ঞান", text: "৩য় শ্রেণির প্রাথমিক বিজ্ঞান বইয়ের অধ্যায়গুলো ও প্রথম অধ্যায়ের প্রশ্নগুলো কী কী?" },
  { icon: "📖", label: "সপ্তবর্ণা বাংলা", text: "সপ্তম শ্রেণির সপ্তবর্ণা বইয়ের প্রথম অধ্যায় 'কাবুলিওয়ালা' গল্পের মূল বিষয়বস্তু কী?" },
  { icon: "🔢", label: "৫ম শ্রেণির গণিত", text: "৫ম শ্রেণির প্রাথমিক গণিত বইয়ের সূচিপত্র ও শতকরা অধ্যায়ের সূত্রগুলো বলো" },
  { icon: "🇬🇧", label: "English for Today", text: "Class 4 English for Today বইয়ের Unit 1 এর Dialogue ও Exercise গুলো দাও" },
  { icon: "💡", label: "সাধারণ জ্ঞান", text: "বাংলাদেশের মুক্তিযুদ্ধ ও স্বাধীনতা দিবসের ইতিহাস সংক্ষেপে পয়েন্ট আকারে বলো" },
];

const TEACHER_SUGGESTIONS = [
  { icon: "📐", label: "গণিত সমাধান", text: "দ্বিঘাত সমীকরণ ax² + bx + c = 0 কীভাবে সমাধান করতে হয় স্টেপ-বাই-স্টেপ বুঝিয়ে দাও" },
  { icon: "⚡", label: "পদার্থবিজ্ঞান", text: "নিউটনের গতিসূত্র এবং ভরবেগের সংরক্ষণ সূত্র বাস্তব উদাহরণসহ বুঝিয়ে দাও" },
  { icon: "🧪", label: "রসায়ন বিক্রিয়া", text: "জারণ-বিজারণ বিক্রিয়া ইলেকট্রন স্থানান্তরের মাধ্যমে সহজ ভাষায় ব্যাখ্যা করো" },
  { icon: "🧬", label: "জীববিজ্ঞান", text: "সালোকসংশ্লেষণ প্রক্রিয়া কীভাবে ঘটে এবং এর গুরুত্ব পয়েন্ট আকারে বুঝিয়ে দাও" },
  { icon: "🇬🇧", label: "English Grammar", text: "Right form of verbs এবং Modifiers এর নিয়মগুলো সহজ উদাহরণ দিয়ে শেখাও" },
  { icon: "🎯", label: "কুইজ দিয়ে শেখা", text: "পর্যায় সারণি অধ্যায়ের উপর আমাকে ৩টি প্রশ্ন জিজ্ঞেস করে আমার পড়া যাচাই করো" },
];

const PLANNER_SUGGESTIONS = [
  { icon: "🎯", label: "পড়াশোনার রুটিন", text: "এসএসসি পরীক্ষার জন্য আগামী ৩০ দিনের একটি বাস্তবসম্মত বিষয়ভিত্তিক রিভিশন প্ল্যান তৈরি করো" },
  { icon: "💻", label: "প্রোগ্রামিং প্রজেক্ট", text: "Next.js এবং Tailwind CSS দিয়ে একটি পোর্টফোলিও ওয়েবসাইট তৈরির স্টেপ-বাই-স্টেপ টাস্ক প্ল্যান দাও" },
  { icon: "📝", label: "গবেষণা ও রিপোর্ট", text: "কৃত্রিম বুদ্ধিমত্তা (AI) কীভাবে বাংলাদেশের শিক্ষাব্যবস্থায় ইতিবাচক ভূমিকা রাখতে পারে তার রিপোর্ট তৈরি করো" },
  { icon: "📊", label: "বিসিএস প্রিলিমিনারি", text: "বিসিএস প্রিলিমিনারি পরীক্ষার সাধারণ বিজ্ঞান ও গণিত প্রস্তুতির ৩ মাসের রোডম্যাপ দাও" },
];

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

function sanitizeDisplayText(text: string): string {
  if (!text) return text;
  let clean = text.replace(/```json\s*[\s\S]*?```/g, "").trim();
  if (/\{\s*"action"\s*:/.test(clean) || /\{\s*"taskGraph"\s*:/.test(clean) || /\{\s*"nodes"\s*:/.test(clean)) {
    clean = clean.replace(/\{[\s\S]*\}/g, "").trim();
  }
  return clean || "";
}

export default function ChatInterface({ initialMode = "normal" }: { initialMode?: "normal" | "education" | "taskplan" }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, signInWithGoogle, getToken, isElectron } = useAuth();
  const [mode, setMode] = useState<"normal" | "education" | "taskplan">(initialMode);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [typingIdx, setTypingIdx] = useState<number | null>(null);
  const [typingText, setTypingText] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [searchComplete, setSearchComplete] = useState<number | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showPromptModifiers, setShowPromptModifiers] = useState(false);
  const [showContextInspector, setShowContextInspector] = useState(false);
  const [showCurriculumStudio, setShowCurriculumStudio] = useState(false);
  const [selectedTeacherLesson, setSelectedTeacherLesson] = useState<SelectedTeacherLesson | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  const searchCompleteRef = useRef<NodeJS.Timeout | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const sessionCreatedRef = useRef(false);

  const guestMemoryKey = `choloshikhi_guest_memory_${initialMode}`;

  const loadGuestMemory = (): Array<{ role: string; content: string }> => {
    try {
      const raw = localStorage.getItem(guestMemoryKey);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  };

  const saveGuestMemory = (memory: Array<{ role: string; content: string }>) => {
    try {
      localStorage.setItem(guestMemoryKey, JSON.stringify(memory.slice(-50)));
    } catch {}
  };

  // Sync mode with route if initialMode changes
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Initialize Web Speech API for Free Voice-to-Text
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "bn-BD";

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

        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!speechSupported) {
      alert("আপনার ব্রাউজারে Voice-to-Text সাপোর্ট করে না। দয়া করে Chrome বা Edge ব্যবহার করুন।");
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
      } catch {
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
      const res = await fetch(`/api/sessions?mode=${initialMode}`, { headers });
      const data = await res.json();
      if (data.sessions) setSessions(data.sessions);
    } catch {}
    setLoadingSessions(false);
  }, [user, getToken, initialMode]);

  useEffect(() => {
    if (user) fetchSessions();
  }, [user, fetchSessions]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);

  const handleScrollEvent = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
    userScrolledUpRef.current = !isNearBottom;
  }, []);

  useEffect(() => {
    if (!userScrolledUpRef.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages.length]);

  // Stream Typewriter Effect
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
        body: JSON.stringify({ title, mode: initialMode }),
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

  const handleModeNavigate = (targetMode: "normal" | "education" | "taskplan") => {
    if (targetMode === "normal") router.push("/chat");
    else if (targetMode === "education") router.push("/chat/teacher");
    else if (targetMode === "taskplan") router.push("/chat/planner");
  };

  const handleSend = async (text?: string) => {
    const msg = text || input.trim();
    if ((!msg && !imagePreview) || sending) return;

    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    setTypingIdx(null);
    setTypingText("");

    const fileToSend = imagePreview;
    const userMsg = msg || (fileToSend?.startsWith("data:application/pdf") ? "এই PDF ফাইলটি দেখে সামারি ও বিস্তারিত বুঝিয়ে দাও" : "এই ছবিটি দেখে বুঝাও");
    setInput("");
    setImagePreview(null);
    setAttachmentName(null);
    setShowPromptModifiers(false);

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: msg || (fileToSend?.startsWith("data:application/pdf") ? "📄 PDF ফাইল পাঠানো হয়েছে" : "🖼️ ছবি পাঠানো হয়েছে"),
        ...(fileToSend ? { image: fileToSend } : {}),
      },
    ]);
    setSending(true);
    setSearchComplete(null);
    if (searchCompleteRef.current) clearTimeout(searchCompleteRef.current);

    let activeSessionId = sessionId;
    if (user && !activeSessionId && !sessionCreatedRef.current) {
      sessionCreatedRef.current = true;
      const title = (msg || (fileToSend?.startsWith("data:application/pdf") ? "PDF Chat" : "Image chat")).slice(0, 45);
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
          mode: initialMode,
          image: fileToSend || null,
          guestMemory: !user ? loadGuestMemory() : undefined,
          ...(initialMode === "education" && selectedTeacherLesson
            ? {
                selectedClass: selectedTeacherLesson.classNumber,
                selectedSubject: selectedTeacherLesson.subject,
                selectedBookId: selectedTeacherLesson.bookId,
                selectedChapterId: selectedTeacherLesson.chapterId,
                selectedChapterNumber: selectedTeacherLesson.chapterNumber,
                selectedChapterTitle: selectedTeacherLesson.chapterTitle,
              }
            : {}),
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      alert("ফাইলের সাইজ ২০MB এর বেশি হতে পারবে না।");
      return;
    }
    setAttachmentName(file.name);
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

  // Select suggestions list based on mode & selected teacher lesson
  const currentSuggestions =
    initialMode === "education"
      ? selectedTeacherLesson
        ? selectedTeacherLesson.chapterTitle
          ? [
              {
                icon: "📖",
                label: "পাঠটি বুঝিয়ে দাও",
                text: `${selectedTeacherLesson.className}-এর '${selectedTeacherLesson.bookName}' বইয়ের "${selectedTeacherLesson.chapterNumber ? `পাঠ ${selectedTeacherLesson.chapterNumber}: ` : ""}${selectedTeacherLesson.chapterTitle}" পাঠে কী কী বিষয় আছে এবং এর মূল গল্প/বিষয়বস্তু সহজ ও প্রাঞ্জল ভাষায় সুন্দর করে বুঝিয়ে দাও।`,
              },
              {
                icon: "❓",
                label: "অনুশীলনী সমাধান",
                text: `${selectedTeacherLesson.className}-এর '${selectedTeacherLesson.bookName}' বইয়ের "${selectedTeacherLesson.chapterNumber ? `পাঠ ${selectedTeacherLesson.chapterNumber}: ` : ""}${selectedTeacherLesson.chapterTitle}"-এর সকল অনুশীলনী প্রশ্ন ও সঠিক উত্তর সমাধান করে দাও।`,
              },
              {
                icon: "📝",
                label: "মূল ভাব ও সারসংক্ষেপ",
                text: `এই পাঠটির মূল বিষয়বস্তু, প্রয়োজনীয় ধারণা এবং গুরুত্বপূর্ণ পয়েন্ট বুলেট পয়েন্ট আকারে সাজিয়ে দাও।`,
              },
              {
                icon: "🎯",
                label: "কুইজ দিয়ে পড়া যাচাই",
                text: `এই পাঠের উপর আমাকে ৩টি গুরুত্বপূর্ণ প্রশ্ন জিজ্ঞেস করে আমার পড়া যাচাই করো।`,
              },
            ]
          : [
              {
                icon: selectedTeacherLesson.icon,
                label: `${selectedTeacherLesson.bookName} সূচিপত্র`,
                text: `${selectedTeacherLesson.className}-এর '${selectedTeacherLesson.bookName}' বইয়ের সম্পূর্ণ সূচিপত্র ও পাঠগুলোর তালিকা দাও।`,
              },
              {
                icon: "💡",
                label: "গুরুত্বপূর্ণ অধ্যায়গুলো",
                text: `${selectedTeacherLesson.className}-এর '${selectedTeacherLesson.bookName}' বইয়ের সবচেয়ে গুরুত্বপূর্ণ অধ্যায়গুলো কী কী এবং কেন?`,
              },
              ...TEACHER_SUGGESTIONS.slice(0, 2),
            ]
        : TEACHER_SUGGESTIONS
      : initialMode === "taskplan"
      ? PLANNER_SUGGESTIONS
      : NORMAL_SUGGESTIONS;

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
          <div className="flex items-center gap-2">
            {/* Class & Subject Selector Button (Exclusively in Teacher Mode) */}
            {initialMode === "education" ? (
              <button
                onClick={() => setShowCurriculumStudio(true)}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-xs font-semibold text-emerald-300 hover:text-white transition-all shadow-sm group hover:scale-[1.02]"
                title="শ্রেণি, বিষয় ও সূচিপত্র/পাঠ নির্বাচন করুন"
              >
                <span className="text-base group-hover:rotate-12 transition-transform">
                  {selectedTeacherLesson ? selectedTeacherLesson.icon : "📚"}
                </span>
                <span className="hidden sm:inline">
                  {selectedTeacherLesson
                    ? `${selectedTeacherLesson.className.split(" ")[0]} • ${selectedTeacherLesson.subject}${
                        selectedTeacherLesson.chapterNumber ? ` (পাঠ ${selectedTeacherLesson.chapterNumber})` : ""
                      }`
                    : "পাঠ ও সূচিপত্র স্টুডিও"}
                </span>
                <span className="sm:hidden">
                  {selectedTeacherLesson ? selectedTeacherLesson.subject : "পাঠ সূচি"}
                </span>
                <span className="text-[10px] text-emerald-400">▼</span>
              </button>
            ) : (
              <div className="w-4 md:hidden" />
            )}
          </div>

          {/* Mode Switcher Tabs (Navigates to dedicated page) */}
          <div className="flex items-center bg-black/40 border border-white/[0.08] rounded-full p-1 shadow-inner">
            <button
              onClick={() => handleModeNavigate("normal")}
              className={`px-3.5 sm:px-4 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${
                initialMode === "normal"
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              💬 সাধারণ
            </button>
            <button
              onClick={() => handleModeNavigate("education")}
              className={`px-3.5 sm:px-4 py-1.5 text-xs font-medium rounded-full transition-all duration-200 flex items-center gap-1.5 ${
                initialMode === "education"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              👨‍🏫 শিক্ষক
            </button>
            <button
              onClick={() => handleModeNavigate("taskplan")}
              className={`px-3.5 sm:px-4 py-1.5 text-xs font-medium rounded-full transition-all duration-200 flex items-center gap-1.5 ${
                initialMode === "taskplan"
                  ? "bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md shadow-sky-500/25 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              🧭 টাস্ক প্ল্যানার
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Live Context HUD Button */}
            <button
              onClick={() => setShowContextInspector(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-violet-600/20 border border-violet-500/20 hover:border-violet-500/40 text-xs font-medium text-slate-300 hover:text-white transition-all shadow-sm group"
              title="AI মেমোরি ও কনটেক্সট ক্যাপাসিটি দেখুন"
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

        {/* Teacher Mode Active Class, Book & Chapter Breadcrumb Bar */}
        {initialMode === "education" && selectedTeacherLesson && (
          <div className="bg-gradient-to-r from-emerald-950/80 via-emerald-900/50 to-teal-950/80 border-b border-emerald-500/30 px-4 sm:px-6 py-2 flex items-center justify-between text-xs backdrop-blur-xl shrink-0 animate-fade-in shadow-lg">
            <div className="flex items-center gap-2 text-emerald-300 min-w-0 flex-wrap">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="font-bold text-white shrink-0 bg-emerald-800/50 px-2 py-0.5 rounded-md border border-emerald-500/30">
                {selectedTeacherLesson.className.split(" ")[0]}
              </span>
              <span className="text-emerald-500 shrink-0">›</span>
              <span className="font-semibold text-emerald-100 shrink-0">{selectedTeacherLesson.bookName}</span>
              {selectedTeacherLesson.chapterTitle && (
                <>
                  <span className="text-emerald-500 shrink-0">›</span>
                  <span className="font-bold text-teal-200 bg-teal-900/70 px-2.5 py-0.5 rounded-md border border-teal-500/40 truncate max-w-[280px]">
                    📑 {selectedTeacherLesson.chapterNumber ? `পাঠ ${selectedTeacherLesson.chapterNumber}: ` : ""}{selectedTeacherLesson.chapterTitle}
                  </span>
                </>
              )}
              {selectedTeacherLesson.startPage && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono shrink-0 hidden md:inline">
                  পৃষ্ঠা {selectedTeacherLesson.startPage}–{selectedTeacherLesson.endPage}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              <button
                onClick={() => setShowCurriculumStudio(true)}
                className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 hover:text-white text-[11px] font-semibold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <span>পাঠ পরিবর্তন</span>
                <span>📑</span>
              </button>
            </div>
          </div>
        )}

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
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center p-1 shadow-md shrink-0 mt-0.5 ${
                        initialMode === "education"
                          ? "bg-gradient-to-br from-emerald-600 to-teal-700 shadow-emerald-500/20"
                          : initialMode === "taskplan"
                          ? "bg-gradient-to-br from-sky-600 to-blue-700 shadow-sky-500/20"
                          : "bg-gradient-to-br from-violet-600 to-indigo-700 shadow-violet-500/20"
                      }`}>
                        <img src="/logo.png" alt="AI" className="w-full h-full object-contain rounded-lg" />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 sm:p-5 transition-all duration-200 ${
                        msg.role === "user"
                          ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/15"
                          : "bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl text-slate-200 shadow-xl shadow-black/20"
                      }`}
                    >
                      {msg.image && (
                        <div className="mb-3 rounded-xl overflow-hidden max-h-60 bg-black/40 border border-white/10 flex items-center justify-center">
                          {msg.image.startsWith("data:application/pdf") ? (
                            <div className="flex items-center gap-2 p-3 text-sm text-violet-300">
                              <span className="text-xl">📄</span> সংযুক্ত PDF ডকুমেন্ট
                            </div>
                          ) : (
                            <img src={msg.image} alt="User upload" className="max-h-60 w-auto object-contain rounded-lg" />
                          )}
                        </div>
                      )}

                      {/* Main Markdown / LaTeX Rendered Body */}
                      <div className="leading-relaxed text-sm sm:text-base">
                        <RenderMessage text={displayText} />
                      </div>

                      {/* Web Search Sources */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-3">
                          <p className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                            <span>🔍</span> তথ্যসূত্র ({msg.sources.length}টি লিংক):
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {msg.sources.slice(0, 4).map((s, sIdx) => (
                              <a
                                key={sIdx}
                                href={s.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-violet-300 hover:text-violet-200 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 rounded-lg px-2.5 py-1.5 truncate transition-all block"
                              >
                                🔗 {s.title || getDomain(s.url)}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Interactive Task Graph Flowchart */}
                      {msg.taskGraph && (
                        <div className="mt-4">
                          <TaskFlowChart
                            graph={msg.taskGraph}
                            stepStatusOverrides={stepStatusOverrides}
                            stepOutputs={stepOutputMap}
                          />
                        </div>
                      )}

                      {/* Copy Action Bar */}
                      {msg.role === "assistant" && !isTyping && (
                        <div className="mt-3 pt-2 border-t border-white/[0.05] flex items-center justify-between text-xs text-slate-400">
                          <span className="text-[11px] text-slate-500 font-mono">
                            {initialMode === "education" ? "👨‍🏫 CholoShikhi Shikkhok" : initialMode === "taskplan" ? "🧭 Task Planner" : "CholoShikhi 1.0"}
                          </span>
                          <button
                            onClick={() => handleCopy(rawText, i)}
                            className="flex items-center gap-1 hover:text-white transition-colors py-1 px-2 rounded-md hover:bg-white/[0.05]"
                          >
                            {copiedIdx === i ? "✓ কপি হয়েছে" : "📋 কপি করো"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          </div>
        ) : (
          /* Empty Welcome State */
          <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 flex flex-col items-center justify-center text-center">
            <div className="max-w-2xl mx-auto space-y-6 animate-fade-in w-full">
              <div className="relative inline-block">
                <div
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-3xl p-3 sm:p-3.5 shadow-2xl flex items-center justify-center mx-auto ${
                    initialMode === "education"
                      ? "bg-gradient-to-br from-emerald-500 to-teal-700 shadow-emerald-500/30"
                      : initialMode === "taskplan"
                      ? "bg-gradient-to-br from-sky-500 to-blue-700 shadow-sky-500/30"
                      : "bg-gradient-to-br from-violet-500 to-indigo-700 shadow-violet-500/30"
                  }`}
                >
                  <img src="/logo.png" alt="CholoShikhi" className="w-full h-full object-contain rounded-2xl" />
                </div>
              </div>

              <div className="space-y-1.5">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  {getGreeting()}, {user?.name ? user.name.split(" ")[0] : "বন্ধু"}! 👋
                </h1>
                <p className="text-slate-400 text-xs sm:text-sm max-w-lg mx-auto">
                  {initialMode === "education"
                    ? "চলো শিখি শিক্ষক — NCTB ২০২৬ শিক্ষাক্রমের অধ্যায়ভিত্তিক ব্যক্তিগত গৃহশিক্ষক।"
                    : initialMode === "taskplan"
                    ? "টাস্ক প্ল্যানার ও রিসার্চ ইঞ্জিন — যে কোনো বড় কাজ বা পড়ার লক্ষ্যকে ইন্টারেক্টিভ রোডম্যাপে সাজাও।"
                    : "চলো শিখি এআই — ১ম-৫ম শ্রেণির NCTB ২০২৬ বইয়ের সম্পূর্ণ সূচিপত্র ও তথ্যসমৃদ্ধ স্মার্ট সহকারী।"}
                </p>
              </div>

              {/* Special Teacher Mode Chapter Focus Card */}
              {initialMode === "education" && (
                <div className="w-full bg-gradient-to-b from-emerald-950/40 via-teal-950/20 to-black/60 border border-emerald-500/30 rounded-3xl p-4 sm:p-6 backdrop-blur-xl shadow-2xl text-left relative overflow-hidden group">
                  <div className="absolute -top-16 -right-16 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                  
                  {selectedTeacherLesson ? (
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                              বর্তমান নির্বাচিত পাঠ
                            </span>
                          </div>
                          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                            <span>{selectedTeacherLesson.icon}</span>
                            <span>
                              {selectedTeacherLesson.chapterTitle
                                ? `${selectedTeacherLesson.chapterNumber ? `পাঠ ${selectedTeacherLesson.chapterNumber}: ` : ""}${selectedTeacherLesson.chapterTitle}`
                                : selectedTeacherLesson.bookName}
                            </span>
                          </h2>
                          <p className="text-xs text-emerald-300/80 mt-0.5">
                            {selectedTeacherLesson.className} • {selectedTeacherLesson.bookName}
                            {selectedTeacherLesson.startPage && (
                              <span className="ml-1 text-slate-400 font-mono">
                                (পৃষ্ঠা {selectedTeacherLesson.startPage}–{selectedTeacherLesson.endPage})
                              </span>
                            )}
                          </p>
                        </div>

                        <button
                          onClick={() => setShowCurriculumStudio(true)}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 hover:text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
                        >
                          <span>সূচিপত্র খুলুন</span>
                          <span>📑</span>
                        </button>
                      </div>

                      {/* Quick 1-Click Action Buttons */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {currentSuggestions.map((s, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSend(s.text)}
                            className="p-3 rounded-2xl bg-white/[0.04] hover:bg-emerald-500/15 border border-white/[0.08] hover:border-emerald-500/40 transition-all flex items-start gap-2.5 text-left group/btn"
                          >
                            <span className="text-lg shrink-0 group-hover/btn:scale-110 transition-transform">
                              {s.icon}
                            </span>
                            <div className="min-w-0">
                              <h3 className="text-xs font-semibold text-slate-200 group-hover/btn:text-emerald-300 transition-colors">
                                {s.label}
                              </h3>
                              <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                                {s.text}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 sm:py-6 space-y-3">
                      <div className="text-3xl">📚</div>
                      <h3 className="text-sm sm:text-base font-bold text-white">
                        কোনো শ্রেণি ও পাঠ্যবই নির্বাচন করা হয়নি
                      </h3>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">
                        ১ম থেকে ৫ম শ্রেণির যেকোনো পাঠ্যবই ও অধ্যায় নির্বাচন করুন। শিক্ষক নির্দিষ্ট পাঠের আলোকে পাঠদান করবেন।
                      </p>
                      <div>
                        <button
                          onClick={() => setShowCurriculumStudio(true)}
                          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-emerald-500/25 transition-all inline-flex items-center gap-2"
                        >
                          <span>📖 শ্রেণি ও সূচিপত্র স্টুডিও খুলুন</span>
                          <span>→</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Suggestions Grid (Normal & Task Planner modes) */}
              {initialMode !== "education" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-left">
                  {currentSuggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(s.text)}
                      className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-violet-500/30 transition-all flex items-start gap-3 group"
                    >
                      <span className="text-xl shrink-0 p-1 rounded-lg bg-white/[0.04] group-hover:scale-110 transition-transform">
                        {s.icon}
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-xs font-semibold text-slate-200 group-hover:text-violet-300 transition-colors">
                          {s.label}
                        </h3>
                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                          {s.text}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom Input Box Area */}
        <div className="p-4 sm:p-6 pt-2 shrink-0 max-w-3xl w-full mx-auto">
          {/* File attachment preview */}
          {imagePreview && (
            <div className="mb-2 p-2 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between text-xs text-slate-300 animate-slide-down">
              <div className="flex items-center gap-2 truncate">
                <span>{imagePreview.startsWith("data:application/pdf") ? "📄" : "🖼️"}</span>
                <span className="truncate">{attachmentName || "ফাইল সংযুক্ত হয়েছে"}</span>
              </div>
              <button
                onClick={() => {
                  setImagePreview(null);
                  setAttachmentName(null);
                }}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* Quick Modifier Badges */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none text-xs">
            {PROMPT_MODIFIERS.slice(0, 5).map((m, mIdx) => (
              <button
                key={mIdx}
                onClick={() => applyModifier(m)}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 text-[11px] transition-all shrink-0"
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Chat Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="relative flex items-center bg-white/[0.04] border border-white/[0.1] focus-within:border-emerald-500/50 rounded-2xl p-1.5 shadow-2xl backdrop-blur-2xl transition-all"
          >
            {/* Attachment Button */}
            <input
              type="file"
              ref={fileRef}
              onChange={handleFileSelect}
              accept="image/*,.pdf"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="p-2.5 text-slate-400 hover:text-white hover:bg-white/[0.05] rounded-xl transition-all"
              title="ছবি বা PDF ফাইল আপলোড করো"
            >
              📎
            </button>

            {/* Voice Input Button */}
            <button
              type="button"
              onClick={toggleVoiceInput}
              className={`p-2.5 rounded-xl transition-all ${
                isListening
                  ? "bg-red-500/20 text-red-400 animate-pulse"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.05]"
              }`}
              title={isListening ? "ভয়েস শুনছি... বন্ধ করতে ক্লিক করো" : "কথা বলে প্রশ্ন করো (Voice)"}
            >
              🎤
            </button>

            {/* Input Field */}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                initialMode === "education"
                  ? selectedTeacherLesson?.chapterTitle
                    ? `পাঠ ${selectedTeacherLesson.chapterNumber || ""}: "${selectedTeacherLesson.chapterTitle}" সম্পর্কে যা জানতে চাও লেখো...`
                    : "শিক্ষককে যেকোনো বিষয়ে প্রশ্ন করো বা সমাধান চাও..."
                  : initialMode === "taskplan"
                  ? "যে কাজটির পরিকল্পনা বা রিসার্চ করতে চাও তা বিস্তারিত লেখো..."
                  : "NCTB বইয়ের তথ্য বা যেকোনো প্রশ্ন লিখুন..."
              }
              className="flex-1 bg-transparent border-0 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-0"
              disabled={sending}
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={(!input.trim() && !imagePreview) || sending}
              className={`p-2.5 rounded-xl text-white font-medium transition-all ${
                (!input.trim() && !imagePreview) || sending
                  ? "bg-white/[0.05] text-slate-600 cursor-not-allowed"
                  : initialMode === "education"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 shadow-md shadow-emerald-500/25 hover:opacity-90"
                  : initialMode === "taskplan"
                  ? "bg-gradient-to-r from-sky-600 to-blue-600 shadow-md shadow-sky-500/25 hover:opacity-90"
                  : "bg-gradient-to-r from-violet-600 to-indigo-600 shadow-md shadow-violet-500/25 hover:opacity-90"
              }`}
            >
              {sending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "↑"
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Context Inspector Modal */}
      {showContextInspector && (
        <ContextInspectorModal
          isOpen={showContextInspector}
          onClose={() => setShowContextInspector(false)}
          sessionMessagesCount={messages.length}
          totalWordsInSession={messages.reduce((acc, m) => acc + (m.content?.split(/\s+/).length || 0), 0)}
          isLoggedIn={!!user}
          getToken={getToken}
          activeMode={initialMode}
        />
      )}

      {/* Teacher Curriculum Studio Modal (Class -> Subject -> Chapter & Table of Contents) */}
      {initialMode === "education" && (
        <TeacherCurriculumStudio
          isOpen={showCurriculumStudio}
          onClose={() => setShowCurriculumStudio(false)}
          currentSelected={selectedTeacherLesson}
          onSelectLesson={(lesson, autoPrompt) => {
            setSelectedTeacherLesson(lesson);
            if (autoPrompt) {
              handleSend(autoPrompt);
            }
          }}
        />
      )}
    </div>
  );
}
