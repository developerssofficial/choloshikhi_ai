"use client";

import React, { useState, useEffect, useRef } from "react";
import RenderMessage from "@/components/RenderMessage";

interface Chapter {
  chapter_id: string;
  chapter_number: string;
  chapter_title: string;
  chapter_type: string;
  start_page: number;
  end_page: number;
  summary: string;
}

interface InteractiveTextbookStudioProps {
  isOpen: boolean;
  onClose: () => void;
  initialPage?: number;
  initialChapter?: string;
  onSendMessageToChat?: (message: string) => void;
}

const TOTAL_PAGES = 90;
const BOOK_NAME = "আমার বাংলা বই (১ম শ্রেণি)";
const BOOK_ID = "2026-primary-class-1-bangla";

export default function InteractiveTextbookStudio({
  isOpen,
  onClose,
  initialPage = 1,
  onSendMessageToChat,
}: InteractiveTextbookStudioProps) {
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loadingChapters, setLoadingChapters] = useState<boolean>(true);
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [chatInput, setChatInput] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [showChaptersDrawer, setShowChaptersDrawer] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const filmstripRef = useRef<HTMLDivElement>(null);

  // Fetch chapters for Class 1 Bangla
  useEffect(() => {
    async function loadChapters() {
      try {
        setLoadingChapters(true);
        const res = await fetch(`/api/books/${BOOK_ID}/chapters`);
        if (res.ok) {
          const data = await res.json();
          setChapters(data.chapters || []);
        }
      } catch (e) {
        console.error("Failed to load chapters:", e);
      } finally {
        setLoadingChapters(false);
      }
    }
    if (isOpen) {
      loadChapters();
    }
  }, [isOpen]);

  const [sendImageVision, setSendImageVision] = useState<boolean>(true);

  // Helper to load current page image as base64 for direct Vision AI processing
  const getPageImageBase64 = async (pageNumber: number): Promise<string | null> => {
    try {
      const res = await fetch(`/textbooks/class-1-bangla/page_${pageNumber}.png`);
      if (!res.ok) return null;
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.error("Failed to load page image as base64:", err);
      return null;
    }
  };

  // PDF Page 10 is Printed Page 1 in Class 1 Bangla
  const printedPage = currentPage >= 10 ? currentPage - 9 : null;

  // Find current active chapter based on printed page
  const activeChapter = printedPage !== null
    ? chapters.find((c) => printedPage >= c.start_page && printedPage <= c.end_page)
    : chapters.find((c) => currentPage >= c.start_page && currentPage <= c.end_page);

  // Auto scroll filmstrip thumbnail into view
  useEffect(() => {
    if (filmstripRef.current) {
      const activeThumb = filmstripRef.current.querySelector(`[data-page="${currentPage}"]`);
      if (activeThumb) {
        activeThumb.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
  }, [currentPage]);

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  if (!isOpen) return null;

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage((p) => p - 1);
  };

  const handleNextPage = () => {
    if (currentPage < TOTAL_PAGES) setCurrentPage((p) => p + 1);
  };

  const handleSendQuery = async (queryText?: string) => {
    const textToSend = queryText || chatInput.trim();
    if (!textToSend || isSending) return;

    const userMsg = { role: "user" as const, content: textToSend };
    setChatMessages((prev) => [...prev, userMsg]);
    if (!queryText) setChatInput("");
    setIsSending(true);

    try {
      let pageImageBase64: string | null = null;
      if (sendImageVision) {
        pageImageBase64 = await getPageImageBase64(currentPage);
      }

      const chapterLabel = activeChapter
        ? `পাঠ ${activeChapter.chapter_number}: ${activeChapter.chapter_title}`
        : "আমার বাংলা বই";
      const pageNumStr = printedPage !== null ? `পৃষ্ঠা ${printedPage}` : `পৃষ্ঠা ${currentPage}`;

      const messageToApi =
        textToSend.includes("পাঠ") || textToSend.includes("বাংলা বই")
          ? textToSend
          : `১ম শ্রেণির বাংলা বইয়ের "${chapterLabel}" (${pageNumStr}) প্রসঙ্গে: ${textToSend}`;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageToApi,
          image: pageImageBase64 || undefined,
          mode: "education",
          memory: chatMessages.slice(-4),
          selectedBookId: BOOK_ID,
          selectedClass: 1,
          selectedSubject: "বাংলা",
          selectedPage: printedPage !== null ? printedPage : currentPage,
          selectedChapterId: activeChapter?.chapter_id,
          selectedChapterNumber: activeChapter?.chapter_number,
          selectedChapterTitle: activeChapter?.chapter_title,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.response || "দুঃখিত, কোনো উত্তর পাওয়া যায়নি।",
          },
        ]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "দুঃখিত, তথ্য লোড করতে সাময়িক সমস্যা হয়েছে। আবার চেষ্টা করুন।",
          },
        ]);
      }
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "নেটওয়ার্ক ত্রুটি। ইন্টারনেট সংযোগ যাচাই করুন।",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4">
      <div className="bg-[#090d16] border border-slate-700/80 rounded-2xl w-full max-w-7xl h-[95vh] shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Top Master Header */}
        <div className="px-4 py-3 bg-[#0f1422] border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-xl shrink-0">
              📖
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white truncate">
                  {BOOK_NAME} — লাইভ ইন্টারেক্টিভ পাঠ্যবই ও শিক্ষক
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30 shrink-0">
                  NCTB ২০২৬ অফিশিয়াল
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                বাম পাশে বইয়ের আসল রঙিন পাতা দেখুন • ডান পাশে এআই শিক্ষকের সাথে প্রশ্ন-উত্তর ও ফ্লো-চার্ট শিখুন
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowChaptersDrawer(!showChaptersDrawer)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              📑 সূচিপত্র ({chapters.length}টি পাঠ)
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-400 flex items-center justify-center transition-colors text-sm font-bold border border-slate-700"
              title="বন্ধ করো"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Main Workspace: Left (Book Viewer) + Right (AI Tutor Chat) */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden relative">
          
          {/* LEFT PANEL: Textbook Page Viewer (55% width on desktop) */}
          <div className="w-full md:w-[55%] border-r border-slate-800 flex flex-col bg-[#0b0f19] overflow-hidden">
            
            {/* Viewer Control Bar */}
            <div className="px-3 sm:px-4 py-2 bg-[#121826] border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage <= 1}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold text-white transition-colors"
                  title="পূর্ববর্তী পৃষ্ঠা"
                >
                  ◀ পূর্বের পৃষ্ঠা
                </button>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700">
                  পৃষ্ঠা {currentPage} / {TOTAL_PAGES}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage >= TOTAL_PAGES}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold text-white transition-colors"
                  title="পরবর্তী পৃষ্ঠা"
                >
                  পরের পৃষ্ঠা ▶
                </button>
              </div>

              {/* Zoom & Jump */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-900 rounded-lg border border-slate-800 text-xs">
                  <button
                    onClick={() => setZoomLevel((z) => Math.max(70, z - 15))}
                    className="px-2 py-1 hover:bg-slate-800 text-slate-300 rounded-l-lg"
                    title="জুম কমান"
                  >
                    -
                  </button>
                  <span className="px-2 font-mono text-[11px] text-slate-400">{zoomLevel}%</span>
                  <button
                    onClick={() => setZoomLevel((z) => Math.min(180, z + 15))}
                    className="px-2 py-1 hover:bg-slate-800 text-slate-300 rounded-r-lg"
                    title="জুম বাড়ান"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Current Active Chapter Banner */}
            {activeChapter && (
              <div className="px-4 py-1.5 bg-emerald-950/40 border-b border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
                <span className="font-semibold truncate">
                  🎯 পাঠ {activeChapter.chapter_number}: {activeChapter.chapter_title} ({activeChapter.chapter_type})
                </span>
                <span className="text-[10px] text-emerald-400/80 font-mono shrink-0">
                  পৃষ্ঠা {activeChapter.start_page}–{activeChapter.end_page}
                </span>
              </div>
            )}

            {/* Page Canvas Viewport */}
            <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center p-3 sm:p-6 bg-[#070a10]">
              <div
                className="transition-transform duration-150 ease-out origin-center shadow-2xl rounded-lg overflow-hidden border border-slate-700/60 bg-white"
                style={{ transform: `scale(${zoomLevel / 100})` }}
              >
                <img
                  src={`/textbooks/class-1-bangla/page_${currentPage}.png`}
                  alt={`পৃষ্ঠা ${currentPage} - ${BOOK_NAME}`}
                  className="max-h-[65vh] w-auto object-contain block select-none pointer-events-auto"
                  loading="eager"
                  onError={(e) => {
                    // Fallback placeholder if image not loaded
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              </div>
            </div>

            {/* Filmstrip Thumbnail Slider (Bottom) */}
            <div className="p-2 bg-[#0e1320] border-t border-slate-800 flex items-center gap-2 overflow-x-auto shrink-0" ref={filmstripRef}>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-2 shrink-0">
                পৃষ্ঠা তালিকা:
              </span>
              {Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1).map((pgNum) => {
                const isSelected = pgNum === currentPage;
                return (
                  <button
                    key={pgNum}
                    data-page={pgNum}
                    onClick={() => setCurrentPage(pgNum)}
                    className={`h-11 w-9 rounded-lg border flex flex-col items-center justify-center shrink-0 transition-all ${
                      isSelected
                        ? "bg-emerald-600 border-emerald-400 text-white font-bold scale-105 shadow-md"
                        : "bg-slate-900/80 hover:bg-slate-800 border-slate-700/80 text-slate-300"
                    }`}
                  >
                    <span className="text-[10px] font-mono leading-none">{pgNum}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT PANEL: AI Tutor Chat & Page Learning (45% width) */}
          <div className="w-full md:w-[45%] flex flex-col bg-[#090d16] overflow-hidden">
            
            {/* AI Tutor Page Lock Header & Vision Status */}
            <div className="px-4 py-2.5 bg-[#101625] border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-xs font-bold text-white truncate">
                  👨‍🏫 এআই গৃহশিক্ষক — পৃষ্ঠা {currentPage} {printedPage !== null ? `(বইয়ের মূল পৃষ্ঠা ${printedPage})` : ""}
                </span>
              </div>
              <button
                onClick={() => setSendImageVision(!sendImageVision)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border flex items-center gap-1.5 transition-all shrink-0 ${
                  sendImageVision
                    ? "bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-sm"
                    : "bg-slate-800 border-slate-700 text-slate-400"
                }`}
                title="পৃষ্ঠাটির আসল ছবি সরাসরি এআইকে পাঠানো নিয়ন্ত্রণ করুন"
              >
                <span>{sendImageVision ? "👁️ ছবি দেখে পাঠদান (Vision On)" : "📷 ছবি পাঠানো বন্ধ"}</span>
              </button>
            </div>

            {/* Quick Action Chips for This Page */}
            <div className="p-2.5 bg-[#0d121e] border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto shrink-0">
              <button
                onClick={() =>
                  handleSendQuery(
                    `এই পৃষ্ঠার ছবিটিতে কী কী আঁকা বা লেখা আছে তা দেখে সহজ ও সুন্দর ভাষায় বুঝিয়ে দিন।`
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-emerald-950/80 hover:border-emerald-500 border border-slate-700 text-slate-200 text-[11px] font-medium shrink-0 transition-colors flex items-center gap-1"
              >
                <span>🖼️ ছবির বর্ণনা</span>
              </button>
              <button
                onClick={() =>
                  handleSendQuery(
                    `এই পৃষ্ঠার মূল গল্প বা ছড়াটি সুন্দর ও সুর করে পড়িয়ে বুঝিয়ে দিন।`
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-emerald-950/80 hover:border-emerald-500 border border-slate-700 text-slate-200 text-[11px] font-medium shrink-0 transition-colors flex items-center gap-1"
              >
                <span>📖 গল্প/ছড়া পড়াও</span>
              </button>
              <button
                onClick={() =>
                  handleSendQuery(
                    `এই পৃষ্ঠার পাঠের জন্য একটি সুন্দর ভিজ্যুয়াল ফ্লো-চার্ট বানিয়ে ধাপে ধাপে বুঝিয়ে দিন।`
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-emerald-900/60 hover:bg-emerald-800 border border-emerald-500 text-emerald-200 text-[11px] font-semibold shrink-0 transition-colors flex items-center gap-1"
              >
                <span>🗺️ ফ্লো-চার্ট প্ল্যান</span>
              </button>
              <button
                onClick={() =>
                  handleSendQuery(
                    `এই পৃষ্ঠার বিষয়বস্তু ও ছবি থেকে আমাকে ১টি ছোট প্রশ্ন জিজ্ঞেস করুন তো!`
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-purple-950/80 hover:border-purple-500 border border-slate-700 text-purple-200 text-[11px] font-medium shrink-0 transition-colors flex items-center gap-1"
              >
                <span>🏆 কুইজ প্রশ্ন</span>
              </button>
            </div>

            {/* Chat Stream Messages */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-2xl">
                    🌱
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">
                      পৃষ্ঠা {currentPage} এ আপনাকে স্বাগতম!
                    </h3>
                    <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                      বামের পাতায় চোখ রাখুন এবং নিচের যেকোনো বোতাম চেপে বা মেসেজ পাঠিয়ে এআই শিক্ষকের কাছ থেকে পড়া বুঝে নিন।
                    </p>
                  </div>
                </div>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[92%] rounded-2xl px-4 py-3 text-xs sm:text-[13.5px] leading-relaxed shadow-md ${
                        msg.role === "user"
                          ? "bg-emerald-600 text-white rounded-tr-sm"
                          : "bg-[#131929] border border-slate-800 text-slate-100 rounded-tl-sm"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <RenderMessage text={msg.content} />
                      ) : (
                        <span>{msg.content}</span>
                      )}
                    </div>
                  </div>
                ))
              )}

              {isSending && (
                <div className="flex items-center gap-2 text-xs text-emerald-400 py-2">
                  <div className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                  <span>শিক্ষক পৃষ্ঠা {currentPage} এর তথ্য বিশ্লেষণ করে উত্তর প্রস্তুত করছেন...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input Bar */}
            <div className="p-3 bg-[#0f1422] border-t border-slate-800 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendQuery();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={`পৃষ্ঠা ${currentPage} সম্পর্কে শিক্ষককে জিজ্ঞেস করুন...`}
                  className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || isSending}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors shrink-0 shadow-md"
                >
                  পাঠান ➔
                </button>
              </form>
            </div>
          </div>

          {/* Chapters Accordion Drawer (Overlay) */}
          {showChaptersDrawer && (
            <div className="absolute inset-y-0 right-0 w-80 bg-[#0e1422] border-l border-slate-700 z-30 shadow-2xl flex flex-col p-4 overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-2 shrink-0">
                <h3 className="text-xs font-bold text-white">📑 সকল পাঠের তালিকা ({chapters.length}টি)</h3>
                <button
                  onClick={() => setShowChaptersDrawer(false)}
                  className="text-slate-400 hover:text-white text-xs font-bold"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {chapters.map((ch) => {
                  const targetPdfPage = ch.start_page + 9;
                  const isActive =
                    printedPage !== null
                      ? printedPage >= ch.start_page && printedPage <= ch.end_page
                      : currentPage === targetPdfPage;
                  return (
                    <button
                      key={ch.chapter_id}
                      onClick={() => {
                        setCurrentPage(targetPdfPage);
                        setShowChaptersDrawer(false);
                      }}
                      className={`w-full p-2.5 rounded-xl border text-left text-xs transition-colors flex items-center justify-between ${
                        isActive
                          ? "bg-emerald-950/70 border-emerald-500 text-white font-bold"
                          : "bg-slate-900/60 hover:bg-slate-800/80 border-slate-800 text-slate-300"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-semibold truncate">
                          পাঠ {ch.chapter_number}: {ch.chapter_title}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{ch.chapter_type}</div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 font-mono text-emerald-400 shrink-0">
                        পৃ. {ch.start_page}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
