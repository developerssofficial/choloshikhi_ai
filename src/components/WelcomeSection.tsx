interface WelcomeSectionProps {
  onSendMessage: (message: string) => void;
}

const SUGGESTIONS = [
  { label: "Ask anything", prompt: "Tell me about" },
  { label: "Write something", prompt: "Help me write" },
  { label: "Analyze a file", prompt: "Analyze this file for me" },
  { label: "Help me code", prompt: "Write a code for" },
];

export default function WelcomeSection({ onSendMessage }: WelcomeSectionProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative">
      {/* Subtle background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-purple-600/5 rounded-full blur-[80px] pointer-events-none" />

      {/* Logo */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-purple-500/20 rounded-2xl blur-2xl scale-150" />
        <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #7c3aed, #6366f1)" }}>
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
      </div>

      {/* Text */}
      <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 text-center">
        Welcome to Xparrow AI
      </h1>
      <p className="text-gray-500 text-sm text-center mb-10 max-w-sm">
        Your intelligent assistant for work, ideas and everything in between.
      </p>

      {/* Suggestion pills */}
      <div className="flex flex-wrap justify-center gap-2 max-w-lg">
        {SUGGESTIONS.map((s, i) => (
          <button
            key={i}
            onClick={() => onSendMessage(s.prompt)}
            className="px-4 py-2 rounded-xl text-[13px] text-gray-400 bg-white/[0.04] border border-white/[0.06] hover:text-white hover:bg-white/[0.07] hover:border-white/[0.1] transition-all"
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
