import { useRef, useEffect } from "react";

type ModelTier = "low" | "medium" | "pro";

interface MessageComposerProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  isDisabled: boolean;
  selectedTier: ModelTier;
  onSelectTier: (tier: ModelTier) => void;
  isPro: boolean;
  systemMode: "chat" | "thinking" | "plan";
}

const MODELS = [
  { id: "low" as ModelTier, label: "Xparrow 1.0 Lite" },
  { id: "medium" as ModelTier, label: "Xparrow 1.0 Medium" },
  { id: "pro" as ModelTier, label: "Xparrow 1.0 Pro" },
];

export default function MessageComposer({
  input, onInputChange, onSubmit, isLoading, isDisabled, selectedTier, onSelectTier, isPro, systemMode,
}: MessageComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const placeholder =
    systemMode === "plan" ? "Describe your task — AI will create a step-by-step plan..."
    : systemMode === "thinking" ? "Ask a complex question — AI will analyze deeply..."
    : "Type your message...";

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isDisabled) {
        onSubmit(e as any);
      }
    }
  };

  return (
    <div className="border-t border-white/[0.06] bg-[#0a0a12]/80 backdrop-blur-xl">
      <div className="px-4 sm:px-6 pb-4 pt-4 max-w-3xl mx-auto w-full">
        <form onSubmit={onSubmit} className="relative">
          <div className="flex items-end bg-white/[0.05] border border-white/[0.08] rounded-2xl focus-within:border-purple-500/30 focus-within:bg-white/[0.07] transition-all shadow-lg shadow-black/10">
            {/* Purple circular plus button */}
            <button type="button" className="ml-2 mb-2.5 w-9 h-9 rounded-full flex items-center justify-center text-white flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #7c3aed, #6366f1)" }}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>

            {/* Textarea — multiline */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              maxLength={10000}
              rows={1}
              className="flex-1 bg-transparent py-3 px-3 text-[15px] text-white placeholder-gray-600 focus:outline-none resize-none max-h-[200px] leading-relaxed"
              disabled={isLoading}
            />

            {/* Right side buttons */}
            <div className="flex items-center gap-0.5 mr-2 mb-2">
              {/* Mic */}
              <button type="button" className="p-2 text-gray-600 hover:text-gray-400 transition-colors rounded-lg">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>

              {/* Attachment */}
              <button type="button" className="p-2 text-gray-600 hover:text-gray-400 transition-colors rounded-lg">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>

              {/* Send */}
              <button
                type="submit"
                disabled={isDisabled}
                className="w-9 h-9 rounded-full flex items-center justify-center text-white flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed transition-all btn-click"
                style={{ background: "linear-gradient(135deg, #7c3aed, #6366f1)" }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </form>

        {/* Hint */}
        <p className="text-[11px] text-gray-700 text-center mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>

      {/* Model Switcher */}
      <div className="flex items-center justify-center space-x-1.5 px-4 pb-4 pt-0">
        {MODELS.map((model) => {
          const locked = model.id === "pro" && !isPro;
          return (
            <button
              key={model.id}
              onClick={() => {
                if (locked) window.location.href = "/pro";
                else onSelectTier(model.id);
              }}
              className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-[11px] font-medium transition-all ${
                selectedTier === model.id
                  ? "bg-white/[0.08] text-white border border-white/[0.1]"
                  : locked
                  ? "text-gray-700 cursor-default"
                  : "text-gray-600 hover:text-gray-400 hover:bg-white/[0.04]"
              }`}
            >
              {model.id === "pro" ? (
                <svg className="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14v2H5v-2z" />
                </svg>
              ) : (
                <div className={`w-1.5 h-1.5 rounded-full ${selectedTier === model.id ? "bg-purple-400" : "bg-gray-700"}`}></div>
              )}
              <span>{model.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
