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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#0d0d14] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden animate-[fadeUp_0.3s_ease-out]">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-violet-500/25">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-white mb-1">শিক্ষার্থী প্রোফাইল</h2>
          <p className="text-[12px] text-gray-500">আপনার তথ্য দিন যাতে আমরা আপনাকে আরো ভালোভাবে সেবা দিতে পারি</p>
        </div>

        {/* Form */}
        <div className="px-6 pb-6 space-y-3">
          {/* Full Name */}
          <div>
            <label className="text-[11px] text-gray-400 mb-1 block">পুরো নাম *</label>
            <input
              type="text"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="যেমন: আহমেদ রাফি"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-[13px] text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/40 transition-all"
            />
          </div>

          {/* School */}
          <div>
            <label className="text-[11px] text-gray-400 mb-1 block">স্কুল / কলেজ</label>
            <input
              type="text"
              value={form.school}
              onChange={(e) => setForm({ ...form, school: e.target.value })}
              placeholder="যেমন:ঢাকা পাবলিক স্কুল"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-[13px] text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/40 transition-all"
            />
          </div>

          {/* College */}
          <div>
            <label className="text-[11px] text-gray-400 mb-1 block">কলেজ / বিশ্ববিদ্যালয় (ঐচ্ছিক)</label>
            <input
              type="text"
              value={form.college}
              onChange={(e) => setForm({ ...form, college: e.target.value })}
              placeholder="যেমন:ঢাকা কলেজ"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-[13px] text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/40 transition-all"
            />
          </div>

          {/* Class */}
          <div>
            <label className="text-[11px] text-gray-400 mb-1 block">শ্রেণী / বিভাগ</label>
            <input
              type="text"
              value={form.className}
              onChange={(e) => setForm({ ...form, className: e.target.value })}
              placeholder="যেমন: SSC / Class 10 / প্লেবয়"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-[13px] text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/40 transition-all"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-[11px] text-red-400 text-center">{error}</p>
          )}

          {/* Success */}
          {success && (
            <p className="text-[11px] text-emerald-400 text-center">সফলভাবে সেভ হয়েছে!</p>
          )}

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setShow(false)}
              className="flex-1 py-2.5 text-[12px] text-gray-400 bg-white/[0.04] rounded-xl hover:bg-white/[0.06] transition-all"
            >
              পরে করব
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.fullName.trim() || success}
              className="flex-1 py-2.5 text-[12px] font-medium text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 transition-all shadow-md shadow-violet-600/20"
            >
              {saving ? "সেভ হচ্ছে..." : "সেভ করুন"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
