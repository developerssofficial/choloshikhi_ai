"use client";

interface Props {
  onLogin: () => void;
  onClose: () => void;
}

export default function ChatModal({ onLogin, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a1a24] border border-white/[0.08] rounded-2xl p-7 max-w-sm w-full mx-4 shadow-2xl text-center">
        <div className="w-11 h-11 mx-auto mb-4 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
          <span className="text-white text-lg font-bold">চ</span>
        </div>

        <h2 className="text-base font-semibold text-white mb-1.5">ফ্রি চ্যাট শেষ!</h2>
        <p className="text-gray-500 text-xs mb-5 leading-relaxed">
          তুমি ১৫টি ফ্রি মেসেজ ব্যবহার করে ফেলেছো।<br />
          লগইন করলে <span className="text-violet-400">প্রতিদিন ৫০টি</span> পাবে!
        </p>

        <button onClick={onLogin}
          className="w-full py-2.5 rounded-xl bg-violet-600 text-white font-medium text-sm hover:bg-violet-500 transition-all flex items-center justify-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" /><path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
          Google দিয়ে লগইন
        </button>

        <button onClick={onClose} className="mt-2.5 text-gray-600 hover:text-gray-400 text-xs transition-colors">
          পরে আবার
        </button>
      </div>
    </div>
  );
}