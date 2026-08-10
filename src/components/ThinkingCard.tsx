import { useState } from "react";
import type { ThinkingData, ThinkingStep, ThinkingAnalysis } from "@/types/thinking";

interface ThinkingCardProps {
  data: ThinkingData;
  isProcessing?: boolean;
  onExpand?: () => void;
  onCreatePlan?: () => void;
  onSendMessage?: (message: string) => void;
}

const DEPTH_CONFIG = {
  light: { label: "Light", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  deep: { label: "Deep", color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
  advanced: { label: "Advanced", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
};

export default function ThinkingCard({ data, isProcessing = false, onExpand, onCreatePlan, onSendMessage }: ThinkingCardProps) {
  const [showSummary, setShowSummary] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const depth = DEPTH_CONFIG[data.analysis.depth] || DEPTH_CONFIG.deep;

  return (
    <div className="max-w-3xl w-full mx-auto space-y-3">
      {/* Thinking Status Bar */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
        <div className="px-5 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
            <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">Thinking</span>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${depth.bg} ${depth.color} border ${depth.border}`}>
              {depth.label}
            </span>
          </div>
          <span className="text-[11px] text-gray-600">
            {isProcessing ? "Analyzing..." : "Analysis complete"}
          </span>
        </div>

        {/* Steps */}
        <div className="px-5 py-3 border-t border-white/[0.06] space-y-2">
          {data.analysis.steps.map((step) => (
            <ThinkingStepItem key={step.id} step={step} />
          ))}
        </div>
      </div>

      {/* Final Answer */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
        <div className="px-5 py-4">
          <p className="whitespace-pre-wrap leading-relaxed text-[14px] text-gray-200">{data.answer}</p>
        </div>

        {/* Expandable Sections */}
        <div className="border-t border-white/[0.06]">
          {/* Thinking Summary Toggle */}
          {data.thinkingSummary && (
            <button onClick={() => setShowSummary(!showSummary)}
              className="w-full px-5 py-3 flex items-center justify-between hover:bg-white/[0.03] transition-colors">
              <span className="text-[12px] font-medium text-gray-400">Thinking Summary</span>
              <svg className={`w-3.5 h-3.5 text-gray-600 transition-transform ${showSummary ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
          {showSummary && data.thinkingSummary && (
            <div className="px-5 pb-4 space-y-2">
              {data.thinkingSummary.factors && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Key Factors</p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.thinkingSummary.factors.map((f, i) => (
                      <span key={i} className="text-[11px] text-gray-300 bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/[0.06]">{f}</span>
                    ))}
                  </div>
                </div>
              )}
              {data.thinkingSummary.assumption && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Assumption</p>
                  <p className="text-[12px] text-gray-400">{data.thinkingSummary.assumption}</p>
                </div>
              )}
              {data.thinkingSummary.tradeoff && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Trade-off</p>
                  <p className="text-[12px] text-gray-400">{data.thinkingSummary.tradeoff}</p>
                </div>
              )}
              {data.thinkingSummary.decision && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Decision</p>
                  <p className="text-[12px] text-gray-400">{data.thinkingSummary.decision}</p>
                </div>
              )}
            </div>
          )}

          {/* Alternatives Toggle */}
          {data.analysis.alternatives && data.analysis.alternatives.length > 0 && (
            <button onClick={() => setShowAlternatives(!showAlternatives)}
              className="w-full px-5 py-3 flex items-center justify-between hover:bg-white/[0.03] transition-colors border-t border-white/[0.06]">
              <span className="text-[12px] font-medium text-gray-400">Alternatives</span>
              <svg className={`w-3.5 h-3.5 text-gray-600 transition-transform ${showAlternatives ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
          {showAlternatives && data.analysis.alternatives && (
            <div className="px-5 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.analysis.alternatives.map((alt, i) => (
                <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
                  <p className="text-[13px] font-semibold text-white mb-2">{alt.name}</p>
                  <div className="space-y-1">
                    {alt.pros.map((pro, pi) => (
                      <div key={pi} className="flex items-start space-x-1.5">
                        <svg className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-[11px] text-gray-400">{pro}</span>
                      </div>
                    ))}
                    {alt.cons.map((con, ci) => (
                      <div key={ci} className="flex items-start space-x-1.5">
                        <svg className="w-3 h-3 text-rose-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        <span className="text-[11px] text-gray-400">{con}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Full Analysis Toggle */}
          <button onClick={() => setShowAnalysis(!showAnalysis)}
            className="w-full px-5 py-3 flex items-center justify-between hover:bg-white/[0.03] transition-colors border-t border-white/[0.06]">
            <span className="text-[12px] font-medium text-gray-400">Full Analysis</span>
            <svg className={`w-3.5 h-3.5 text-gray-600 transition-transform ${showAnalysis ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showAnalysis && (
            <div className="px-5 pb-4 space-y-3">
              {data.analysis.known && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
                  <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider mb-1">Known</p>
                  <p className="text-[12px] text-gray-400">{data.analysis.known}</p>
                </div>
              )}
              {data.analysis.assumption && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                  <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider mb-1">Assumption</p>
                  <p className="text-[12px] text-gray-400">{data.analysis.assumption}</p>
                </div>
              )}
              {data.analysis.recommendation && (
                <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-3">
                  <p className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider mb-1">Recommendation</p>
                  <p className="text-[12px] text-gray-400">{data.analysis.recommendation}</p>
                </div>
              )}
              {data.analysis.limitation && (
                <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-3">
                  <p className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider mb-1">Limitation</p>
                  <p className="text-[12px] text-gray-400">{data.analysis.limitation}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Create Plan Offer */}
        {data.createPlanOffer && (
          <div className="px-5 py-3 border-t border-white/[0.06]">
            <button onClick={onCreatePlan}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl text-[13px] font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all btn-click">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>Create Plan from this Analysis</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ThinkingStepItem({ step }: { step: ThinkingStep }) {
  const statusConfig = {
    completed: { icon: <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>, color: "text-gray-400 line-through" },
    in_progress: { icon: <div className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin"></div>, color: "text-white" },
    pending: { icon: <div className="w-4 h-4 rounded-full border-2 border-gray-600"></div>, color: "text-gray-600" },
  };
  const config = statusConfig[step.status];

  return (
    <div className="flex items-center space-x-3">
      <div className="flex-shrink-0">{config.icon}</div>
      <span className={`text-[13px] ${config.color}`}>{step.label}</span>
    </div>
  );
}
