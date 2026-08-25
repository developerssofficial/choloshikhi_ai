"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";

interface Props {
  open: boolean;
  onClose: () => void;
}

type View = "main" | "student-signup" | "student-login";

export default function LoginModal({ open, onClose }: Props) {
  const { signInWithGoogle, signUpAsStudent, signInAsStudent, isElectron } = useAuth();
  const [view, setView] = useState<View>("main");

  // Signup fields
  const [fullName, setFullName] = useState("");
  const [school, setSchool] = useState("");
  const [college, setCollege] = useState("");
  const [className, setClassName] = useState("");
  const [password, setPassword] = useState("");

  // Login fields
  const [studentId, setStudentId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [createdStudentId, setCreatedStudentId] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  if (!open) return null;

  const resetForm = () => {
    setFullName("");
    setSchool("");
    setCollege("");
    setClassName("");
    setPassword("");
    setStudentId("");
    setLoginPassword("");
    setError("");
    setSuccess("");
    setLoading(false);
    setShowPassword(false);
    setCreatedStudentId("");
  };

  const handleGoogleLogin = async () => {
    await signInWithGoogle();
    if (!isElectron) return;
  };

  // ── Student Signup ──
  const handleStudentSignup = async () => {
    if (!fullName.trim() || fullName.trim().length < 2) {
      setError("নাম কমপক্ষে ২ অক্ষর হতে হবে");
      return;
    }
    if (!password.trim() || password.length < 6) {
      setError("পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে");
      return;
    }

    setLoading(true);
    setError("");

    const result = await signUpAsStudent({
      fullName: fullName.trim(),
      school: school.trim(),
      college: college.trim(),
      className: className.trim(),
      password: password.trim(),
    });

    if (result.error) {
      setError(result.error);
    } else if (result.studentId) {
      setCreatedStudentId(result.studentId);
      setSuccess("created");
    }
    setLoading(false);
  };

  // ── Student Login ──
  const handleStudentLogin = async () => {
    if (!studentId.trim()) {
      setError("Student ID দিন (CSH_XXXXXX)");
      return;
    }
    if (!loginPassword.trim()) {
      setError("পাসওয়ার্ড দিন");
      return;
    }

    setLoading(true);
    setError("");

    const result = await signInAsStudent(studentId.trim().toUpperCase(), loginPassword);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess("লগইন হচ্ছে...");
      setTimeout(() => onClose(), 800);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-[420px] max-w-[92vw] max-h-[90vh] overflow-y-auto glass-apple-heavy border border-white/[0.1] rounded-[28px] shadow-[0_24px_80px_rgba(0,0,0,0.5)] animate-[scaleIn_0.25s_ease-out]">
        {/* Content */}
        <div className="px-8 pt-8 pb-8 flex flex-col items-center">
          {/* Logo */}
          <div className="mb-5 relative">
            <div className="absolute inset-0 bg-violet-500/20 rounded-[20px] blur-xl" />
            <img src="/logo-source.png" alt="CholoShikhi" className="relative w-[60px] h-[60px] rounded-[18px] object-contain shadow-[0_8px_32px_rgba(139,92,246,0.25)]" />
          </div>

          {/* ═══════════ MAIN VIEW ═══════════ */}
          {view === "main" && (
            <>
              <h2 className="text-white text-[18px] font-semibold mb-1.5 tracking-[-0.01em]">
                CholoShikhi-তে স্বাগতম
              </h2>
              <p className="text-gray-500 text-[13px] text-center mb-7 leading-relaxed">
                লগইন করে তোমার সব চ্যাট, টাস্ক এবং অগ্রগতি সংরক্ষণ করো
              </p>

              {/* Google Login Button */}
              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-white text-black rounded-2xl text-[13px] font-semibold hover:shadow-[0_4px_20px_rgba(255,255,255,0.15)] transition-all duration-300 active:scale-95"
              >
                <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span>Google দিয়ে লগইন করো</span>
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 w-full my-5">
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-[11px] text-gray-600 font-medium">অথবা</span>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>

              {/* Student Signup button */}
              <button
                onClick={() => { resetForm(); setView("student-signup"); }}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 bg-white/[0.05] border border-white/[0.08] rounded-2xl text-white text-[13px] font-medium hover:bg-white/[0.08] hover:border-white/[0.12] transition-all duration-300 active:scale-95"
              >
                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
                </svg>
                <span>ছাত্র হিসেবে সাইন আপ করো</span>
              </button>

              {/* Student Login link */}
              <button
                onClick={() => { resetForm(); setView("student-login"); }}
                className="mt-3 text-[12px] text-gray-500 hover:text-violet-400 transition-colors duration-200"
              >
                ইতিমধ্যে অ্যাকাউন্ট আছে? <span className="text-violet-400 font-medium">Student ID দিয়ে লগইন করো</span>
              </button>

              {/* Guest option */}
              <button
                onClick={onClose}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-gray-500 text-[12px] hover:text-gray-400 hover:bg-white/[0.03] rounded-2xl transition-all duration-200 mt-4"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                <span>বিনা লগইনে চালিয়ে যাও (Guest)</span>
              </button>
            </>
          )}

          {/* ═══════════ STUDENT SIGNUP VIEW ═══════════ */}
          {view === "student-signup" && (
            <>
              <button
                onClick={() => { resetForm(); setView("main"); }}
                className="absolute top-5 left-5 w-8 h-8 rounded-2xl flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/[0.06] transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {createdStudentId ? (
                /* ═══ Success: Show generated Student ID ═══ */
                <>
                  <div className="w-16 h-16 rounded-[20px] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-white text-[18px] font-semibold mb-1.5 tracking-[-0.01em]">
                    অ্যাকাউন্ট তৈরি হয়েছে!
                  </h2>
                  <p className="text-gray-500 text-[13px] text-center mb-5 leading-relaxed">
                    তোমার Student ID মনে রাখো বা সেভ করো
                  </p>

                  <div className="w-full bg-white/[0.05] border border-emerald-500/20 rounded-2xl p-4 text-center mb-4">
                    <p className="text-[11px] text-gray-500 mb-2">তোমার Student ID</p>
                    <p className="text-[22px] font-bold text-emerald-400 font-mono tracking-[0.15em]">
                      {createdStudentId}
                    </p>
                    <p className="text-[11px] text-gray-600 mt-2">
                      {fullName} • পাসওয়ার্ড দিয়ে লগইন করো
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(createdStudentId);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 text-[12px] text-gray-400 hover:text-white bg-white/[0.04] border border-white/[0.06] rounded-2xl mb-4 transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                    </svg>
                    Student ID কপি করো
                  </button>

                  <button
                    onClick={onClose}
                    className="w-full py-3 text-[13px] font-semibold text-black bg-white rounded-2xl hover:shadow-[0_4px_20px_rgba(255,255,255,0.15)] transition-all duration-300 active:scale-95"
                  >
                    শুরু করো
                  </button>
                </>
              ) : (
                /* ═══ Signup Form ═══ */
                <>
                  <h2 className="text-white text-[18px] font-semibold mb-1.5 tracking-[-0.01em]">
                    ছাত্র হিসেবে সাইন আপ
                  </h2>
                  <p className="text-gray-500 text-[13px] text-center mb-5 leading-relaxed">
                    তথ্য দিলে তোমার নিজের Student ID তৈরি হবে
                  </p>

                  {/* Full Name */}
                  <div className="w-full mb-3">
                    <label className="text-[12px] text-gray-400 mb-1.5 block font-medium">পুরো নাম *</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="যেমন: আহমেদ রাফি"
                      className="w-full bg-white/[0.05] border border-white/[0.08] rounded-2xl px-4 py-3 text-[14px] text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/40 focus:shadow-[0_0_0_4px_rgba(139,92,246,0.08)] focus:bg-white/[0.07] transition-all duration-300 tracking-[-0.01em]"
                    />
                  </div>

                  {/* School */}
                  <div className="w-full mb-3">
                    <label className="text-[12px] text-gray-400 mb-1.5 block font-medium">স্কুল / কলেজ</label>
                    <input
                      type="text"
                      value={school}
                      onChange={(e) => setSchool(e.target.value)}
                      placeholder="যেমন: ঢাকা পাবলিক স্কুল"
                      className="w-full bg-white/[0.05] border border-white/[0.08] rounded-2xl px-4 py-3 text-[14px] text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/40 focus:shadow-[0_0_0_4px_rgba(139,92,246,0.08)] focus:bg-white/[0.07] transition-all duration-300 tracking-[-0.01em]"
                    />
                  </div>

                  {/* College */}
                  <div className="w-full mb-3">
                    <label className="text-[12px] text-gray-400 mb-1.5 block font-medium">কলেজ / বিশ্ববিদ্যালয় <span className="text-gray-600">(ঐচ্ছিক)</span></label>
                    <input
                      type="text"
                      value={college}
                      onChange={(e) => setCollege(e.target.value)}
                      placeholder="যেমন: ঢাকা কলেজ"
                      className="w-full bg-white/[0.05] border border-white/[0.08] rounded-2xl px-4 py-3 text-[14px] text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/40 focus:shadow-[0_0_0_4px_rgba(139,92,246,0.08)] focus:bg-white/[0.07] transition-all duration-300 tracking-[-0.01em]"
                    />
                  </div>

                  {/* Class */}
                  <div className="w-full mb-3">
                    <label className="text-[12px] text-gray-400 mb-1.5 block font-medium">শ্রেণী / বিভাগ</label>
                    <input
                      type="text"
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      placeholder="যেমন: SSC / Class 10"
                      className="w-full bg-white/[0.05] border border-white/[0.08] rounded-2xl px-4 py-3 text-[14px] text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/40 focus:shadow-[0_0_0_4px_rgba(139,92,246,0.08)] focus:bg-white/[0.07] transition-all duration-300 tracking-[-0.01em]"
                    />
                  </div>

                  {/* Password */}
                  <div className="w-full mb-4">
                    <label className="text-[12px] text-gray-400 mb-1.5 block font-medium">পাসওয়ার্ড *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="কমপক্ষে ৬ অক্ষর"
                        className="w-full bg-white/[0.05] border border-white/[0.08] rounded-2xl px-4 py-3 pr-12 text-[14px] text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/40 focus:shadow-[0_0_0_4px_rgba(139,92,246,0.08)] focus:bg-white/[0.07] transition-all duration-300 tracking-[-0.01em]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        {showPassword ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Error */}
                  {error && <p className="text-[12px] text-red-400 text-center mb-3">{error}</p>}

                  {/* Submit */}
                  <button
                    onClick={handleStudentSignup}
                    disabled={loading || !fullName.trim() || !password.trim() || password.length < 6}
                    className="w-full py-3.5 text-[13px] font-semibold text-black bg-white rounded-2xl hover:shadow-[0_4px_20px_rgba(255,255,255,0.15)] disabled:opacity-40 transition-all duration-300 active:scale-95"
                  >
                    {loading ? "তৈরি হচ্ছে..." : "সাইন আপ করো"}
                  </button>

                  {/* Switch to login */}
                  <p className="mt-4 text-[12px] text-gray-500">
                    ইতিমধ্যে অ্যাকাউন্ট আছে?{" "}
                    <button onClick={() => { resetForm(); setView("student-login"); }} className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
                      লগইন করো
                    </button>
                  </p>
                </>
              )}
            </>
          )}

          {/* ═══════════ STUDENT LOGIN VIEW ═══════════ */}
          {view === "student-login" && (
            <>
              <button
                onClick={() => { resetForm(); setView("main"); }}
                className="absolute top-5 left-5 w-8 h-8 rounded-2xl flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/[0.06] transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <h2 className="text-white text-[18px] font-semibold mb-1.5 tracking-[-0.01em]">
                Student ID দিয়ে লগইন
              </h2>
              <p className="text-gray-500 text-[13px] text-center mb-6 leading-relaxed">
                তোমার Student ID ও পাসওয়ার্ড দিয়ে লগইন করো
              </p>

              {/* Student ID field */}
              <div className="w-full mb-3">
                <label className="text-[12px] text-gray-400 mb-1.5 block font-medium">Student ID</label>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value.toUpperCase())}
                  placeholder="CSH_XXXXXX"
                  maxLength={10}
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-2xl px-4 py-3 text-[14px] text-white font-mono placeholder-gray-600 focus:outline-none focus:border-violet-500/40 focus:shadow-[0_0_0_4px_rgba(139,92,246,0.08)] focus:bg-white/[0.07] transition-all duration-300 tracking-[0.1em]"
                />
              </div>

              {/* Password field */}
              <div className="w-full mb-4">
                <label className="text-[12px] text-gray-400 mb-1.5 block font-medium">পাসওয়ার্ড</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="তোমার পাসওয়ার্ড"
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-2xl px-4 py-3 pr-12 text-[14px] text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/40 focus:shadow-[0_0_0_4px_rgba(139,92,246,0.08)] focus:bg-white/[0.07] transition-all duration-300 tracking-[-0.01em]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && <p className="text-[12px] text-red-400 text-center mb-3">{error}</p>}
              {success && <p className="text-[12px] text-emerald-400 text-center mb-3">{success}</p>}

              {/* Submit */}
              <button
                onClick={handleStudentLogin}
                disabled={loading || !studentId.trim() || !loginPassword.trim()}
                className="w-full py-3.5 text-[13px] font-semibold text-black bg-white rounded-2xl hover:shadow-[0_4px_20px_rgba(255,255,255,0.15)] disabled:opacity-40 transition-all duration-300 active:scale-95"
              >
                {loading ? "লগইন হচ্ছে..." : "লগইন করো"}
              </button>

              {/* Switch to signup */}
              <p className="mt-4 text-[12px] text-gray-500">
                অ্যাকাউন্ট নেই?{" "}
                <button onClick={() => { resetForm(); setView("student-signup"); }} className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
                  সাইন আপ করো
                </button>
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/[0.04] px-8 py-3 bg-white/[0.01]">
          <p className="text-[10px] text-gray-600 text-center leading-relaxed">
            লগইন করলে তোমার চ্যাট ইতিহাস ও অগ্রগতি সংরক্ষিত থাকবে
          </p>
        </div>
      </div>
    </div>
  );
}
