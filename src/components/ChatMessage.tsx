import { useState } from "react";
import MarkdownRenderer from "./MarkdownRenderer";

interface ChatMessageProps {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  model?: string;
  isLast?: boolean;
  onRegenerate?: () => void;
  onQuickAction?: (action: string) => void;
}

const QUICK_ACTIONS_BY_CONTEXT = {
  code: ["Explain", "Optimize", "Add comments", "Debug"],
  writing: ["Rewrite", "Shorten", "Make professional", "Change tone"],
  general: ["Explain simply", "Give example", "Expand", "Summarize"],
};

function detectContext(content: string): keyof typeof QUICK_ACTIONS_BY_CONTEXT {
  const codeIndicators = ["```", "function ", "const ", "import ", "class ", "def ", "return ", "=>", "console."];
  const writingIndicators = ["story", "write", "essay", "paragraph", "article", "poem", "letter", "email"];
  const lower = content.toLowerCase();

  if (codeIndicators.some(ind => content.includes(ind))) return "code";
  if (writingIndicators.some(ind => lower.includes(ind))) return "writing";
  return "general";
}

export default function ChatMessage({ id, role, content, timestamp, model, isLast, onRegenerate, onQuickAction }: ChatMessageProps) {
  const [showActions, setShowActions] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reaction, setReaction] = useState<"good" | "bad" | null>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReaction = (type: "good" | "bad") => {
    setReaction(reaction === type ? null : type);
  };

  if (role === "user") {
    return (
      <div className="flex justify-end message-enter group"
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}>
        <div className="flex items-end gap-2 max-w-[80%] sm:max-w-[70%]">
          {/* Copy button — hover */}
          <div className={`flex items-center gap-1 transition-opacity duration-200 ${showActions ? "opacity-100" : "opacity-0"}`}>
            <button onClick={handleCopy}
              className="p-1.5 rounded-lg text-gray-600 hover:text-gray-400 hover:bg-white/[0.04] transition-all"
              title="Copy">
              {copied ? (
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>

          <div className="px-5 py-3 rounded-2xl rounded-br-md bg-gradient-to-r from-indigo-600/90 to-purple-600/90 text-white">
            <p className="whitespace-pre-wrap leading-relaxed text-[14px]">{content}</p>
            <p className="text-[11px] text-white/40 text-right mt-1.5">
              {timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Assistant message
  const context = detectContext(content);
  const quickActions = QUICK_ACTIONS_BY_CONTEXT[context];

  return (
    <div className="flex justify-start message-enter group"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}>
      <div className="flex gap-3 max-w-3xl w-full">
        {/* Avatar */}
        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          {/* Name */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[13px] font-semibold text-gray-300">Xparrow</span>
            <span className="text-[10px] text-gray-600">
              {timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>

          {/* Content */}
          <div className="text-[14px] leading-relaxed">
            <MarkdownRenderer content={content} />
          </div>

          {/* Response Actions — visible on hover */}
          <div className={`flex items-center gap-1 mt-2 transition-opacity duration-200 ${showActions ? "opacity-100" : "opacity-0"}`}>
            {/* Copy */}
            <button onClick={handleCopy}
              className="p-1.5 rounded-lg text-gray-600 hover:text-gray-400 hover:bg-white/[0.04] transition-all"
              title="Copy">
              {copied ? (
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>

            {/* Regenerate */}
            {onRegenerate && (
              <button onClick={onRegenerate}
                className="p-1.5 rounded-lg text-gray-600 hover:text-gray-400 hover:bg-white/[0.04] transition-all"
                title="Regenerate">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}

            {/* Good */}
            <button onClick={() => handleReaction("good")}
              className={`p-1.5 rounded-lg transition-all ${reaction === "good" ? "text-emerald-400 bg-emerald-400/10" : "text-gray-600 hover:text-gray-400 hover:bg-white/[0.04]"}`}
              title="Good response">
              <svg className="w-4 h-4" fill={reaction === "good" ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
              </svg>
            </button>

            {/* Bad */}
            <button onClick={() => handleReaction("bad")}
              className={`p-1.5 rounded-lg transition-all ${reaction === "bad" ? "text-red-400 bg-red-400/10" : "text-gray-600 hover:text-gray-400 hover:bg-white/[0.04]"}`}
              title="Bad response">
              <svg className="w-4 h-4" fill={reaction === "bad" ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
              </svg>
            </button>
          </div>

          {/* Quick Actions — shown for last assistant message */}
          {isLast && onQuickAction && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {quickActions.map((action) => (
                <button key={action}
                  onClick={() => onQuickAction(action)}
                  className="px-3 py-1.5 rounded-lg text-[12px] text-gray-500 bg-white/[0.03] border border-white/[0.06] hover:text-gray-300 hover:bg-white/[0.06] hover:border-white/[0.1] transition-all">
                  {action}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
