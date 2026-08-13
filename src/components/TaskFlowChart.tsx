"use client";

import { useState } from "react";

/* ===================================================================
   TaskFlowChart — Interactive task planning flowchart
   Renders a structured JSON task graph as an expandable node list
   with dependency indicators, status states, and progress tracking.
   =================================================================== */

export interface TaskNode {
  id: string;
  title: string;
  description: string;
  status: "pending" | "running" | "completed" | "failed";
  dependencies: string[];
  details?: string;
  progress?: number; // 0-100
}

export interface TaskGraph {
  title: string;
  taskType: "research" | "coding" | "planning" | "study" | "content";
  nodes: TaskNode[];
}

const TASK_TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  research: { label: "Research", icon: "🔍", color: "sky" },
  coding: { label: "Coding", icon: "💻", color: "violet" },
  planning: { label: "Planning", icon: "📋", color: "amber" },
  study: { label: "Study Plan", icon: "📚", color: "emerald" },
  content: { label: "Content", icon: "✍️", color: "rose" },
};

const STATUS_CONFIG = {
  completed: { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: "✓", ring: "ring-emerald-500/30" },
  running:   { color: "text-violet-400",  bg: "bg-violet-500/10",  border: "border-violet-500/20",  icon: "●", ring: "ring-violet-500/30" },
  pending:   { color: "text-gray-500",    bg: "bg-white/[0.03]",   border: "border-white/[0.06]",   icon: "○", ring: "" },
  failed:    { color: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/20",      icon: "✕", ring: "ring-red-500/30" },
};

export default function TaskFlowChart({ graph }: { graph: TaskGraph }) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const toggleNode = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const typeInfo = TASK_TYPE_LABELS[graph.taskType] || TASK_TYPE_LABELS.planning;

  const completedCount = graph.nodes.filter((n) => n.status === "completed").length;
  const totalNodes = graph.nodes.length;
  const overallProgress = totalNodes > 0 ? Math.round((completedCount / totalNodes) * 100) : 0;

  // Build dependency lookup
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));

  return (
    <div className="mt-3 border border-white/[0.08] rounded-2xl overflow-hidden bg-[#12121a]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-base">{typeInfo.icon}</span>
          <div>
            <h4 className="text-[13px] font-semibold text-white leading-tight">{graph.title}</h4>
            <p className="text-[10px] text-gray-500 mt-0.5">{typeInfo.label} · {completedCount}/{totalNodes} steps</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-24 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-500 font-mono">{overallProgress}%</span>
        </div>
      </div>

      {/* Nodes */}
      <div className="p-3 space-y-1.5">
        {graph.nodes.map((node, i) => {
          const statusCfg = STATUS_CONFIG[node.status];
          const isExpanded = expandedNodes.has(node.id);
          const hasDeps = node.dependencies.length > 0;
          const depsMet = node.dependencies.every((depId) => {
            const dep = nodeMap.get(depId);
            return dep?.status === "completed";
          });

          return (
            <div key={node.id}>
              {/* Connector line */}
              {i > 0 && (
                <div className="flex items-center py-0.5 pl-[18px]">
                  <div className="w-px h-2 bg-white/[0.06]" />
                </div>
              )}

              {/* Node card */}
              <button
                onClick={() => toggleNode(node.id)}
                className={`w-full text-left rounded-xl border transition-all duration-200 ${statusCfg.bg} ${statusCfg.border} ${
                  isExpanded ? "ring-1 " + statusCfg.ring : "hover:bg-white/[0.03]"
                }`}
              >
                <div className="flex items-start gap-2.5 px-3 py-2.5">
                  {/* Status icon */}
                  <div className={`w-6 h-6 rounded-lg ${statusCfg.bg} flex items-center justify-center flex-shrink-0 mt-0.5 border ${statusCfg.border}`}>
                    <span className={`text-[11px] font-bold ${statusCfg.color}`}>{statusCfg.icon}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h5 className="text-[12px] font-medium text-white truncate">{node.title}</h5>
                      <span className="text-[9px] text-gray-600 font-mono flex-shrink-0">#{i + 1}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{node.description}</p>

                    {/* Dependency badge */}
                    {hasDeps && (
                      <div className="flex items-center gap-1 mt-1">
                        {node.dependencies.map((depId) => {
                          const dep = nodeMap.get(depId);
                          const depComplete = dep?.status === "completed";
                          return (
                            <span
                              key={depId}
                              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-medium ${
                                depComplete
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-white/[0.04] text-gray-600 border border-white/[0.06]"
                              }`}
                            >
                              {depComplete ? "✓" : "🔒"} {dep?.title?.slice(0, 12) || depId}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Progress bar (if node has progress) */}
                    {node.progress !== undefined && node.progress > 0 && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-violet-500 rounded-full transition-all duration-300"
                            style={{ width: `${node.progress}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-gray-600 font-mono">{node.progress}%</span>
                      </div>
                    )}
                  </div>

                  {/* Expand arrow */}
                  <svg
                    className={`w-3.5 h-3.5 text-gray-600 flex-shrink-0 mt-1 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Expanded details */}
              {isExpanded && node.details && (
                <div className="ml-[30px] mr-3 mb-1.5 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-[11px] text-gray-400 leading-relaxed">{node.details}</p>
                  {!depsMet && hasDeps && (
                    <p className="text-[10px] text-amber-400/70 mt-1.5 flex items-center gap-1">
                      <span>🔒</span> আগের step গুলো শেষ করো এই step শুরু করার আগে
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer legend */}
      <div className="px-4 py-2 border-t border-white/[0.04] flex items-center gap-3 text-[9px] text-gray-600">
        <span className="flex items-center gap-1"><span className="text-emerald-400">✓</span> Done</span>
        <span className="flex items-center gap-1"><span className="text-violet-400">●</span> Running</span>
        <span className="flex items-center gap-1"><span className="text-gray-500">○</span> Pending</span>
        <span className="flex items-center gap-1"><span className="text-red-400">✕</span> Failed</span>
      </div>
    </div>
  );
}
