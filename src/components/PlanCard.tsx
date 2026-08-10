import { useState } from "react";
import type { PlanData, PlanPhaseGroup, PlanTask, TaskStatus, PlanPhase } from "@/types/plan";

interface PlanCardProps {
  data: PlanData;
  phase: PlanPhase;
  executionProgress: number;
  onStart?: () => void;
  onEdit?: () => void;
  onRegenerate?: () => void;
  onTaskToggle?: (taskId: string) => void;
  onSendMessage?: (message: string) => void;
}

const COMPLEXITY_CONFIG = {
  simple: { label: "Simple", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  medium: { label: "Medium", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  complex: { label: "Complex", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" },
};

const STATUS_CONFIG: Record<TaskStatus, { icon: React.ReactNode; color: string; label: string }> = {
  pending: { icon: <div className="w-4 h-4 rounded-full border-2 border-gray-600"></div>, color: "text-gray-500", label: "Pending" },
  in_progress: { icon: <div className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin"></div>, color: "text-indigo-400", label: "In Progress" },
  completed: { icon: <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>, color: "text-emerald-400", label: "Done" },
  skipped: { icon: <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>, color: "text-gray-600", label: "Skipped" },
};

const EFFORT_CONFIG = {
  easy: { label: "Easy", color: "text-emerald-400 bg-emerald-500/10" },
  medium: { label: "Medium", color: "text-amber-400 bg-amber-500/10" },
  hard: { label: "Hard", color: "text-rose-400 bg-rose-500/10" },
};

export default function PlanCard({ data, phase, executionProgress, onStart, onEdit, onRegenerate, onTaskToggle, onSendMessage }: PlanCardProps) {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  // Safe access — handle any unexpected data shape
  const safeData = {
    goal: data.goal || "Untitled Goal",
    complexity: COMPLEXITY_CONFIG[data.complexity] ? data.complexity : "medium" as const,
    summary: data.summary || "",
    phases: Array.isArray(data.phases) ? data.phases : [],
    dependencies: Array.isArray(data.dependencies) ? data.dependencies : [],
    missingInfo: Array.isArray(data.missingInfo) ? data.missingInfo : [],
  };

  const totalTasks = safeData.phases.reduce((sum, p) => sum + (Array.isArray(p.tasks) ? p.tasks.length : 0), 0);
  const completedTasks = safeData.phases.reduce((sum, p) => sum + (Array.isArray(p.tasks) ? p.tasks.filter(t => t.status === "completed").length : 0), 0);

  const toggleTask = (id: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="max-w-3xl w-full mx-auto">
      {/* Plan Header */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
        {/* Status Bar */}
        <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
            <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider">Plan</span>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${COMPLEXITY_CONFIG[safeData.complexity].bg} ${COMPLEXITY_CONFIG[safeData.complexity].color} border ${COMPLEXITY_CONFIG[safeData.complexity].border}`}>
              {COMPLEXITY_CONFIG[safeData.complexity].label}
            </span>
          </div>
          <span className="text-[11px] text-gray-600">{completedTasks}/{totalTasks} tasks</span>
        </div>

        {/* Goal */}
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Goal</p>
          <h3 className="text-lg font-bold text-white">{safeData.goal}</h3>
          <p className="text-[13px] text-gray-400 mt-1">{safeData.summary}</p>
        </div>

        {/* Progress Bar */}
        {phase === "executing" && (
          <div className="px-5 py-3 border-b border-white/[0.06]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-gray-400">Progress</span>
              <span className="text-[11px] font-bold text-purple-400">{executionProgress}%</span>
            </div>
            <div className="w-full bg-white/[0.06] rounded-full h-2">
              <div className="h-2 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${executionProgress}%`, background: "linear-gradient(90deg, #7c3aed, #6366f1)" }}></div>
            </div>
          </div>
        )}

        {/* Phases & Tasks */}
        <div className="px-5 py-4 space-y-5">
          {safeData.phases.map((phaseGroup, pi) => (
            <PhaseSection
              key={phaseGroup.id}
              phase={phaseGroup}
              phaseIndex={pi}
              totalPhases={data.phases.length}
              expandedTasks={expandedTasks}
              onToggle={toggleTask}
              onTaskToggle={onTaskToggle}
              isExecuting={phase === "executing"}
            />
          ))}
        </div>

        {/* Dependencies */}
        {safeData.dependencies.length > 0 && (
          <div className="px-5 py-3 border-t border-white/[0.06]">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Dependencies</p>
            <div className="flex flex-wrap gap-2">
              {safeData.dependencies.map((dep, i) => (
                <div key={i} className="flex items-center space-x-1.5 text-[11px] text-gray-500 bg-white/[0.03] px-2.5 py-1 rounded-lg border border-white/[0.06]">
                  <span className="text-gray-400">{dep.from}</span>
                  <svg className="w-3 h-3 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <span className="text-gray-400">{dep.to}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Missing Info */}
        {safeData.missingInfo.length > 0 && (
          <div className="px-5 py-3 border-t border-white/[0.06]">
            <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider mb-2">Needs Input</p>
            {safeData.missingInfo.map((info, i) => (
              <MissingInfoItem key={i} info={info} onSendMessage={onSendMessage} />
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="px-5 py-4 border-t border-white/[0.06] flex flex-wrap gap-2">
          {phase === "ready" && (
            <button onClick={onStart}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white btn-click"
              style={{ background: "linear-gradient(135deg, #7c3aed, #6366f1)" }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Start Plan</span>
            </button>
          )}
          {phase === "ready" && (
            <button onClick={onEdit}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl text-[13px] font-medium text-gray-400 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:text-white transition-all btn-click">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Edit Plan</span>
            </button>
          )}
          {phase === "ready" && (
            <button onClick={onRegenerate}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl text-[13px] font-medium text-gray-400 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:text-white transition-all btn-click">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Regenerate</span>
            </button>
          )}
          {phase === "completed" && (
            <div className="flex items-center space-x-2 text-emerald-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-[13px] font-semibold">Plan Completed</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MissingInfoItem({ info, onSendMessage }: { info: any; onSendMessage?: (msg: string) => void }) {
  const [inputVal, setInputVal] = useState("");
  const options = Array.isArray(info.options) ? info.options : [];

  const handleSubmit = () => {
    if (inputVal.trim() && onSendMessage) {
      onSendMessage(`${info.question}: ${inputVal.trim()}`);
      setInputVal("");
    }
  };

  return (
    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 mb-2 last:mb-0">
      <p className="text-[13px] text-amber-300 mb-2">{info.question}</p>

      {/* Option buttons — show if options exist */}
      {options.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {options.map((opt: string, oi: number) => (
            <button
              key={oi}
              onClick={() => onSendMessage?.(`${info.question}: ${opt}`)}
              className={`text-[12px] px-3 py-1.5 rounded-lg border transition-all btn-click ${
                info.selected === opt
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                  : "bg-white/[0.03] border-white/[0.08] text-gray-400 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {/* Text input — always show for free-form answer */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          placeholder="Type your answer..."
          className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-[12px] text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/30 transition-colors"
        />
        <button
          onClick={handleSubmit}
          disabled={!inputVal.trim()}
          className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-amber-300 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>
    </div>
  );
}

function PhaseSection({ phase: phaseGroup, phaseIndex, totalPhases, expandedTasks, onToggle, onTaskToggle, isExecuting }: {
  phase: PlanPhaseGroup;
  phaseIndex: number;
  totalPhases: number;
  expandedTasks: Set<string>;
  onToggle: (id: string) => void;
  onTaskToggle?: (taskId: string) => void;
  isExecuting: boolean;
}) {
  const safeTasks = Array.isArray(phaseGroup.tasks) ? phaseGroup.tasks : [];
  const completedInPhase = safeTasks.filter(t => t.status === "completed").length;
  const phaseComplete = safeTasks.length > 0 && completedInPhase === safeTasks.length;

  return (
    <div>
      {/* Phase Header */}
      <div className="flex items-center space-x-3 mb-3">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold ${
          phaseComplete ? "bg-emerald-500/20 text-emerald-400" : "bg-purple-500/15 text-purple-400"
        }`}>
          {phaseComplete ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
          ) : (
            <span>{phaseIndex + 1}</span>
          )}
        </div>
        <div>
          <h4 className="text-[13px] font-bold text-white">{phaseGroup.title}</h4>
          <p className="text-[11px] text-gray-600">{completedInPhase}/{safeTasks.length} tasks</p>
        </div>
      </div>

      {/* Tasks */}
      <div className="ml-3.5 border-l border-white/[0.06] pl-4 space-y-1.5">
        {safeTasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            expanded={expandedTasks.has(task.id)}
            onToggle={() => onToggle(task.id)}
            onStatusToggle={isExecuting ? () => onTaskToggle?.(task.id) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function TaskItem({ task, expanded, onToggle, onStatusToggle }: {
  task: PlanTask;
  expanded: boolean;
  onToggle: () => void;
  onStatusToggle?: () => void;
}) {
  const status = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;

  return (
    <div className={`rounded-xl border transition-all ${
      task.status === "completed"
        ? "bg-emerald-500/[0.03] border-emerald-500/10"
        : task.status === "in_progress"
        ? "bg-indigo-500/[0.03] border-indigo-500/20"
        : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1]"
    }`}>
      <div className="flex items-center space-x-3 px-3.5 py-2.5 cursor-pointer" onClick={onToggle}>
        {/* Status Icon */}
        <button onClick={(e) => { e.stopPropagation(); onStatusToggle?.(); }} className="flex-shrink-0">
          {status.icon}
        </button>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <p className={`text-[13px] font-medium ${task.status === "completed" ? "text-gray-500 line-through" : "text-gray-200"}`}>
            {task.title}
          </p>
        </div>

        {/* Effort Badge */}
        {task.effort && (
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${EFFORT_CONFIG[task.effort].color}`}>
            {EFFORT_CONFIG[task.effort].label}
          </span>
        )}

        {/* Expand Arrow */}
        <svg className={`w-3.5 h-3.5 text-gray-600 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-3.5 pb-3 pt-0 border-t border-white/[0.04] mt-0">
          <p className="text-[12px] text-gray-500 mt-2 leading-relaxed">{task.description}</p>
          <div className="flex items-center space-x-4 mt-2">
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] text-gray-600">Status:</span>
              <span className={`text-[10px] font-medium ${status.color}`}>{status.label}</span>
            </div>
            {task.dependencies && task.dependencies.length > 0 && (
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] text-gray-600">Depends on:</span>
                <span className="text-[10px] text-purple-400">{task.dependencies.join(", ")}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
