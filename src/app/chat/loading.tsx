"use client";

import { ViewTransition } from "react";

export default function ChatLoading() {
  return (
    <ViewTransition enter="page-enter" default="none">
      <div className="flex h-screen bg-[#0f0f14]">
        {/* Sidebar skeleton */}
        <aside className="hidden md:flex flex-col w-[60px] border-r border-white/[0.06] py-4 items-center gap-4">
          <div className="w-9 h-9 rounded-lg bg-white/[0.06] animate-pulse" />
          <div className="flex flex-col items-center gap-3 mt-4">
            <div className="w-9 h-9 rounded-lg bg-white/[0.04] animate-pulse" />
            <div className="w-9 h-9 rounded-lg bg-white/[0.04] animate-pulse" />
          </div>
        </aside>

        {/* Chat area skeleton */}
        <div className="flex-1 flex flex-col">
          {/* Header skeleton */}
          <div className="h-12 border-b border-white/[0.06] flex items-center px-4 gap-3">
            <div className="w-16 h-5 rounded-md bg-white/[0.04] animate-pulse" />
            <div className="w-20 h-5 rounded-md bg-white/[0.04] animate-pulse" />
            <div className="w-16 h-5 rounded-md bg-white/[0.04] animate-pulse" />
          </div>

          {/* Messages skeleton */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 gap-3">
            <div className="w-10 h-10 rounded-full bg-white/[0.06] animate-pulse" />
            <div className="w-48 h-4 rounded-lg bg-white/[0.04] animate-pulse" />
            <div className="w-32 h-3 rounded-lg bg-white/[0.03] animate-pulse" />
          </div>

          {/* Input skeleton */}
          <div className="px-4 pb-4">
            <div className="h-12 rounded-2xl bg-white/[0.04] animate-pulse" />
          </div>
        </div>
      </div>
    </ViewTransition>
  );
}
