"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePWAInstall } from "@/lib/pwa";

/* ===================================================================
   CholoShikhi AI — Landing Page
   Sections: Hero · Features · About · Docs · FAQ · App · CTA
   =================================================================== */

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "About", href: "#about" },
  { label: "Docs", href: "#docs" },
  { label: "Download", href: "#download" },
  { label: "App", href: "#app" },
];

const FEATURES = [
  {
    icon: "💬",
    title: "AI Assistant",
    desc: "যেকোনো প্রশ্ন করো — সহজ, পরিষ্কার ভাষায় উত্তর পাও। বাংলায়, English-এ, যে ভাষায় চাও।",
    color: "violet",
  },
  {
    icon: "🎓",
    title: "Shikkhok Mode",
    desc: "না বুঝলে ধাপে ধাপে শেখায়। Hint দেয়, check question করে — তুমি নিজেই শিখবে।",
    color: "emerald",
  },
  {
    icon: "🔍",
    title: "Smart Web Search",
    desc: "সাম্প্রতিক তথ্য দরকার হলে খুঁজে এনে source সহ উত্তর দেয় — আবহাওয়া, খবর, দাম।",
    color: "sky",
  },
  {
    icon: "📐",
    title: "Math Support",
    desc: "Equation, fraction, formula — গণিতের expression বইয়ের মতো সুন্দরভাবে দেখায়।",
    color: "amber",
  },
  {
    icon: "🖼️",
    title: "Image Understanding",
    desc: "ছবি পাঠাও, AI দেখে বুঝবে ও বাংলায় বর্ণনা করবে। প্রশ্নের ছবি হলে সাহায্য করবে।",
    color: "rose",
  },
  {
    icon: "📚",
    title: "Chat History",
    desc: "প্রতিটা conversation auto-save থাকবে। পরে এসে সহজে খুঁজে আবার চালিয়ে যাও।",
    color: "indigo",
  },
];

const FAQ_ITEMS = [
  {
    q: "CholoShikhi কি ফ্রি?",
    a: "হ্যাঁ, একদম ফ্রি। কোনো মেসেজ লিমিট নেই, যত খুশি চ্যাট করো।",
  },
  {
    q: "Shikkhok Mode কি আলাদা?",
    a: "হ্যাঁ। Normal Mode-এ সরাসরি উত্তর পাও। Shikkhok Mode-এ AI একজন ধৈর্য শিক্ষকের মতো আচরণ করে — প্রথমে বোঝায়, তারপর check question করে, ভুল করলে hint দেয়। তুমি নিজেই শিখবে।",
  },
  {
    q: "Web Search কিভাবে কাজ করে?",
    a: "Normal Mode-এ AI নিজেই বুঝে দেখে তোমার প্রশ্নে সাম্প্রতিক তথ্য লাগবে কিনা। লাগলে ইন্টারনেট থেকে খুঁজে এনে source সহ উত্তর দেয়।",
  },
  {
    q: "আমার data নিরাপদ কি?",
    a: "হ্যাঁ। তোমার chat history শুধুমাত্র তোমারই দেখা যায়। Google দিয়ে login হয়, পাসওয়ার্ড নেই। সব encrypted।",
  },
  {
    q: "কোন কোন ভাষায় কথা বলতে পারি?",
    a: "বাংলা, English, Hindi — তুমি যে ভাষায় লিখবে, AI সেই ভাষায় উত্তর দেবে।",
  },
  {
    q: "Math equations সঠিকভাবে দেখায়?",
    a: "হ্যাঁ। Fraction, integral, summation — সব গণিতের expression পরিষ্কারভাবে render হয়, বইয়ের মতো।",
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
  const { state: installState, promptInstall } = usePWAInstall();

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
            <img src="/icons/icon-192.png" alt="CholoShikhi" className="w-8 h-8 rounded-lg" />
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
            বাংলাভাষীদের জন্য AI-powered শিক্ষা ও সহকারী।
            চ্যাট করো, শেখো, জানো — সব এক জায়গায়।
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
            <h2 className="text-2xl font-bold text-white mb-3">যা পাবে CholoShikhi-তে</h2>
            <p className="text-gray-500 text-[14px] max-w-md mx-auto">শিক্ষা, তথ্য, সৃজনশীলতা — AI দিয়ে সব সম্ভব</p>
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
            <h2 className="text-2xl font-bold text-white mb-3">CholoShikhi কেন তৈরি?</h2>
            <p className="text-gray-500 text-[14px] max-w-lg mx-auto">শুধু উত্তর পাওয়া নয় — বরং শেখা এবং পড়াশোনাকে সহজভাবে গুছিয়ে নেওয়া</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Mission */}
            <div className="p-6 rounded-2xl border border-white/[0.06] bg-[#16161e]">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h3 className="text-[15px] font-semibold text-white mb-2">আমাদের কথা</h3>
              <p className="text-[13px] text-gray-500 leading-relaxed">
                CholoShikhi তৈরি হয়েছে একটা সহজ কথা মাথায় রেখে — বাংলাভাষী শিক্ষার্থীরা যেন
                তাদের মাতৃভাষায় AI-এর সুবিধা পায়। গণিত হোক, বিজ্ঞান হোক, বা প্রোগ্রামিং —
                প্রতিটা বিষয়ে সহজ ভাষায়, ধাপে ধাপে শেখার সুযোগ করে দেওয়া।
              </p>
            </div>
            {/* Why different */}
            <div className="p-6 rounded-2xl border border-white/[0.06] bg-[#16161e]">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
              </div>
              <h3 className="text-[15px] font-semibold text-white mb-2">কেন আলাদা</h3>
              <p className="text-[13px] text-gray-500 leading-relaxed">
                বড় AI চ্যাটবটগুলো সাধারণত English-এ ভালো কাজ করে। CholoShikhi বানানো হয়েছে
                বাংলায় ভালো কাজ করার জন্য। আর Shikkhok Mode-এ AI শুধু উত্তর দেয় না —
                বোঝায়, প্রশ্ন করে, hint দেয়। যেন তোমার পাশে একজন ব্যক্তিগত শিক্ষক আছে।
              </p>
            </div>
          </div>

          {/* Team */}
          <div className="p-6 rounded-2xl border border-white/[0.06] bg-[#16161e] text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-lg font-bold">S</span>
            </div>
            <h3 className="text-[15px] font-semibold text-white mb-1">Siblings Team</h3>
            <p className="text-[12px] text-gray-500 mb-1">CholoShikhi তৈরি ও পরিচালনা করছে</p>
            <p className="text-[12px] text-gray-600">বাংলাদেশ থেকে তৈরি</p>
          </div>
        </div>
      </section>

      {/* ===== DOCS ===== */}
      <section id="docs" data-animate className="py-24 px-6 border-t border-white/[0.04]" style={{ opacity: visibleSections.has("docs") ? 1 : 0, transform: visibleSections.has("docs") ? "none" : "translateY(20px)", transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[11px] text-sky-400 font-medium tracking-widest uppercase mb-3">Documentation</p>
            <h2 className="text-2xl font-bold text-white mb-3">কিভাবে ব্যবহার করবে</h2>
            <p className="text-gray-500 text-[14px]">৩০ সেকেন্ডে বুঝে ফেলো</p>
          </div>

          <div className="space-y-3">
            {/* Step 1 */}
            <div className="p-5 rounded-2xl border border-white/[0.06] bg-[#16161e] flex gap-4">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-violet-400 text-[13px] font-bold">১</span>
              </div>
              <div>
                <h4 className="text-[14px] font-semibold text-white mb-1">Chat শুরু করো</h4>
                <p className="text-[13px] text-gray-500 leading-relaxed">
                  হোমপেইজের <strong className="text-gray-300">"এখনই শুরু করো"</strong> বাটনে ক্লিক করো।
                  লগইন ছাড়াই চ্যাট করতে পারো।
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
                  হেডারে দুটো মোড পাবে:
                  <strong className="text-violet-400"> Normal</strong> — সাধারণ AI চ্যাট, যেকোনো প্রশ্ন করো।
                  <strong className="text-emerald-400"> Shikkhok</strong> — শেখানোর মোড, ধাপে ধাপে শেখায়।
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
                  নিচের input box-এ প্রশ্ন লেখো বা ছবি পাঠাও।
                  Enter চাপো — AI তোমার ভাষায় উত্তর দেবে।
                  গণিতের সমস্যাগুলো সুন্দরভাবে দেখাবে।
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-5 rounded-2xl border border-white/[0.06] bg-[#16161e] flex gap-4">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sky-400 text-[13px] font-bold">৪</span>
              </div>
              <div>
                <h4 className="text-[14px] font-semibold text-white mb-1">Web Search</h4>
                <p className="text-[13px] text-gray-500 leading-relaxed">
                  Normal Mode-এ যদি সাম্প্রতিক তথ্য লাগে (আবহাওয়া, খবর, দাম),
                  AI নিজেই খুঁজে এনে source সহ উত্তর দেবে।
                </p>
              </div>
            </div>

            {/* Step 5 */}
            <div className="p-5 rounded-2xl border border-white/[0.06] bg-[#16161e] flex gap-4">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-amber-400 text-[13px] font-bold">৫</span>
              </div>
              <div>
                <h4 className="text-[14px] font-semibold text-white mb-1">History দেখো</h4>
                <p className="text-[13px] text-gray-500 leading-relaxed">
                  Google দিয়ে login করলে প্রতিটা conversation auto-save হবে।
                  সাইডবারের <strong className="text-gray-300">History</strong> আইকনে ক্লিক করে পুরোনো চ্যাট দেখো।
                  নতুন চ্যাট শুরু করতে <strong className="text-gray-300">+</strong> চাপো।
                </p>
              </div>
            </div>

            {/* Shikkhok Mode detail */}
            <div className="p-5 rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.03] flex gap-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-emerald-400 text-[13px] font-bold">🎓</span>
              </div>
              <div>
                <h4 className="text-[14px] font-semibold text-white mb-1">Shikkhok Mode — বিস্তারিত</h4>
                <p className="text-[13px] text-gray-500 leading-relaxed">
                  এই মোডে AI একজন শিক্ষকের মতো আচরণ করে। কোনো বিষয় জিজ্ঞাসা করলে:
                </p>
                <ul className="mt-2 space-y-1 text-[13px] text-gray-500">
                  <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">→</span> প্রথমে সহজ ভাষায় বোঝায়</li>
                  <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">→</span> তারপর check question করে — কতটুকু বুঝেছো</li>
                  <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">→</span> ভুল করলে পুরো answer দেয় না, hint দেয়</li>
                  <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">→</span> না বুঝলে অন্যভাবে, আরও সহজে বোঝায়</li>
                  <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">→</span> গণিতে প্রতিটা step দেখায়, কোনো step বাদ দেয় না</li>
                </ul>
                <p className="mt-2 text-[13px] text-gray-500 leading-relaxed">
                  মূল উদ্দেশ্য: তোমাকে নিজে শেখানো, উত্তর দিয়ে দেওয়া নয়।
                </p>
              </div>
            </div>

            {/* Tip */}
            <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/10 flex gap-3">
              <svg className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <div>
                <p className="text-[12px] text-violet-300 font-medium mb-0.5">Pro Tip</p>
                <p className="text-[12px] text-gray-500">Shikkhok Mode-এ না বুঝলে সরাসরি "আমি বুঝিনি" বলো — AI অন্যভাবে বোঝাবে। ধাপে ধাপে শেখাও, hint নাও — এটাই শিক্ষকের কাজ।</p>
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

      {/* ===== DOWNLOAD ===== */}
      <section id="download" data-animate className="py-24 px-6 border-t border-white/[0.04]" style={{ opacity: visibleSections.has("download") ? 1 : 0, transform: visibleSections.has("download") ? "none" : "translateY(20px)", transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)" }}>
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-[11px] text-violet-300 mb-6">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Download
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">CholoShikhi ডাউনলোড করো</h2>
          <p className="text-gray-500 text-[14px] mb-10 max-w-md mx-auto">
            তোমার পছন্দের ডিভাইসে CholoShikhi ব্যবহার করো
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Windows */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 flex flex-col items-center text-center hover:border-violet-500/30 hover:bg-white/[0.05] transition-all">
              <div className="w-12 h-12 rounded-xl bg-[#0078d4]/15 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-[#0078d4]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
                </svg>
              </div>
              <h3 className="text-white text-sm font-semibold mb-1">Windows</h3>
              <p className="text-gray-500 text-[11px] mb-5">Windows 10/11 · Desktop App</p>
              <a
                href="https://github.com/developerssofficial/choloshikhi_ai/releases/download/v1.0.0/CholoShikhi-1.0.0.Setup.exe"
                download
                className="w-full py-2.5 rounded-xl bg-violet-600 text-white text-[13px] font-medium hover:bg-violet-500 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Download .exe
              </a>
              <p className="text-gray-600 text-[10px] mt-3">v1.0.0 · ~113 MB</p>
            </div>

            {/* Android */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 flex flex-col items-center text-center hover:border-emerald-500/30 hover:bg-white/[0.05] transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24a8.29 8.29 0 00-6.8 0L7.23 5.67c-.19-.29-.58-.38-.87-.2-.28.18-.37.54-.22.83L8 9.48C5.42 11.12 3.72 13.9 3.28 17h17.44c-.44-3.1-2.14-5.88-4.72-7.52zM8.5 14.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm7 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
                </svg>
              </div>
              <h3 className="text-white text-sm font-semibold mb-1">Android</h3>
              <p className="text-gray-500 text-[11px] mb-5">Android 8+ · Mobile App</p>
              <button
                disabled
                className="w-full py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-gray-500 text-[13px] font-medium cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Coming Soon
              </button>
              <p className="text-gray-600 text-[10px] mt-3">শীঘ্রই আসছে</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 text-[11px] text-gray-600 mt-8">
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              Free · Secure
            </span>
            <span>·</span>
            <span>Windows 10+</span>
            <span>·</span>
            <span>Internet required</span>
          </div>
        </div>
      </section>

      {/* ===== APP INSTALL ===== */}
      <section id="app" data-animate className="py-24 px-6 border-t border-white/[0.04]" style={{ opacity: visibleSections.has("app") ? 1 : 0, transform: visibleSections.has("app") ? "none" : "translateY(20px)", transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)" }}>
        <div className="max-w-xl mx-auto text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-300 mb-6">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            Mobile App
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">CholoShikhi App</h2>
          <p className="text-gray-500 text-[14px] mb-8 max-w-md mx-auto">
            ফোনে সরাসরি install করো — browser ছাড়াই খোলো, দ্রুত চলো।
          </p>

          <div className="bg-[#16161e] border border-white/[0.06] rounded-2xl p-6 mb-6">
            {installState === "installed" ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                  <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <p className="text-[14px] text-emerald-400 font-medium">App Installed</p>
                <p className="text-[12px] text-gray-500">CholoShikhi তোমার ফোনে ইতিমধ্যে আছে!</p>
              </div>
            ) : installState === "installable" ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                  <svg className="w-7 h-7 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </div>
                <p className="text-[14px] text-white font-medium">App Install করো</p>
                <p className="text-[12px] text-gray-500">এক ক্লিকে ফোনে install করো, পরে যেকোনো সময় খোলো।</p>
                <button
                  onClick={promptInstall}
                  className="mt-2 px-6 py-2.5 text-[13px] font-medium bg-violet-600 rounded-full hover:bg-violet-500 transition-colors"
                >
                  Install CholoShikhi
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-sky-500/10 flex items-center justify-center">
                  <svg className="w-7 h-7 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                </div>
                <p className="text-[14px] text-white font-medium">কিভাবে Install করবে</p>
                <div className="text-[12px] text-gray-500 text-left space-y-1.5 mt-1 max-w-xs">
                  <div className="flex items-start gap-2"><span className="text-sky-400 mt-0.5">১.</span> Android Chrome-এ choloshikhiai.vercel.app খোলো।</div>
                  <div className="flex items-start gap-2"><span className="text-sky-400 mt-0.5">২.</span> ব্রাউজারের menu (⋮) এ ক্লিক করো।</div>
                  <div className="flex items-start gap-2"><span className="text-sky-400 mt-0.5">৩.</span> "Install app" বা "Add to Home screen" সিলেক্ট করো।</div>
                  <div className="flex items-start gap-2"><span className="text-sky-400 mt-0.5">৪.</span> "Install" চাপো — হোমস্ক্রিনে CholoShikhi icon আসবে।</div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-3 text-[11px] text-gray-600">
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              SSL encrypted
            </span>
            <span>·</span>
            <span>No data stored on device</span>
            <span>·</span>
            <span>Free forever</span>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="py-24 px-6">
        <div className="max-w-xl mx-auto text-center">
          <img src="/icons/icon-192.png" alt="CholoShikhi" className="w-12 h-12 rounded-2xl mx-auto mb-5" />
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
            <img src="/icons/icon-192.png" alt="CholoShikhi" className="w-6 h-6 rounded-md" />
            <span className="text-[12px] text-gray-600">© 2025 CholoShikhi · Siblings Team</span>
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
