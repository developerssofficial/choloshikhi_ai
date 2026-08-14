"use client";

import { ViewTransition } from "react";

export default function ChatLoading() {
  return (
    <ViewTransition enter="page-enter" default="none">
      <div className="flex h-screen bg-[#0f0f14]">
        {/* Sidebar skeleton */}
        <aside className="hidden md:flex flex-col w-[52px] border-r border-white/[0.06] bg-[#111118] py-3 items-center gap-1 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-white/[0.06] animate-pulse mb-2" />
          <div className="w-9 h-9 rounded-lg bg-white/[0.04] animate-pulse" />
          <div className="w-9 h-9 rounded-lg bg-white/[0.04] animate-pulse" />
          <div className="flex-1" />
          <div className="w-8 h-8 rounded-full bg-white/[0.04] animate-pulse mb-2" />
        </aside>

        {/* Chat area skeleton */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header skeleton */}
          <div className="h-12 border-b border-white/[0.06] flex items-center justify-center px-4">
            <div className="flex items-center gap-2">
              <div className="w-14 h-5 rounded-full bg-white/[0.04] animate-pulse" />
              <div className="w-16 h-5 rounded-full bg-white/[0.04] animate-pulse" />
              <div className="w-12 h-5 rounded-full bg-white/[0.04] animate-pulse" />
            </div>
          </div>

          {/* Messages skeleton */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.06] animate-pulse" />
            <div className="w-48 h-5 rounded-lg bg-white/[0.04] animate-pulse" />
            <div className="w-32 h-3 rounded-lg bg-white/[0.03] animate-pulse" />
          </div>

          {/* Input skeleton */}
          <div className="px-4 pb-4 md:pb-6">
            <div className="max-w-2xl mx-auto">
              <div className="h-12 rounded-2xl bg-white/[0.04] animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </ViewTransition>
  );
}
