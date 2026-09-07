"use client";

import { useState } from "react";
import ChatInterface from "@/components/ChatInterface";
import ShikkhokTextbookViewer from "@/components/ShikkhokTextbookViewer";

export default function TeacherChatPage() {
  const [activeTab, setActiveTab] = useState<"viewer" | "chat">("viewer");

  return (
    <div className="flex flex-col min-h-screen bg-[#08090f]">
      {/* Header View Switcher Bar */}
      <div className="bg-[#10111a] border-b border-slate-800 px-4 py-2 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h1 className="text-sm font-bold text-slate-100">
            শিক্ষক মোড (Shikkhok Mode)
          </h1>
        </div>

        <div className="flex items-center bg-slate-900/90 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("viewer")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "viewer"
                ? "bg-violet-600 text-white shadow-md shadow-violet-600/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            📖 পাঠ্যবই লাইভ ভিউয়ার
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "chat"
                ? "bg-violet-600 text-white shadow-md shadow-violet-600/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            💬 ফ্রি-ফর্ম চ্যাট
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1">
        {activeTab === "viewer" ? (
          <ShikkhokTextbookViewer />
        ) : (
          <ChatInterface initialMode="education" />
        )}
      </div>
    </div>
  );
}
