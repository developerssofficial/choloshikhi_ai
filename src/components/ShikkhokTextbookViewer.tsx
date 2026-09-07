"use client";

import { useState, useEffect, useRef } from "react";
import RenderMessage from "./RenderMessage";
import { NCTBPageMetadata } from "@/types/nctbPage";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  pageId?: string;
}

const CLASS_OPTIONS = [
  { num: 1, label: "প্রথম শ্রেণি (Class 1)" },
  { num: 2, label: "দ্বিতীয় শ্রেণি (Class 2)" },
  { num: 3, label: "তৃতীয় শ্রেণি (Class 3)" },
  { num: 4, label: "চতুর্থ শ্রেণি (Class 4)" },
  { num: 5, label: "পঞ্চম শ্রেণি (Class 5)" },
];

const SUBJECT_BY_CLASS: Record<number, Array<{ code: string; name: string; slug: string }>> = {
  1: [
    { code: "math", name: "প্রাথমিক গণিত", slug: "class-1-math" },
    { code: "bangla", name: "আমার বাংলা বই", slug: "class-1-bangla" },
    { code: "english", name: "English for Today", slug: "class-1-english" },
  ],
  2: [
    { code: "math", name: "প্রাথমিক গণিত", slug: "class-2-math" },
    { code: "bangla", name: "আমার বাংলা বই", slug: "class-2-bangla" },
    { code: "english", name: "English for Today", slug: "class-2-english" },
  ],
  3: [
    { code: "math", name: "প্রাথমিক গণিত", slug: "class-3-math" },
    { code: "bangla", name: "আমার বাংলা বই", slug: "class-3-bangla" },
    { code: "english", name: "English for Today", slug: "class-3-english" },
    { code: "science", name: "প্রাথমিক বিজ্ঞান", slug: "class-3-science" },
    { code: "bgs", name: "বাংলাদেশ ও বিশ্বপরিচয়", slug: "class-3-bgs" },
  ],
  4: [
    { code: "math", name: "প্রাথমিক গণিত", slug: "class-4-math" },
    { code: "bangla", name: "আমার বাংলা বই", slug: "class-4-bangla" },
    { code: "english", name: "English for Today", slug: "class-4-english" },
    { code: "science", name: "প্রাথমিক বিজ্ঞান", slug: "class-4-science" },
    { code: "bgs", name: "বাংলাদেশ ও বিশ্বপরিচয়", slug: "class-4-bgs" },
  ],
  5: [
    { code: "math", name: "প্রাথমিক গণিত", slug: "class-5-math" },
    { code: "bangla", name: "আমার বাংলা বই", slug: "class-5-bangla" },
    { code: "english", name: "English for Today", slug: "class-5-english" },
    { code: "science", name: "প্রাথমিক বিজ্ঞান", slug: "class-5-science" },
    { code: "bgs", name: "বাংলাদেশ ও বিশ্বপরিচয়", slug: "class-5-bgs" },
  ],
};

export default function ShikkhokTextbookViewer() {
  const [selectedClass, setSelectedClass] = useState<number>(4);
  const [selectedSubject, setSelectedSubject] = useState<string>("math");
  const [availableChapters, setAvailableChapters] = useState<Array<{ no: number; title: string; startPage: number; endPage: number }>>([]);
  const [selectedChapterNo, setSelectedChapterNo] = useState<number>(1);
  const [currentPageNo, setCurrentPageNo] = useState<number>(38);
  
  const [pageMetadata, setPageMetadata] = useState<NCTBPageMetadata | null>(null);
  const [loadingMeta, setLoadingMeta] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);

  // Zoom & Pan state
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chapters when class/subject changes
  useEffect(() => {
    async function loadBookData() {
      try {
        const subjects = SUBJECT_BY_CLASS[selectedClass] || SUBJECT_BY_CLASS[4];
        const currentSub = subjects.find(s => s.code === selectedSubject) || subjects[0];
        
        const res = await fetch(`/api/books/2026-primary-class-${selectedClass}-${currentSub.code}/chapters`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const formatted = data.map((ch: any, idx: number) => ({
              no: parseInt(ch.chapter_number, 10) || idx + 1,
              title: ch.chapter_title,
              startPage: ch.start_page || 1,
              endPage: ch.end_page || 20,
            }));
            setAvailableChapters(formatted);
            setSelectedChapterNo(formatted[0].no);
            setCurrentPageNo(formatted[0].startPage);
            return;
          }
        }
      } catch (err) {
        console.error("Error fetching book chapters:", err);
      }

      // Default chapters fallback
      const fallbackChs = [
        { no: 1, title: "অধ্যায় ১: সংখ্যা ও স্থানীয় মান", startPage: 1, endPage: 22 },
        { no: 2, title: "অধ্যায় ২: যোগ ও বিয়োগ", startPage: 23, endPage: 40 },
        { no: 3, title: "অধ্যায় ৩: গুণ", startPage: 41, endPage: 48 },
        { no: 4, title: "অধ্যায় ৪: ভাগ", startPage: 49, endPage: 66 },
        { no: 5, title: "অধ্যায় ৫: গাণিতিক বাক্য", startPage: 67, endPage: 80 },
      ];
      setAvailableChapters(fallbackChs);
      setSelectedChapterNo(1);
      setCurrentPageNo(1);
    }

    loadBookData();
  }, [selectedClass, selectedSubject]);

  // Load page context metadata whenever currentPageNo changes
  useEffect(() => {
    async function fetchContext() {
      setLoadingMeta(true);
      setImageError(false);
      const pageId = `cls${selectedClass}_${selectedSubject}_p${currentPageNo}`;

      try {
        // Construct metadata locally / via API
        const subjects = SUBJECT_BY_CLASS[selectedClass] || [];
        const subObj = subjects.find(s => s.code === selectedSubject) || { slug: `class-${selectedClass}-${selectedSubject}`, name: selectedSubject };
        
        // Find matching chapter for page
        const ch = availableChapters.find(c => currentPageNo >= c.startPage && currentPageNo <= c.endPage) || availableChapters[0];
        const chNo = ch ? ch.no : selectedChapterNo;
        const chTitle = ch ? ch.title : "পাঠ্যবস্তু";

        const meta: NCTBPageMetadata = {
          pageId,
          classNum: selectedClass,
          subject: subObj.name,
          bookId: `2026-primary-${subObj.slug}`,
          bookSlug: subObj.slug,
          bookTitle: subObj.name,
          chapterNo: chNo,
          chapterTitle: chTitle,
          pageNumber: currentPageNo,
          pageType: currentPageNo % 2 === 0 ? "exercise" : "theory",
          imageUrl: `/textbooks/${subObj.slug}/page_${currentPageNo}.png`,
          chapterContext: {
            coreConcepts: [chTitle, `${subObj.name} শ্রেণি ${selectedClass}`],
            curriculumRules: `Class ${selectedClass} NCTB ${subObj.name} curriculum guidelines. No algebraic unknown variables.`,
            chapterSummary: `${chTitle} - শ্রেণি ${selectedClass}`,
          },
        };

        setPageMetadata(meta);

        // Append initial Context Greeting in Chat
        const welcomeMsg: ChatMessage = {
          id: `welcome-${pageId}-${Date.now()}`,
          role: "assistant",
          content: `আসসালামু আলাইকুম! তুমি এখন **${subObj.name} (শ্রেণি ${selectedClass})**-এর **${chTitle}**-এর **${currentPageNo} নম্বর পৃষ্ঠা** দেখছো।\n\nএই পৃষ্ঠার কোনো অংক বা অনুচ্ছেদ না বুঝলে আমাকে প্রশ্ন করো! 😊`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          pageId,
        };

        setMessages((prev) => {
          // If latest message is welcome for same page, don't duplicate
          if (prev.length > 0 && prev[prev.length - 1].pageId === pageId) return prev;
          return [...prev, welcomeMsg];
        });
      } catch (err) {
        console.error("Context fetch error:", err);
      } finally {
        setLoadingMeta(false);
      }
    }

    fetchContext();
  }, [selectedClass, selectedSubject, currentPageNo, availableChapters]);

  // Auto scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || isSending) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInputMessage("");
    setIsSending(true);

    try {
      const pageId = pageMetadata?.pageId || `cls${selectedClass}_${selectedSubject}_p${currentPageNo}`;
      
      const res = await fetch("/api/chat/shikkhok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId,
          userMessage: textToSend,
          history: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      const replyContent = data.reply || data.error || "দুঃখিত, উত্তর তৈরি করতে সমস্যা হয়েছে। আবার চেষ্টা করো।";

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: replyContent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        pageId,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error("Send message error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "নেটওয়ার্ক ত্রুটি ঘটেছে। অনুগ্রহ করে ইন্টারনেটে সংযোগ পরীক্ষা করে আবার বার্তা দাও।",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleNextPage = () => setCurrentPageNo((prev) => prev + 1);
  const handlePrevPage = () => setCurrentPageNo((prev) => Math.max(1, prev - 1));

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-65px)] bg-[#0c0d14] text-slate-100 overflow-hidden font-sans">
      {/* ================= LEFT PANEL: NCTB TEXTBOOK VIEWER ================= */}
      <div className="w-full lg:w-1/2 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-800 bg-[#0f1019] relative">
        {/* Top Controls Header */}
        <div className="p-3 bg-[#131524] border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5 shadow-md">
          {/* Class & Subject Selectors */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(Number(e.target.value))}
              className="bg-slate-900 border border-slate-700/80 text-xs sm:text-sm text-violet-300 font-medium rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-violet-500 transition-colors"
            >
              {CLASS_OPTIONS.map((c) => (
                <option key={c.num} value={c.num}>
                  {c.label}
                </option>
              ))}
            </select>

            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="bg-slate-900 border border-slate-700/80 text-xs sm:text-sm text-emerald-300 font-medium rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 transition-colors"
            >
              {(SUBJECT_BY_CLASS[selectedClass] || []).map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>

            {/* Chapter Selector */}
            <select
              value={selectedChapterNo}
              onChange={(e) => {
                const num = Number(e.target.value);
                setSelectedChapterNo(num);
                const ch = availableChapters.find((c) => c.no === num);
                if (ch) setCurrentPageNo(ch.startPage);
              }}
              className="bg-slate-900 border border-slate-700/80 text-xs sm:text-sm text-slate-200 font-medium rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-violet-500 transition-colors max-w-[200px] truncate"
            >
              {availableChapters.map((ch) => (
                <option key={ch.no} value={ch.no}>
                  অধ্যায় {ch.no}: {ch.title}
                </option>
              ))}
            </select>
          </div>

          {/* Page Badge & Navigation */}
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-violet-950/80 border border-violet-500/30 text-violet-300 font-medium">
              পৃষ্ঠা {currentPageNo}
            </span>
            {pageMetadata?.pageType === "exercise" ? (
              <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
                অনুশীলনী
              </span>
            ) : (
              <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                পাঠ / মূল ধারণা
              </span>
            )}
          </div>
        </div>

        {/* Toolbar: Zoom & Page Navigation */}
        <div className="px-4 py-2 bg-[#090a10] border-b border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={currentPageNo <= 1}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded text-slate-200 font-medium transition-all"
            >
              ◀ পূর্ববর্তী
            </button>
            <span className="font-mono text-slate-300">
              পৃষ্ঠা {currentPageNo}
            </span>
            <button
              onClick={handleNextPage}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 font-medium transition-all"
            >
              পরবর্তী ▶
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setZoomLevel((z) => Math.max(50, z - 25))}
              className="p-1 px-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 font-bold"
              title="Zoom Out"
            >
              -
            </button>
            <span className="font-mono text-[11px] min-w-[36px] text-center text-slate-300">
              {zoomLevel}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(250, z + 25))}
              className="p-1 px-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 font-bold"
              title="Zoom In"
            >
              +
            </button>
            <button
              onClick={() => setZoomLevel(100)}
              className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 rounded text-[11px] text-slate-400"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Main High-Res Viewer Area */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-[#07080e] relative select-none">
          {loadingMeta && (
            <div className="absolute inset-0 bg-[#07080e]/80 backdrop-blur-sm z-10 flex items-center justify-center gap-3">
              <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-violet-300 font-medium">পাঠ্যবই লোড হচ্ছে...</span>
            </div>
          )}

          <div
            className="transition-transform duration-200 ease-out origin-center flex items-center justify-center"
            style={{ transform: `scale(${zoomLevel / 100})` }}
          >
            {!imageError && pageMetadata?.imageUrl ? (
              <img
                src={pageMetadata.imageUrl}
                alt={`NCTB Textbook Page ${currentPageNo}`}
                onError={() => setImageError(true)}
                className="max-h-[75vh] w-auto object-contain rounded shadow-2xl border border-slate-800/80 bg-white"
              />
            ) : (
              /* Fallback Viewer Card if image not pre-rendered */
              <div className="w-[380px] h-[520px] bg-[#141624] border border-violet-500/30 rounded-2xl p-6 flex flex-col justify-between shadow-2xl relative overflow-hidden">
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-violet-600/10 rounded-full blur-2xl pointer-events-none" />
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                    <span className="text-xs font-bold tracking-wider text-violet-400 uppercase">
                      NCTB ২০২৬ শিক্ষাবর্ষ
                    </span>
                    <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                      পৃষ্ঠা {currentPageNo}
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-slate-100 mb-1">
                    {pageMetadata?.subject || "পাঠ্যবই"}
                  </h2>
                  <p className="text-sm text-slate-400 mb-4">
                    শ্রেণি {selectedClass} • অধ্যায় {pageMetadata?.chapterNo}: {pageMetadata?.chapterTitle}
                  </p>

                  <div className="bg-[#0b0c16] rounded-xl p-4 border border-slate-800/80 space-y-2">
                    <span className="text-xs font-semibold text-violet-300 block mb-1">
                      মূল শিক্ষণীয় বিষয়সমূহ:
                    </span>
                    {(pageMetadata?.chapterContext?.coreConcepts || []).map((concept, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                        <span className="text-violet-400">•</span>
                        <span>{concept}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-violet-950/30 border border-violet-500/20 rounded-xl text-center">
                  <p className="text-xs text-violet-300 font-medium">
                    💡 ডানের চ্যাটবক্সে প্রশ্ন লিখে এই অধ্যায়ের যেকোনো সমীকরণ বা প্রশ্নের ব্যাখ্যা জানতে চাও।
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= RIGHT PANEL: INTEGRATED SOCRATIC CHAT ================= */}
      <div className="w-full lg:w-1/2 flex flex-col bg-[#0b0c14]">
        {/* Chat Header */}
        <div className="p-3.5 bg-[#121320] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-sm font-bold text-white shadow-lg">
              🎓
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                চলো শিখি শিক্ষক (Shikkhok AI)
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </h3>
              <p className="text-[11px] text-slate-400">
                NCTB কারিকুলাম অনুযায়ী সরাসরি শিক্ষকতায় নিয়োজিত
              </p>
            </div>
          </div>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="px-4 py-2 bg-[#0e0f1a] border-b border-slate-800/60 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => handleSendMessage("এই পৃষ্ঠার অংকগুলো কীভাবে করতে হবে বুঝিয়ে দাও।")}
            className="text-xs px-3 py-1 bg-violet-950/60 hover:bg-violet-900/80 border border-violet-500/30 text-violet-300 rounded-full whitespace-nowrap transition-colors"
          >
            💡 অংকগুলো বুঝিয়ে দাও
          </button>
          <button
            onClick={() => handleSendMessage("প্রথম প্রশ্নটির একটি হিন্ট (Hint) দাও, উত্তর বলো না।")}
            className="text-xs px-3 py-1 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/30 text-amber-300 rounded-full whitespace-nowrap transition-colors"
          >
            🧩 ১ নম্বর প্রশ্নের হিন্ট
          </button>
          <button
            onClick={() => handleSendMessage("এই অধ্যায়ের মূল নিয়ম ও সূত্র কী কী?")}
            className="text-xs px-3 py-1 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/30 text-emerald-300 rounded-full whitespace-nowrap transition-colors"
          >
            📘 মূল নিয়ম ও সূত্র
          </button>
        </div>

        {/* Chat Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  🎓
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-md ${
                  msg.role === "user"
                    ? "bg-violet-600 text-white rounded-tr-none"
                    : "bg-[#161829] border border-slate-800/80 text-slate-100 rounded-tl-none"
                }`}
              >
                <RenderMessage text={msg.content} />
                <span className="text-[10px] text-slate-400 block mt-1 text-right opacity-75">
                  {msg.timestamp}
                </span>
              </div>
            </div>
          ))}

          {isSending && (
            <div className="flex gap-3 justify-start">
              <div className="w-7 h-7 rounded-full bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-xs font-bold shrink-0">
                🎓
              </div>
              <div className="bg-[#161829] border border-slate-800/80 text-slate-300 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-violet-400 animate-ping" />
                <span className="text-xs font-medium text-violet-300">শিক্ষক চিন্তা করছেন...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3 bg-[#11121d] border-t border-slate-800 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="পৃষ্ঠা সম্পর্কিত প্রশ্ন লেখো (যেমন: ১ম সমীকরণটির ২য় ধাপ বুঝিয়ে দাও)..."
            disabled={isSending}
            className="flex-1 bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
          />

          <button
            type="submit"
            disabled={!inputMessage.trim() || isSending}
            className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:hover:bg-violet-600 text-white font-medium rounded-xl text-sm transition-all shadow-lg shadow-violet-600/20"
          >
            পাঠাও
          </button>
        </form>
      </div>
    </div>
  );
}
