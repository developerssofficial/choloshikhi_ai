"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

/* ===================================================================
   CholoShikhi AI — Landing Page
   Sections: Hero · Features · About · Docs · FAQ · CTA
   =================================================================== */

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "About", href: "#about" },
  { label: "Docs", href: "#docs" },
];

const FEATURES = [
  {
    icon: "💬",
    title: "Normal Chat",
    desc: "সাধারণ AI চ্যাট — যেকোনো প্রশ্ন করো, বাংলায় উত্তর পাও।",
    color: "violet",
  },
  {
    icon: "🎓",
    title: "Education Mode",
    desc: "ব্যক্তিগত শিক্ষকের মতো শেখায় — hint, practice, step-by-step।",
    color: "emerald",
  },
  {
    icon: "🔍",
    title: "Web Search",
    desc: "সরাসরি ইন্টারনেট থেকে তথ্য আনে — আবহাওয়া, খবর, দাম সব।",
    color: "sky",
  },
  {
    icon: "📐",
    title: "Math Rendering",
    desc: "LaTeX গণিত সুন্দরভাবে render হয় — বইয়ের মতো দেখতে।",
    color: "amber",
  },
  {
    icon: "🖼️",
    title: "Image Analysis",
    desc: "ছবি পাঠাও, AI বুঝবে ও বর্ণনা করবে বাংলায়।",
    color: "rose",
  },
  {
    icon: "📚",
    title: "Chat Sessions",
    desc: "প্রতিটা conversation save থাকবে — পরে এসে আবার দেখো।",
    color: "indigo",
  },
];

const FAQ_ITEMS = [
  {
    q: "CholoShikhi কি ফ্রি?",
    a: "হ্যাঁ, একদম ফ্রি। কোনো মেসেজ লিমিট নেই, যত খুশি চ্যাট করো।",
  },
  {
    q: "Education Mode কি আলাদা?",
    a: "হ্যাঁ। Normal Mode সাধারণ AI চ্যাট, Education Mode একজন ধৈর্য শিক্ষকের মতো শেখায়। তুমি নিজে থেকে উত্তর দাও, AI hint দেবে।",
  },
  {
    q: "Web Search কিভাবে কাজ করে?",
    a: "Normal Mode-এ AI বুঝবে তোমার প্রশ্নে কারেন্ট তথ্য লাগবে কিনা। লাগলে Tavily API দিয়ে সার্চ করবে, তারপর সেটা দিয়ে উত্তর দেবে।",
  },
  {
    q: "আমার data নিরাপদ কি?",
    a: "হ্যাঁ। তোমার chat history শুধু Supabase database-এ থাকে। Google OAuth দিয়ে login হয়, পাসওয়ার্ড নেই। সব encrypted।",
  },
  {
    q: "কোন কোন ভাষায় কথা বলতে পারি?",
    a: "বাংলা, English, Hindi — AI তোমার ভাষায় উত্তর দেবে।",
  },
  {
    q: "Math equations সঠিকভাবে দেখায়?",
    a: "হ্যাঁ। KaTeX-powered rendering — fraction, integral, summation সব সুন্দরভাবে render হয়।",
  },
];

/* =================================================================== */
/*  COMPONENT                                                          */
/* =================================================================== */

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set([...prev, entry.target.id]));
          }
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll("[data-animate]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[#0f0f14] text-white">

      {/* ===== NAVBAR ===== */}
      <nav
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-[#0f0f14]/90 backdrop-blur-xl border-b border-white/[0.06]" : ""
        }`}
      >
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white text-[11px] font-bold">চ</span>
            </div>
            <span className="text-sm font-semibold text-white/90">CholoShikhi</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="text-[13px] text-gray-400 hover:text-white transition-colors">
                {l.label}
              </a>
            ))}
            <Link href="/chat" className="px-4 py-1.5 text-[12px] font-medium bg-violet-600 rounded-full hover:bg-violet-500 transition-colors">
              Start Chat
            </Link>
          </div>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-gray-400 hover:text-white p-1">
            {mobileMenuOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            )}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/[0.06] bg-[#0f0f14]/95 backdrop-blur-xl px-6 pb-4 pt-2 space-y-2">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setMobileMenuOpen(false)} className="block text-[13px] text-gray-400 hover:text-white py-2">
                {l.label}
              </a>
            ))}
            <Link href="/chat" onClick={() => setMobileMenuOpen(false)} className="block text-center mt-2 px-4 py-2 text-[13px] font-medium bg-violet-600 rounded-full hover:bg-violet-500 transition-colors">
              Start Chat
            </Link>
          </div>
        )}
      </nav>

      {/* ===== HERO ===== */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-violet-600/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-indigo-600/5 rounded-full blur-[100px]" />
        <div className="relative max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-[11px] text-violet-300 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            AI-Powered · Bengali-First
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            চলো <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">শিখি</span> AI দিয়ে
          </h1>
          <p className="text-gray-400 text-[15px] leading-relaxed mb-8 max-w-lg mx-auto">
            CholoShikhi — বাংলাভাষীদের জন্য AI-powered শিক্ষা ও সহকারী।
            নরমাল চ্যাট, Education Mode, Web Search — সব এক জায়গায়।
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/chat" className="px-6 py-2.5 text-[13px] font-medium bg-violet-600 rounded-full hover:bg-violet-500 transition-colors">
              এখনই শুরু করো →
            </Link>
            <a href="#features" className="px-6 py-2.5 text-[13px] text-gray-400 border border-white/[0.08] rounded-full hover:bg-white/[0.04] transition-colors">
              আরো জানো
            </a>
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="features" data-animate className="py-24 px-6" style={{ opacity: visibleSections.has("features") ? 1 : 0, transform: visibleSections.has("features") ? "none" : "translateY(20px)", transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[11px] text-violet-400 font-medium tracking-widest uppercase mb-3">Features</p>
            <h2 className="text-2xl font-bold text-white mb-3">এক জায়গায় সবকিছু</h2>
            <p className="text-gray-500 text-[14px]">শিক্ষা, তথ্য, সৃজনশীলতা — AI দিয়ে সব সম্ভব</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="p-5 rounded-2xl border border-white/[0.06] bg-[#16161e] hover:bg-[#1a1a24] transition-colors group">
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="text-[14px] font-semibold text-white mb-1.5">{f.title}</h3>
                <p className="text-[13px] text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ABOUT ===== */}
      <section id="about" data-animate className="py-24 px-6 border-t border-white/[0.04]" style={{ opacity: visibleSections.has("about") ? 1 : 0, transform: visibleSections.has("about") ? "none" : "translateY(20px)", transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[11px] text-emerald-400 font-medium tracking-widest uppercase mb-3">About</p>
            <h2 className="text-2xl font-bold text-white mb-3">CholoShikhi কী?</h2>
            <p className="text-gray-500 text-[14px] max-w-lg mx-auto">বাংলাভাষী শিক্ষার্থীদের জন্য তৈরি AI-powered শিক্ষা প্ল্যাটফর্ম</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* Mission */}
            <div className="p-6 rounded-2xl border border-white/[0.06] bg-[#16161e]">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h3 className="text-[15px] font-semibold text-white mb-2">আমাদের লক্ষ্য</h3>
              <p className="text-[13px] text-gray-500 leading-relaxed">
                CholoShikhi-র লক্ষ্য হলো বাংলাভাষী শিক্ষার্থীদের AI-এর শক্তি দিয়ে সশক্ত করা।
                গণিত হোক, বিজ্ঞান হোক, বা প্রোগ্রামিং — প্রতিটা বিষয়ে বাংলায়
                ধাপে ধাপে শেখানো আমাদের প্রধান উদ্দেশ্য। আমরা চাই প্রতিটা শিক্ষার্থী
                যেখানেই থাকুক, তার মাতৃভাষায় মানসম্মত শিক্ষা পাক।
              </p>
            </div>
            {/* How it works */}
            <div className="p-6 rounded-2xl border border-white/[0.06] bg-[#16161e]">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
              </div>
              <h3 className="text-[15px] font-semibold text-white mb-2">কিভাবে কাজ করে</h3>
              <p className="text-[13px] text-gray-500 leading-relaxed">
                <strong className="text-gray-300">Normal Mode:</strong> সরাসরি AI-কে প্রশ্ন করো, উত্তর পাও।
                Web সার্চ লাগলে AI নিজেই বুঝে সার্চ করে।
                <br /><br />
                <strong className="text-gray-300">Education Mode:</strong> AI একজন শিক্ষকের মতো আচরণ করে।
                প্রথমে বোঝায়, তারপর check question করে।
                ভুল করলে hint দেয়, পুরো answer দেয় না।
                তুমি নিজে শিখবে।
              </p>
            </div>
          </div>

          {/* Tech Stack */}
          <div className="p-6 rounded-2xl border border-white/[0.06] bg-[#16161e]">
            <h3 className="text-[15px] font-semibold text-white mb-4 text-center">যেসব প্রযুক্তি ব্যবহার করা হয়েছে</h3>
            <div className="flex flex-wrap justify-center gap-2">
              {["Next.js 15", "React 19", "TypeScript", "Tailwind CSS", "Supabase", "Google Gemini AI", "Xiaomi MIMO", "Tavily Search", "KaTeX", "Vercel"].map((t) => (
                <span key={t} className="px-3 py-1.5 text-[11px] text-gray-400 bg-white/[0.04] border border-white/[0.06] rounded-full">{t}</span>
              ))}
            </div>
          </div>

          {/* Team */}
          <div className="mt-6 p-6 rounded-2xl border border-white/[0.06] bg-[#16161e] text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-lg font-bold">X</span>
            </div>
            <h3 className="text-[15px] font-semibold text-white mb-1">Xparrow Team</h3>
            <p className="text-[12px] text-gray-500 mb-2">CholoShikhi তৈরি ও পরিচালনা করছে</p>
            <p className="text-[12px] text-gray-600">২০২৫ সালে প্রতিষ্ঠিত · বাংলাদেশ</p>
          </div>
        </div>
      </section>

      {/* ===== DOCS ===== */}
      <section id="docs" data-animate className="py-24 px-6 border-t border-white/[0.04]" style={{ opacity: visibleSections.has("docs") ? 1 : 0, transform: visibleSections.has("docs") ? "none" : "translateY(20px)", transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[11px] text-sky-400 font-medium tracking-widest uppercase mb-3">Documentation</p>
            <h2 className="text-2xl font-bold text-white mb-3">শুরুর গাইড</h2>
            <p className="text-gray-500 text-[14px]">CholoShikhi কিভাবে ব্যবহার করবে — ধাপে ধাপে</p>
          </div>

          <div className="space-y-4">
            {/* Step 1 */}
            <div className="p-5 rounded-2xl border border-white/[0.06] bg-[#16161e] flex gap-4">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-violet-400 text-[13px] font-bold">১</span>
              </div>
              <div>
                <h4 className="text-[14px] font-semibold text-white mb-1">চ্যাটে যাও</h4>
                <p className="text-[13px] text-gray-500 leading-relaxed">
                  হোমপেইজ থেকে <strong className="text-gray-300">"এখনই শুরু করো"</strong> বাটনে ক্লিক করো
                  অথবা <strong className="text-gray-300">Start Chat</strong>-এ যাও।
                  লগইন ছাড়াই চ্যাট করতে পারো — সরাসরি AI-কে প্রশ্ন করো।
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-5 rounded-2xl border border-white/[0.06] bg-[#16161e] flex gap-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-emerald-400 text-[13px] font-bold">২</span>
              </div>
              <div>
                <h4 className="text-[14px] font-semibold text-white mb-1">Mode বাছাই করো</h4>
                <p className="text-[13px] text-gray-500 leading-relaxed">
                  হেডারে দুটো button পাবে:
                  <strong className="text-violet-400"> Normal</strong> (সাধারণ AI চ্যাট) এবং
                  <strong className="text-emerald-400"> Shikkhok</strong> (শেখানোর মোড)।
                  যেকোনো একটা বেছে নাও।
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-5 rounded-2xl border border-white/[0.06] bg-[#16161e] flex gap-4">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sky-400 text-[13px] font-bold">৩</span>
              </div>
              <div>
                <h4 className="text-[14px] font-semibold text-white mb-1">প্রশ্ন করো</h4>
                <p className="text-[13px] text-gray-500 leading-relaxed">
                  নিচের input box-এ তোমার প্রশ্ন লেখো অথবা image পাঠাও।
                  Enter চাপো। AI তোমার ভাষায় উত্তর দেবে — বাংলায়, English-এ, যে ভাষায় লিখেছো।
                  গণিতের সমস্যাগুলো KaTeX দিয়ে সুন্দরভাবে render হবে।
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-5 rounded-2xl border border-white/[0.06] bg-[#16161e] flex gap-4">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-amber-400 text-[13px] font-bold">৪</span>
              </div>
              <div>
                <h4 className="text-[14px] font-semibold text-white mb-1">History দেখো</h4>
                <p className="text-[13px] text-gray-500 leading-relaxed">
                  Google দিয়ে login করলে প্রতিটা conversation auto-save হবে।
                  সাইডবারের <strong className="text-gray-300">History</strong> আইকনে ক্লিক করে পুরোনো চ্যাটগুলো দেখতে পারো।
                  নতুন চ্যাট শুরু করতে <strong className="text-gray-300">+</strong> বাটন চাপো।
                </p>
              </div>
            </div>

            {/* Tip */}
            <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/10 flex gap-3">
              <svg className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <div>
                <p className="text-[12px] text-violet-300 font-medium mb-0.5">Pro Tip</p>
                <p className="text-[12px] text-gray-500">Education Mode-এ "আমি বুঝিনি" বলো — AI নতুন করে বোঝাবে। Hint নাও, ধাপে ধাপে শেখাও — এটাই শিক্ষকের কাজ।</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" data-animate className="py-24 px-6 border-t border-white/[0.04]" style={{ opacity: visibleSections.has("faq") ? 1 : 0, transform: visibleSections.has("faq") ? "none" : "translateY(20px)", transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)" }}>
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[11px] text-gray-500 font-medium tracking-widest uppercase mb-3">FAQ</p>
            <h2 className="text-2xl font-bold text-white">বারবার জিজ্ঞাসা</h2>
          </div>
          <div className="space-y-2">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="border border-white/[0.06] rounded-xl overflow-hidden bg-[#16161e]">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <span className="text-[14px] text-gray-300 font-medium">{item.q}</span>
                  <svg className={`w-4 h-4 text-gray-600 flex-shrink-0 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                <div className={`transition-all duration-300 ease-out ${openFaq === i ? "max-h-40 opacity-100" : "max-h-0 opacity-0"} overflow-hidden`}>
                  <p className="px-5 pb-4 text-[13px] text-gray-500 leading-relaxed">{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="py-24 px-6">
        <div className="max-w-xl mx-auto text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mx-auto mb-5">
            <span className="text-white text-lg font-bold">চ</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">এখনই শুরু করো</h2>
          <p className="text-gray-500 text-[14px] mb-6">ফ্রি, সীমাহীন, বাংলায় — একবার try করো</p>
          <Link href="/chat" className="inline-block px-8 py-3 text-[14px] font-medium bg-violet-600 rounded-full hover:bg-violet-500 transition-colors">
            চলো শিখি →
          </Link>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-white/[0.04] py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white text-[8px] font-bold">চ</span>
            </div>
            <span className="text-[12px] text-gray-600">© 2025 CholoShikhi · Xparrow Team</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#features" className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors">Features</a>
            <a href="#about" className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors">About</a>
            <a href="#docs" className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors">Docs</a>
            <Link href="/chat" className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors">Chat</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
