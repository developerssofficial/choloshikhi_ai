"use client";

import { ViewTransition } from "react";

export default function DownloadPage() {
  return (
    <ViewTransition enter="page-enter" default="none">
      <div className="min-h-screen bg-[#0f0f14] flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-6 h-14 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3">
            <img src="/logo-source.png" alt="CholoShikhi" className="w-8 h-8 rounded-lg object-contain" />
            <span className="text-sm font-semibold text-white/90">CholoShikhi</span>
          </div>
          <a href="/chat" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
            Chat-এ ফিরুন →
          </a>
        </header>

        {/* Content */}
        <main className="flex-1 flex flex-col items-center px-4 py-12">
          <img src="/logo-source.png" alt="CholoShikhi" className="w-16 h-16 rounded-2xl object-contain shadow-2xl shadow-violet-500/20 mb-4" />
          <h1 className="text-white text-xl font-bold mb-1">CholoShikhi ডাউনলোড করো</h1>
          <p className="text-gray-500 text-xs mb-10">তোমার পছন্দের ডিভাইসে CholoShikhi ব্যবহার করো</p>

          <div className="flex flex-col sm:flex-row gap-5 w-full max-w-xl">
            {/* Windows Card */}
            <div className="flex-1 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 flex flex-col items-center text-center hover:border-violet-500/30 hover:bg-white/[0.05] transition-all">
              <div className="w-12 h-12 rounded-xl bg-[#0078d4]/15 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-[#0078d4]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
                </svg>
              </div>
              <h2 className="text-white text-sm font-semibold mb-1">Windows</h2>
              <p className="text-gray-500 text-[10px] mb-5 leading-relaxed">Windows 10/11 · Desktop App</p>
              <button
                onClick={() => alert("Download link will be available after the installer is uploaded to the server.")}
                className="w-full py-2.5 rounded-xl bg-violet-600 text-white text-xs font-medium hover:bg-violet-500 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Download .exe
              </button>
              <p className="text-gray-600 text-[9px] mt-3">v1.0.0 · ~113 MB</p>
            </div>

            {/* Android Card */}
            <div className="flex-1 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 flex flex-col items-center text-center hover:border-emerald-500/30 hover:bg-white/[0.05] transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24a8.29 8.29 0 00-6.8 0L7.23 5.67c-.19-.29-.58-.38-.87-.2-.28.18-.37.54-.22.83L8 9.48C5.42 11.12 3.72 13.9 3.28 17h17.44c-.44-3.1-2.14-5.88-4.72-7.52zM8.5 14.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm7 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
                </svg>
              </div>
              <h2 className="text-white text-sm font-semibold mb-1">Android</h2>
              <p className="text-gray-500 text-[10px] mb-5 leading-relaxed">Android 8+ · Mobile App</p>
              <button
                onClick={() => alert("Coming soon! We are working on the Android app.")}
                className="w-full py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-gray-400 text-xs font-medium hover:bg-white/[0.1] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Coming Soon
              </button>
              <p className="text-gray-600 text-[9px] mt-3">শীঘ্রই আসছে</p>
            </div>
          </div>

          {/* Web Version */}
          <div className="w-full max-w-xl mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
            </div>
            <div className="flex-1">
              <p className="text-white text-xs font-medium">ওয়েব ভার্সন</p>
              <p className="text-gray-500 text-[10px]">কোনো ডাউনলোড ছাড়াই ব্রাউজারে ব্যবহার করো</p>
            </div>
            <a href="/chat" className="px-4 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-gray-300 text-[11px] hover:bg-white/[0.1] transition-all">
              Open Web →
            </a>
          </div>

          {/* Requirements */}
          <div className="w-full max-w-xl mt-8 text-center">
            <p className="text-gray-600 text-[9px] leading-relaxed">
              Windows: Windows 10+ · 200MB free space · Internet required
            </p>
          </div>
        </main>
      </div>
    </ViewTransition>
  );
}
