"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePWAInstall } from "@/lib/pwa";

const NAV_LINKS = [
  { label: "ফিচারসমূহ", href: "#features" },
  { label: "শিক্ষক মোড", href: "#shikkhok" },
  { label: "ডকুমেন্টেশন", href: "#docs" },
  { label: "FAQ", href: "#faq" },
];

const FEATURES = [
  {
    icon: "🧠",
    title: "উন্নত AI সহকারী",
    desc: "যেকোনো প্রশ্নের সহজ, পরিষ্কার ও গভীর ব্যাখ্যা। বাংলায় কিংবা ইংরেজিতে — সম্পূর্ণ নির্ভুলভাবে।",
    badge: "Fast & Accurate",
    gradient: "from-violet-500/20 to-indigo-500/20",
    border: "border-violet-500/30",
  },
  {
    icon: "🎓",
    title: "শিক্ষক মোড (Shikkhok)",
    desc: "ধাপে ধাপে বোঝায়, হিন্ট দেয় এবং কনসেপ্ট ক্লিয়ার করতে সাহায্য করে। মুখস্থ নয়, প্রকৃত শিখন।",
    badge: "Interactive Learning",
    gradient: "from-emerald-500/20 to-teal-500/20",
    border: "border-emerald-500/30",
  },
  {
    icon: "🌐",
    title: "স্মার্ট ওয়েব সার্চ",
    desc: "সাম্প্রতিক তথ্য ও খবরের জন্য রিয়েল-টাইম ইন্টারনেট সার্চ করে প্রমাণসহ সোর্স উল্লেখ করে।",
    badge: "Real-time Data",
    gradient: "from-sky-500/20 to-blue-500/20",
    border: "border-sky-500/30",
  },
  {
    icon: "📐",
    title: "গণিত ও সমীকরণ সমাধান",
    desc: "ভগ্নাংশ, ক্যালকুলাস, ত্রিকোণমিতি ও জ্যামিতির জটিল সমীকরণ পাঠ্যবইয়ের মতো নিখুঁত KaTeX ফরম্যাটে রেন্ডার করে।",
    badge: "LaTeX & KaTeX",
    gradient: "from-amber-500/20 to-orange-500/20",
    border: "border-amber-500/30",
  },
  {
    icon: "🖼️",
    title: "ছবি বিশ্লেষণ (Vision)",
    desc: "প্রশ্নের ছবি বা ডায়াগ্রাম আপলোড করলে AI তাৎক্ষণিকভাবে দেখে বিশ্লেষণ ও সমাধান বুঝিয়ে দেয়।",
    badge: "Multimodal AI",
    gradient: "from-rose-500/20 to-pink-500/20",
    border: "border-rose-500/30",
  },
  {
    icon: "⚡",
    title: "টাস্ক প্ল্যানার ইঞ্জিন",
    desc: "যেকোনো বড় প্রোজেক্ট বা জটিল অ্যাসাইনমেন্টকে ছোট ছোট কার্যকর পদক্ষেপে ভাগ করে সমাধান দেয়।",
    badge: "Automated Workflow",
    gradient: "from-purple-500/20 to-fuchsia-500/20",
    border: "border-purple-500/30",
  },
];

const FAQ_ITEMS = [
  {
    q: "চলো শিখি AI কি সম্পূর্ণ বিনামূল্যে ব্যবহার করা যায়?",
    a: "হ্যাঁ, এটি সম্পূর্ণ ফ্রি। কোনো মেসেজ লিমিট ছাড়া স্বাভাবিক মোডে যত খুশি চ্যাট ও পড়াশোনা করতে পারবেন।",
  },
  {
    q: "শিক্ষক মোড (Shikkhok Mode) সাধারণ চ্যাট থেকে কীভাবে আলাদা?",
    a: "সাধারণ মোডে সরাসরি উত্তর পাওয়া যায়। কিন্তু শিক্ষক মোডে AI একজন দক্ষ টিউটরের মতো আচরণ করে — প্রথমে মূল ধারণা বুঝিয়ে দেয়, বোঝার অগ্রগতি যাচাই করে এবং প্রয়োজনে হিন্ট দিয়ে শিক্ষার্থীকে নিজে সমাধানের সুযোগ দেয়।",
  },
  {
    q: "মোবাইল এবং কম্পিউটারে কি কোনো ল্যাগ হবে?",
    a: "একদমই না! সাইটটি সর্বোচ্চ পারফরম্যান্স অপ্টিমাইজড, যাতে কম ক্ষমতার মোবাইল এবং পিসিতেও সুপার ফাস্ট লোড হয় এবং কোনো ল্যাগ ছাড়া মসৃণভাবে কাজ করে।",
  },
  {
    q: "গণিত এবং সায়েন্সের সূত্র কি সঠিকভাবে প্রদর্শিত হয়?",
    a: "হ্যাঁ। চলো শিখি AI-তে বিল্ট-ইন KaTeX ম্যাথমেটিক্যাল রেন্ডারিং ইঞ্জিন রয়েছে, যা সব ধরনের জটিল সূত্র ও ইকুয়েশন বইয়ের মতো স্পষ্ট দেখায়।",
  },
];

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { promptInstall } = usePWAInstall();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-[100dvh] bg-[#09090e] text-slate-100 selection:bg-violet-500/30 selection:text-white relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="ambient-glow-violet top-[-100px] left-1/2 -translate-x-1/2" />
      <div className="ambient-glow-cyan top-[600px] right-[-100px]" />

      {/* ===== NAVBAR ===== */}
      <nav
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-[#09090e]/85 backdrop-blur-2xl border-b border-white/[0.08]" : "bg-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 p-1 shadow-lg shadow-violet-500/25 group-hover:scale-105 transition-transform">
              <img src="/logo-source.png" alt="CholoShikhi" className="w-full h-full object-contain rounded-lg" />
            </div>
            <span className="text-base font-bold tracking-tight text-white">চলো শিখি AI</span>
          </Link>

          <div className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                {l.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/chat"
              className="px-5 py-2 text-xs font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-full shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 active:scale-95 transition-all"
            >
              চ্যাট শুরু করুন →
            </Link>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-slate-400 hover:text-white p-2"
            title="মেনু"
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden glass-dock border-b border-white/[0.08] px-5 py-4 space-y-3 animate-fade-in">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm text-slate-300 hover:text-white py-1"
              >
                {l.label}
              </a>
            ))}
            <Link
              href="/chat"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-center py-2.5 text-xs font-semibold bg-violet-600 text-white rounded-xl shadow-md"
            >
              চ্যাট শুরু করুন
            </Link>
          </div>
        )}
      </nav>

      {/* ===== HERO SECTION ===== */}
      <section className="pt-32 sm:pt-40 pb-20 px-5 max-w-5xl mx-auto text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-panel border border-violet-500/30 text-xs font-medium text-violet-300 mb-6 shadow-sm animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>নতুন জেনারেশন AI · সম্পূর্ণ বাংলায় প্রস্তুত</span>
        </div>

        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-tight mb-6 animate-slide-up">
          শেখার আনন্দ এবার <br />
          <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-sky-400 bg-clip-text text-transparent">
            তোমার হাতের মুঠোয়
          </span>
        </h1>

        <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto mb-10 leading-relaxed">
          চলো শিখি AI হলো বাংলাদেশের শিক্ষার্থীদের জন্য একটি আধুনিক কৃত্রিম বুদ্ধিমত্তা চালিত প্ল্যাটফর্ম। গণিত, বিজ্ঞান, সাহিত্য থেকে শুরু করে যেকোনো বিষয় বুঝুন স্টেপ-বাই-স্টেপ।
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-16">
          <Link
            href="/chat"
            className="w-full sm:w-auto px-8 py-3.5 text-sm font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl shadow-xl shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 active:scale-95 transition-all"
          >
            বিনামূল্যে চ্যাট করুন
          </Link>
          <a
            href="#features"
            className="w-full sm:w-auto px-7 py-3.5 text-sm font-semibold glass-panel text-slate-300 hover:text-white rounded-2xl border border-white/[0.08] hover:border-white/20 transition-all"
          >
            ফিচারসমূহ দেখুন
          </a>
        </div>

        {/* Live UI Mockup Card */}
        <div className="max-w-3xl mx-auto rounded-3xl glass-dock border border-white/[0.1] shadow-2xl p-4 sm:p-6 text-left relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>
            <span className="text-xs text-slate-500 font-mono">choloshikhiai.vercel.app</span>
          </div>

          <div className="space-y-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2.5 bg-white/[0.04] p-3 rounded-xl border border-white/[0.05]">
              <span className="text-violet-400 font-bold">শিক্ষার্থী:</span>
              <span className="text-slate-200">দ্বিঘাত সমীকরণ $ax^2 + bx + c = 0$ এর মূল নির্ণয়ের সূত্রটি বুঝিয়ে দাও।</span>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-violet-500/20 text-slate-300 leading-relaxed">
              <p className="font-semibold text-violet-300 mb-1">চলো শিখি AI শিক্ষক:</p>
              <p className="mb-2">দ্বিঘাত সমীকরণের মূলদ্বয় বের করার সূত্র হলো:</p>
              <div className="bg-black/40 p-2.5 rounded-lg border border-white/[0.06] text-center font-mono text-emerald-300 my-2">
                x = (-b ± √(b² - 4ac)) / (2a)
              </div>
              <p className="text-xs text-slate-400 mt-2">এখানে $b^2 - 4ac$ কে নিশ্চায়ক (Discriminant) বলা হয়।</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURES GRID ===== */}
      <section id="features" className="py-20 px-5 max-w-6xl mx-auto relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-2xl sm:text-4xl font-bold text-white mb-3">শক্তিশালী ফিচার ও সুবিধা</h2>
          <p className="text-slate-400 text-xs sm:text-sm">
            প্রতিটি টুল বিশেষভাবে তৈরি করা হয়েছে যাতে তোমার শেখার প্রক্রিয়া হয় সহজ, দ্রুত এবং উপভোগ্য।
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className={`p-6 rounded-3xl glass-panel-subtle hover:glass-panel border ${f.border} transition-all duration-300 hover:scale-[1.02] group`}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl p-2 rounded-2xl bg-white/[0.04] border border-white/[0.06]">{f.icon}</span>
                <span className="text-[10px] font-semibold text-violet-400 bg-violet-500/10 px-2.5 py-1 rounded-full border border-violet-500/20">
                  {f.badge}
                </span>
              </div>
              <h3 className="text-base font-bold text-white mb-2 group-hover:text-violet-300 transition-colors">{f.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== FAQ SECTION ===== */}
      <section id="faq" className="py-20 px-5 max-w-3xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">সচরাচর জিজ্ঞাসিত প্রশ্ন (FAQ)</h2>
          <p className="text-slate-400 text-xs sm:text-sm">তোমার যেকোনো জিজ্ঞাসা থাকলে এখানে উত্তর পেতে পারো।</p>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, idx) => (
            <div key={idx} className="glass-panel rounded-2xl border border-white/[0.08] overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full flex items-center justify-between p-4 sm:p-5 text-left text-xs sm:text-sm font-semibold text-slate-200 hover:text-white"
              >
                <span>{item.q}</span>
                <span className="text-violet-400 text-lg ml-2">{openFaq === idx ? "−" : "+"}</span>
              </button>
              {openFaq === idx && (
                <div className="px-5 pb-5 text-xs sm:text-sm text-slate-400 leading-relaxed border-t border-white/[0.04] pt-3">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-white/[0.06] py-8 px-5 text-center text-xs text-slate-500 relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo-source.png" alt="Logo" className="w-5 h-5 rounded-md" />
            <span className="font-semibold text-slate-300">চলো শিখি AI</span>
          </div>
          <p>© {new Date().getFullYear()} CholoShikhi AI. সর্বস্বত্ব সংরক্ষিত।</p>
          <Link href="/chat" className="text-violet-400 hover:text-violet-300 font-medium">
            চ্যাট শুরু করুন →
          </Link>
        </div>
      </footer>
    </div>
  );
}
