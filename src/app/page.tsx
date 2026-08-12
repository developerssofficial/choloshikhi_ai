"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";

export default function HomePage() {
  const { user, signInWithGoogle } = useAuth();

  return (
    <div className="min-h-screen bg-[#0f0f14] text-white">
      {/* ===== NAVBAR ===== */}
      <nav className="fixed top-0 w-full bg-[#0f0f14]/80 backdrop-blur-xl border-b border-white/[0.06] z-50">
        <div className="max-w-6xl mx-auto px-5 h-12 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">চ</span>
            </div>
            <span className="text-sm font-semibold text-white">চলো শিখি Ai</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="#about" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">আমাদের সম্পর্কে</Link>
            {user ? (
              <Link href="/chat" className="px-4 py-1.5 bg-violet-600 text-white text-xs rounded-lg hover:bg-violet-500 transition-colors">
                চ্যাট শুরু করো
              </Link>
            ) : (
              <button onClick={signInWithGoogle} className="px-4 py-1.5 bg-violet-600 text-white text-xs rounded-lg hover:bg-violet-500 transition-colors">
                লগইন
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="pt-32 pb-20 px-5">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-semibold text-white mb-3">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">চলো শিখি</span> Ai
          </h1>
          <p className="text-gray-500 text-sm mb-8">
            তোমার AI সহকারী — যেকোনো প্রশ্ন করো, ছবি শেয়ার করো, শেখো।
          </p>

          <Link href="/chat"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1a1a24] border border-white/[0.08] rounded-xl text-gray-400 text-sm hover:border-white/[0.15] transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            কিছু জিজ্ঞাসা করো...
          </Link>

          {/* Stats */}
          <div className="flex items-center justify-center gap-6 mt-12">
            {[
              { val: "15", label: "ফ্রি/দিন" },
              { val: "50", label: "লগইন ইউজার" },
              { val: "2", label: "AI মডেল" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-lg font-bold text-white">{s.val}</p>
                <p className="text-[10px] text-gray-600">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section className="py-16 px-5 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: "💬", title: "স্মার্ট চ্যাট", desc: "Bangla, English, Hindi — AI তোমার ভাষায় উত্তর দেবে।" },
              { icon: "🖼️", title: "ছবি বিশ্লেষণ", desc: "ছবি আপলোড করো, AI বুঝবে ও বর্ণনা করবে।" },
              { icon: "🧠", title: "স্মৃতি রাখে", desc: "AI তোমার আগের কথা মনে রাখে।" },
              { icon: "⚡", title: "দ্রুত উত্তর", desc: "CholoShikhi 1.0 — শক্তিশালী AI দিয়ে চালিত।" },
              { icon: "🔒", title: "নিরাপদ", desc: "API key সার্ভারে সুরক্ষিত।" },
              { icon: "🎯", title: "ফ্রি + Pro", desc: "বিনামূল্যে ১৫টি, লগইনে ৫০টি।" },
            ].map((f, i) => (
              <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-all">
                <div className="text-lg mb-2">{f.icon}</div>
                <h3 className="text-xs font-semibold text-white mb-1">{f.title}</h3>
                <p className="text-[11px] text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ABOUT ===== */}
      <section id="about" className="py-16 px-5 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-lg font-semibold text-white mb-1">চলো শিখি Ai সম্পর্কে</h2>
            <p className="text-[11px] text-gray-600">আমাদের মিশন ও ভিশন</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <p className="text-gray-400 text-xs leading-relaxed">
                <strong className="text-gray-300">চলো শিখি Ai</strong> একটি বিনামূল্যের AI চ্যাটবট যা বাংলাভাষী মানুষদের জন্য তৈরি।
                প্রতিটি মানুষ যেন AI-এর সুবিধা নিতে পারে — ভাষা বাধা ছাড়া।
              </p>
              <p className="text-gray-400 text-xs leading-relaxed">
                শক্তিশালী AI দিয়ে চালিত।
                ছবি আপলোড করলে AI বুঝে উত্তর দেয়।
              </p>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] text-gray-600">Developed by</span>
                <span className="text-[10px] text-gray-500 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">Xparrow Team</span>
              </div>
            </div>

            <div className="space-y-2">
              {[
                { q: "ফ্রি কতটুকু পাবো?", a: "প্রতিদিন ১৫টি মেসেজ ফ্রি।" },
                { q: "ছবি পাঠানো যায়?", a: "হ্যাঁ! CholoShikhi 1.0 ছবি বুঝতে পারে।" },
                { q: "লগইন ছাড়া চলবে?", a: "হ্যাঁ, গেস্ট হিসেবেও ব্যবহার করো।" },
                { q: "ভাষা কোনটি?", a: "Bangla, English, Hindi।" },
              ].map((item, i) => (
                <div key={i} className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
                  <p className="text-[11px] font-medium text-violet-400 mb-0.5">{item.q}</p>
                  <p className="text-[11px] text-gray-500">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="py-12 px-5 border-t border-white/[0.04]">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="text-lg font-semibold text-white mb-2">এখনই শুরু করো!</h2>
          <p className="text-gray-500 text-xs mb-5">বিনামূল্যে AI-এর সাথে কথা বলো।</p>
          <Link href="/chat"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white text-sm rounded-xl hover:bg-violet-500 transition-all">
            এখনই চ্যাট শুরু করো
          </Link>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="py-6 px-5 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white text-[7px] font-bold">চ</span>
            </div>
            <span className="text-[10px] text-gray-600">চলো শিখি Ai</span>
          </div>
          <p className="text-[10px] text-gray-600">Xparrow Team</p>
        </div>
      </footer>
    </div>
  );
}