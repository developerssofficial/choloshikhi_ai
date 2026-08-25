"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";

/* ===================================================================
   Student Profile Setup — Shows after login if profile is incomplete
   Collects: full name, school, college, class
   =================================================================== */

interface ProfileData {
  fullName: string;
  school: string;
  college: string;
  className: string;
}

export default function StudentProfileSetup() {
  const { user, profileComplete, refreshProfile, getToken } = useAuth();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState<ProfileData>({
    fullName: "",
    school: "",
    college: "",
    className: "",
  });

  // Check if profile needs setup
  useEffect(() => {
    if (!user || profileComplete) {
      setShow(false);
      return;
    }

    // Fetch current profile to pre-fill
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setForm({
          fullName: data.fullName || data.displayName || "",
          school: data.school || "",
          college: data.college || "",
          className: data.className || "",
        });
        // Show modal if profile is incomplete
        if (!profileComplete) {
          setShow(true);
        }
      } catch {}
      setLoading(false);
    };

    fetchProfile();
  }, [user, profileComplete, getToken]);

  const handleSave = async () => {
    if (!form.fullName.trim() || form.fullName.trim().length < 2) {
      setError("নাম কমপক্ষে ২ অক্ষর হতে হবে");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          displayName: form.fullName.trim(),
          school: form.school.trim(),
          college: form.college.trim(),
          className: form.className.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      setSuccess(true);
      await refreshProfile();
      setTimeout(() => setShow(false), 1500);
    } catch (err: any) {
      setError(err.message || "সেভ করতে সমস্যা হয়েছে");
    }
    setSaving(false);
  };

  if (!show || loading) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-xl p-4 animate-[fadeIn_0.25s_ease-out]">
      <div className="w-full max-w-md glass-apple-heavy border border-white/[0.1] rounded-[28px] shadow-[0_24px_80px_rgba(0,0,0,0.5)] overflow-hidden animate-[scaleIn_0.3s_cubic-bezier(0.2,0.8,0.2,1)]">
        {/* Header */}
        <div className="px-8 pt-8 pb-4 text-center">
          <div className="w-[60px] h-[60px] rounded-[20px] bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-[0_8px_32px_rgba(139,92,246,0.3)]">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h2 className="text-[18px] font-semibold text-white mb-1.5 tracking-[-0.01em]">শিক্ষার্থী প্রোফাইল</h2>
          <p className="text-[13px] text-gray-500 leading-relaxed">আপনার তথ্য দিন যাতে আমরা আপনাকে আরো ভালোভাবে সেবা দিতে পারি</p>
        </div>

        {/* Form */}
        <div className="px-8 pb-8 space-y-4">
          {/* Full Name */}
          <div>
            <label className="text-[12px] text-gray-400 mb-1.5 block font-medium">পুরো নাম *</label>
            <input
              type="text"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="যেমন: আহমেদ রাফি"
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-2xl px-4 py-3 text-[14px] text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/40 focus:shadow-[0_0_0_4px_rgba(139,92,246,0.08)] focus:bg-white/[0.07] transition-all duration-300 tracking-[-0.01em]"
            />
          </div>

          {/* School */}
          <div>
            <label className="text-[12px] text-gray-400 mb-1.5 block font-medium">স্কুল / কলেজ</label>
            <input
              type="text"
              value={form.school}
              onChange={(e) => setForm({ ...form, school: e.target.value })}
              placeholder="যেমন:ঢাকা পাবলিক স্কুল"
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-2xl px-4 py-3 text-[14px] text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/40 focus:shadow-[0_0_0_4px_rgba(139,92,246,0.08)] focus:bg-white/[0.07] transition-all duration-300 tracking-[-0.01em]"
            />
          </div>

          {/* College */}
          <div>
            <label className="text-[12px] text-gray-400 mb-1.5 block font-medium">কলেজ / বিশ্ববিদ্যালয় <span className="text-gray-600">(ঐচ্ছিক)</span></label>
            <input
              type="text"
              value={form.college}
              onChange={(e) => setForm({ ...form, college: e.target.value })}
              placeholder="যেমন:ঢাকা কলেজ"
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-2xl px-4 py-3 text-[14px] text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/40 focus:shadow-[0_0_0_4px_rgba(139,92,246,0.08)] focus:bg-white/[0.07] transition-all duration-300 tracking-[-0.01em]"
            />
          </div>

          {/* Class */}
          <div>
            <label className="text-[12px] text-gray-400 mb-1.5 block font-medium">শ্রেণী / বিভাগ</label>
            <input
              type="text"
              value={form.className}
              onChange={(e) => setForm({ ...form, className: e.target.value })}
              placeholder="যেমন: SSC / Class 10"
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-2xl px-4 py-3 text-[14px] text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/40 focus:shadow-[0_0_0_4px_rgba(139,92,246,0.08)] focus:bg-white/[0.07] transition-all duration-300 tracking-[-0.01em]"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-[12px] text-red-400 text-center">{error}</p>
          )}

          {/* Success */}
          {success && (
            <p className="text-[12px] text-emerald-400 text-center">সফলভাবে সেভ হয়েছে!</p>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShow(false)}
              className="flex-1 py-3 text-[13px] font-medium text-gray-400 bg-white/[0.05] border border-white/[0.06] rounded-2xl hover:bg-white/[0.08] hover:text-gray-300 transition-all duration-300"
            >
              পরে করব
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.fullName.trim() || success}
              className="flex-1 py-3 text-[13px] font-semibold text-black bg-white rounded-2xl hover:shadow-[0_4px_20px_rgba(255,255,255,0.15)] disabled:opacity-40 transition-all duration-300 active:scale-95"
            >
              {saving ? "সেভ হচ্ছে..." : "সেভ করুন"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
