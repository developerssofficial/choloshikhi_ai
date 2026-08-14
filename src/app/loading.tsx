"use client";

import { ViewTransition } from "react";

export default function HomeLoading() {
  return (
    <ViewTransition enter="page-enter" default="none">
      <div className="min-h-screen bg-[#0f0f14]">
        {/* Navbar skeleton */}
        <div className="fixed top-0 inset-x-0 z-50 h-14 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/[0.06] animate-pulse" />
            <div className="w-24 h-4 rounded bg-white/[0.04] animate-pulse" />
          </div>
        </div>

        {/* Hero skeleton */}
        <div className="flex flex-col items-center justify-center min-h-screen px-6 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.06] animate-pulse" />
          <div className="w-64 h-8 rounded-lg bg-white/[0.04] animate-pulse" />
          <div className="w-80 h-4 rounded bg-white/[0.03] animate-pulse" />
          <div className="w-40 h-10 rounded-full bg-violet-600/20 animate-pulse mt-4" />
        </div>
      </div>
    </ViewTransition>
  );
}
