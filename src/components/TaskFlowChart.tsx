"use client";

import { useState, useMemo, useCallback, type ReactNode } from "react";
import {
  type TaskGraph,
  type TaskNode,
  type TaskNodeStatus,
  type TaskType,
  TASK_TYPE_CONFIG,
  STATUS_CONFIG,
} from "@/lib/taskTypes";

/* ===================================================================
   TaskFlowChart — Professional AI Task Graph Renderer
   
   Renders a structured TaskGraph as an interactive flowchart with:
   - SVG connectors between rows
   - Parallel branch visualization
   - Status states (pending, running, completed, failed, waiting, skipped)
   - Expandable node details with sources, recommendations, tips
   - Mobile responsive layout
   - Smooth animations
   - Dark CholoShikhi UI theme
   =================================================================== */

// ── Re-export types for backward compatibility ──────────────────────
export type { TaskGraph, TaskNode } from "@/lib/taskTypes";

// ── Layout Types ────────────────────────────────────────────────────
interface LayoutRow {
  nodeIds: string[];
  parallelGroup?: string;
}

// ── Layout Engine ───────────────────────────────────────────────────
function computeRows(nodes: TaskNode[]): LayoutRow[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const depthMap = new Map<string, number>();

  const getDepth = (id: string, visited = new Set<string>()): number => {
    if (depthMap.has(id)) return depthMap.get(id)!;
    if (visited.has(id)) return 0;
    visited.add(id);
    const node = nodeMap.get(id);
    if (!node || node.dependencies.length === 0) {
      depthMap.set(id, 0);
      return 0;
    }
    let maxDep = 0;
    for (const depId of node.dependencies) {
      maxDep = Math.max(maxDep, getDepth(depId, visited) + 1);
    }
    depthMap.set(id, maxDep);
    return maxDep;
  };

  for (const n of nodes) getDepth(n.id);

  // Group by depth
  const depthGroups = new Map<number, string[]>();
  for (const n of nodes) {
    const d = depthMap.get(n.id) ?? 0;
    if (!depthGroups.has(d)) depthGroups.set(d, []);
    depthGroups.get(d)!.push(n.id);
  }

  const rows: LayoutRow[] = [];
  const sortedDepths = Array.from(depthGroups.keys()).sort((a, b) => a - b);

  for (const depth of sortedDepths) {
    const idsAtDepth = depthGroups.get(depth)!;
    const groups = new Map<string, string[]>();
    const ungrouped: string[] = [];

    for (const id of idsAtDepth) {
      const pg = nodeMap.get(id)?.parallelGroup;
      if (pg) {
        if (!groups.has(pg)) groups.set(pg, []);
        groups.get(pg)!.push(id);
      } else {
        ungrouped.push(id);
      }
    }

    for (const [groupName, gids] of groups) {
      rows.push({ nodeIds: gids, parallelGroup: groupName });
    }
    for (const id of ungrouped) {
      rows.push({ nodeIds: [id] });
    }
  }

  return rows;
}

// ── Status Icon ─────────────────────────────────────────────────────
function StatusIcon({ status, size = "md" }: { status: TaskNodeStatus; size?: "sm" | "md" }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const sizeClass = size === "sm" ? "w-2 h-2" : "w-2.5 h-2.5";

  if (status === "completed") {
    return (
      <span className={`${sizeClass} rounded-full bg-emerald-400 inline-flex items-center justify-center flex-shrink-0`}>
        <svg className={`${size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2"} text-[#0f0f14]`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }

  if (status === "running") {
    return (
      <span className={`${sizeClass} rounded-full bg-violet-400 inline-block flex-shrink-0 relative`}>
        <span className="absolute inset-0 rounded-full bg-violet-400 animate-ping opacity-40" />
      </span>
    );
  }

  if (status === "failed") {
    return (
      <span className={`${sizeClass} rounded-full bg-red-400 inline-flex items-center justify-center flex-shrink-0`}>
        <svg className={`${size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2"} text-[#0f0f14]`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </span>
    );
  }

  if (status === "waiting_for_user") {
    return (
      <span className={`${sizeClass} rounded-full bg-amber-400 inline-block flex-shrink-0 animate-pulse`} />
    );
  }

  // pending / skipped
  return <span className={`${sizeClass} rounded-full ${cfg.dotColor} inline-block flex-shrink-0 opacity-40`} />;
}

// ── Connector SVG between rows ──────────────────────────────────────
function RowConnector({ isParallel }: { isParallel: boolean }) {
  return (
    <div className="flex justify-center relative" style={{ height: isParallel ? 32 : 28 }}>
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="connGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(139,92,246)" stopOpacity="0.5" />
            <stop offset="50%" stopColor="rgb(99,102,241)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="rgb(139,92,246)" stopOpacity="0.5" />
          </linearGradient>
        </defs>
        <line x1="50%" y1="0" x2="50%" y2="100%" stroke="url(#connGrad)" strokeWidth="1.5" strokeDasharray={isParallel ? "4 3" : "none"} />
        {/* Arrow */}
        <polygon points="50%,100% 47%,90% 53%,90%" fill="rgb(139,92,246)" opacity="0.5" />
      </svg>
    </div>
  );
}

// ── Parallel Branch Connector (fork/join) ───────────────────────────
function ParallelConnector({ count, isJoin }: { count: number; isJoin: boolean }) {
  // Draw horizontal fork/join lines
  return (
    <div className="flex justify-center relative" style={{ height: 32 }}>
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="paraGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgb(139,92,246)" stopOpacity="0.1" />
            <stop offset="50%" stopColor="rgb(139,92,246)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="rgb(139,92,246)" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        {/* Horizontal bar */}
        <line x1="15%" y1={isJoin ? 4 : "100%"} x2="85%" y2={isJoin ? 4 : "100%"} stroke="url(#paraGrad)" strokeWidth="1" />
        {/* Vertical stubs */}
        {Array.from({ length: count }).map((_, i) => {
          const x = `${15 + (70 * (i + 0.5)) / count}%`;
          return (
            <line
              key={i}
              x1={x}
              y1={isJoin ? 4 : "100%"}
              x2={x}
              y2={isJoin ? "100%" : 4}
              stroke="rgb(139,92,246)"
              strokeWidth="1"
              strokeDasharray="3 2"
              opacity="0.3"
            />
          );
        })}
      </svg>
      {/* Parallel label */}
      <div className={`absolute ${isJoin ? "bottom-0" : "top-0"} left-1/2 -translate-x-1/2 px-2 py-0.5 bg-[#12121a] border border-violet-500/20 rounded-full`}>
        <span className="text-[8px] text-violet-400/60 font-medium uppercase tracking-wider">
          {isJoin ? "merge" : "parallel"}
        </span>
      </div>
    </div>
  );
}

// ── Node Card ───────────────────────────────────────────────────────
function NodeCard({
  node,
  index,
  nodeMap,
  stepIndex,
  isExpanded,
  onToggle,
}: {
  node: TaskNode;
  index: number;
  nodeMap: Map<string, TaskNode>;
  stepIndex: Map<string, number>;
  isExpanded: boolean;
  onToggle: (id: string) => void;
}) {
  const cfg = STATUS_CONFIG[node.status] ?? STATUS_CONFIG.pending;
  const hasDeps = node.dependencies.length > 0;
  const depsMet = node.dependencies.every((depId) => nodeMap.get(depId)?.status === "completed");
  const isLocked = hasDeps && !depsMet && node.status === "pending";
  const hasRecommendation = !!node.recommendation;

  return (
    <div className="flex flex-col w-full">
      {/* ── Card Header (clickable) ─────────────────────────── */}
      <button
        onClick={() => onToggle(node.id)}
        className={`group relative w-full text-left rounded-2xl border-l-[3px] border border-white/[0.06] transition-all duration-200 ${cfg.borderColor.replace("border-", "border-l-")} ${cfg.bgColor} ${
          isExpanded
            ? `shadow-lg shadow-black/20 ${node.status === "running" ? STATUS_CONFIG.running.shadow || "" : ""}`
            : "hover:bg-white/[0.04] hover:border-white/[0.10]"
        } ${isLocked ? "opacity-50" : ""}`}
      >
        <div className="flex items-center gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
          {/* Status indicator */}
          <div className="flex-shrink-0">
            <StatusIcon status={node.status} />
          </div>

          <div className="flex-1 min-w-0">
            {/* Title + step number */}
            <div className="flex items-center gap-2">
              <h5 className="text-[12px] sm:text-[13px] font-semibold text-white truncate">
                {node.title}
              </h5>
              <span className="text-[8px] sm:text-[9px] text-gray-600 font-mono flex-shrink-0 bg-white/[0.04] px-1.5 py-0.5 rounded-md">
                #{stepIndex.get(node.id) ?? index + 1}
              </span>
              {hasRecommendation && (
                <span className="text-[8px] text-amber-400/70 flex-shrink-0 bg-amber-500/10 px-1.5 py-0.5 rounded-md border border-amber-500/15">
                  tip
                </span>
              )}
            </div>

            {/* Description (one line) */}
            {node.description && (
              <p className="text-[10px] sm:text-[11px] text-gray-500 mt-0.5 truncate">
                {node.description}
              </p>
            )}

            {/* Dependencies badges */}
            {hasDeps && (
              <div className="flex flex-wrap items-center gap-1 mt-1.5">
                {node.dependencies.map((depId) => {
                  const dep = nodeMap.get(depId);
                  const met = dep?.status === "completed";
                  return (
                    <span
                      key={depId}
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[7px] sm:text-[8px] font-medium border ${
                        met
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-white/[0.03] text-gray-600 border-white/[0.06]"
                      }`}
                    >
                      {met ? "\u2713" : "\uD83D\uDD12"} {dep?.title?.slice(0, 12) || depId}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Duration badge */}
          {node.estimatedDuration && !isExpanded && (
            <span className="text-[8px] text-gray-600 flex-shrink-0 hidden sm:inline">
              {node.estimatedDuration}
            </span>
          )}

          {/* Expand chevron */}
          <svg
            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600 flex-shrink-0 transition-transform duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* ── Expanded Details Panel ───────────────────────────── */}
      {isExpanded && (
        <div className="mt-1.5 mx-1 px-3 py-3 sm:px-4 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
          {/* Purpose */}
          {node.purpose && (
            <DetailRow label="Why this step" icon="\uD83C\uDFAF">
              {node.purpose}
            </DetailRow>
          )}

          {/* How to do it */}
          {node.howTo && (
            <DetailRow label="How to do it" icon="\uD83D\uDCCB">
              {node.howTo}
            </DetailRow>
          )}

          {/* Expected output */}
          {node.expectedOutput && (
            <DetailRow label="Expected result" icon="\uD83D\uDCE6">
              {node.expectedOutput}
            </DetailRow>
          )}

          {/* Recommendation */}
          {hasRecommendation && (
            <div className="rounded-lg bg-amber-500/[0.06] border border-amber-500/15 p-2.5">
              <p className="text-[9px] sm:text-[10px] font-medium text-amber-400 mb-1 flex items-center gap-1">
                <span>\u26A0</span> Recommendation
              </p>
              <p className="text-[10px] sm:text-[11px] text-amber-200/80 leading-relaxed">
                {node.recommendation}
              </p>
            </div>
          )}

          {/* Duration */}
          {node.estimatedDuration && (
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] sm:text-[10px] text-gray-500">\u23F1</span>
              <span className="text-[10px] sm:text-[11px] text-gray-400">{node.estimatedDuration}</span>
            </div>
          )}

          {/* Tips */}
          {node.tips && node.tips.length > 0 && (
            <div>
              <p className="text-[9px] sm:text-[10px] font-medium text-gray-500 mb-1 flex items-center gap-1">
                <span>\uD83D\uDCA1</span> Tips
              </p>
              <ul className="space-y-1">
                {node.tips.map((tip, ti) => (
                  <li key={ti} className="text-[10px] sm:text-[11px] text-gray-400 leading-relaxed flex items-start gap-1.5">
                    <span className="text-violet-400/50 mt-px flex-shrink-0">\u2022</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Sources */}
          {node.sources && node.sources.length > 0 && (
            <div>
              <p className="text-[9px] sm:text-[10px] font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                <span>\uD83D\uDD17</span> Sources ({node.sources.length})
              </p>
              <div className="space-y-1">
                {node.sources.map((src, si) => (
                  <a
                    key={si}
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 text-[10px] sm:text-[11px] text-gray-500 hover:text-violet-300 py-1 rounded transition-colors group/src"
                  >
                    <span className="text-violet-400/50 font-mono mt-px flex-shrink-0">[{si + 1}]</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate group-hover/src:text-violet-300">{src.title || new URL(src.url).hostname}</p>
                      {src.snippet && (
                        <p className="text-[9px] text-gray-600 truncate mt-0.5">{src.snippet}</p>
                      )}
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[8px] text-gray-600">{getDomain(src.url)}</span>
                        {src.type && (
                          <span className={`text-[7px] px-1 py-0.5 rounded ${getSourceTypeStyle(src.type)}`}>
                            {src.type}
                          </span>
                        )}
                        {src.reliability && (
                          <span className={`text-[7px] px-1 py-0.5 rounded ${getReliabilityStyle(src.reliability)}`}>
                            {src.reliability}
                          </span>
                        )}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Dependency warning */}
          {hasDeps && !depsMet && (
            <p className="text-[10px] text-amber-400/80 flex items-center gap-1.5 pt-1 border-t border-white/[0.04]">
              <span>\u26A0</span> Complete the required steps above before starting this one.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Helper: Get domain from URL ─────────────────────────────────────
function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

// ── Helper: Source type badge style ──────────────────────────────────
function getSourceTypeStyle(type: string): string {
  switch (type) {
    case "official": return "bg-blue-500/10 text-blue-400 border border-blue-500/15";
    case "academic": return "bg-purple-500/10 text-purple-400 border border-purple-500/15";
    case "government": return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15";
    case "news": return "bg-cyan-500/10 text-cyan-400 border border-cyan-500/15";
    case "blog": return "bg-gray-500/10 text-gray-400 border border-gray-500/15";
    default: return "bg-white/[0.04] text-gray-500 border border-white/[0.06]";
  }
}

// ── Helper: Reliability badge style ─────────────────────────────────
function getReliabilityStyle(rel: string): string {
  switch (rel) {
    case "high": return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15";
    case "medium": return "bg-amber-500/10 text-amber-400 border border-amber-500/15";
    case "low": return "bg-red-500/10 text-red-400 border border-red-500/15";
    default: return "bg-white/[0.04] text-gray-500 border border-white/[0.06]";
  }
}

// ── Detail Row ──────────────────────────────────────────────────────
function DetailRow({ label, icon, children }: { label: string; icon: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[9px] sm:text-[10px] font-medium text-gray-500 mb-0.5 flex items-center gap-1">
        <span>{icon}</span> {label}
      </p>
      <p className="text-[11px] sm:text-[12px] text-gray-300 leading-relaxed">{children}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ── MAIN COMPONENT ───────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

export default function TaskFlowChart({
  graph,
  stepStatusOverrides,
  stepOutputs,
}: {
  graph: TaskGraph;
  stepStatusOverrides?: Map<string, TaskNodeStatus>;
  stepOutputs?: Map<string, string>;
}) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const nodeMap = useMemo(() => {
    const map = new Map(graph.nodes.map((n) => [n.id, n]));
    // Apply execution status overrides
    if (stepStatusOverrides && stepStatusOverrides.size > 0) {
      for (const [id, overrideStatus] of stepStatusOverrides) {
        const node = map.get(id);
        if (node) {
          map.set(id, { ...node, status: overrideStatus });
        }
      }
    }
    return map;
  }, [graph.nodes, stepStatusOverrides]);
  const rows = useMemo(() => computeRows(graph.nodes), [graph.nodes]);
  const stepIndex = useMemo(() => {
    const map = new Map<string, number>();
    graph.nodes.forEach((n, i) => map.set(n.id, i + 1));
    return map;
  }, [graph.nodes]);

  const toggleNode = useCallback((id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const typeInfo = TASK_TYPE_CONFIG[graph.taskType] ?? TASK_TYPE_CONFIG.planning;
  const completedCount = graph.nodes.filter((n) => n.status === "completed").length;
  const runningCount = graph.nodes.filter((n) => n.status === "running").length;
  const failedCount = graph.nodes.filter((n) => n.status === "failed").length;
  const totalNodes = graph.nodes.length;
  const overallProgress = totalNodes > 0 ? Math.round((completedCount / totalNodes) * 100) : 0;

  // Detect if next row should be parallel connector
  const hasNextParallelRow = rows.some((r) => r.nodeIds.length > 1);

  return (
    <div className="mt-3 border border-white/[0.08] rounded-2xl overflow-hidden bg-[#12121a]">
      {/* ═══ Header ═══════════════════════════════════════════ */}
      <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-white/[0.06]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <span className="text-base sm:text-lg flex-shrink-0">{typeInfo.icon}</span>
            <div className="min-w-0">
              <h4 className="text-[13px] sm:text-[14px] font-bold text-white leading-tight truncate">
                {graph.title}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[8px] sm:text-[9px] font-semibold uppercase tracking-wider bg-${typeInfo.color}-500/10 text-${typeInfo.color}-400 border border-${typeInfo.color}-500/20`}
                >
                  {typeInfo.label}
                </span>
                <span className="text-[9px] sm:text-[10px] text-gray-500">
                  {completedCount}/{totalNodes}
                </span>
                {runningCount > 0 && (
                  <span className="text-[9px] sm:text-[10px] text-violet-400">
                    {runningCount} active
                  </span>
                )}
                {failedCount > 0 && (
                  <span className="text-[9px] sm:text-[10px] text-red-400">
                    {failedCount} failed
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-20 sm:w-28 h-2 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <span className="text-[10px] sm:text-[11px] text-gray-400 font-mono w-8 text-right">
              {overallProgress}%
            </span>
          </div>
        </div>
      </div>

      {/* ═══ Goal ═════════════════════════════════════════════ */}
      {graph.goal && (
        <div className="px-4 sm:px-5 py-2.5 border-b border-white/[0.04] bg-white/[0.01]">
          <p className="text-[10px] sm:text-[11px] text-gray-400 leading-relaxed">
            <span className="text-gray-500 font-medium">Goal: </span>
            {graph.goal}
          </p>
        </div>
      )}

      {/* ═══ User Context ═════════════════════════════════════ */}
      {graph.userContext && (
        <div className="px-4 sm:px-5 py-2 border-b border-white/[0.04]">
          <div className="flex flex-wrap gap-2">
            {graph.userContext.budget && (
              <ContextBadge label="Budget" value={graph.userContext.budget} />
            )}
            {graph.userContext.location && (
              <ContextBadge label="Location" value={graph.userContext.location} />
            )}
            {graph.userContext.deadline && (
              <ContextBadge label="Deadline" value={graph.userContext.deadline} />
            )}
            {graph.userContext.skillLevel && (
              <ContextBadge label="Level" value={graph.userContext.skillLevel} />
            )}
            {graph.userContext.targetAudience && (
              <ContextBadge label="Audience" value={graph.userContext.targetAudience} />
            )}
          </div>
        </div>
      )}

      {/* ═══ Research Summary ══════════════════════════════════ */}
      {graph.researchSummary && (
        <div className="px-4 sm:px-5 py-3 border-b border-white/[0.04] bg-indigo-500/[0.03]">
          <div className="flex items-start gap-2.5">
            <span className="text-indigo-400 text-[11px] sm:text-[12px] mt-0.5 flex-shrink-0">{"\uD83D\uDCCA"}</span>
            <div>
              <p className="text-[9px] sm:text-[10px] font-semibold text-indigo-400 uppercase tracking-wider mb-0.5">
                Research Findings
              </p>
              <p className="text-[10px] sm:text-[11px] text-gray-400 leading-relaxed">
                {graph.researchSummary}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Flow Area ═════════════════════════════════════════ */}
      <div className="px-3 py-4 sm:px-5 sm:py-6 overflow-x-auto">
        <div className="min-w-[320px] sm:min-w-[480px]">
          {rows.map((row, ri) => {
            const isParallelRow = row.nodeIds.length > 1;
            const prevRow = ri > 0 ? rows[ri - 1] : null;
            const nextRow = ri < rows.length - 1 ? rows[ri + 1] : null;
            const prevWasParallel = prevRow && prevRow.nodeIds.length > 1;
            const nextIsParallel = nextRow && nextRow.nodeIds.length > 1;

            return (
              <div key={ri}>
                {/* ── Connector to this row ──────────────────── */}
                {ri > 0 && (
                  isParallelRow || prevWasParallel ? (
                    <ParallelConnector count={isParallelRow ? row.nodeIds.length : prevRow?.nodeIds.length || 2} isJoin={isParallelRow} />
                  ) : (
                    <RowConnector isParallel={false} />
                  )
                )}

                {/* ── Node Row ───────────────────────────────── */}
                <div className="relative">
                  {/* Parallel bracket indicator */}
                  {isParallelRow && (
                    <div className="flex justify-center mb-1.5">
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/[0.06] border border-violet-500/15">
                        <span className="text-[7px] sm:text-[8px] text-violet-400/60 font-medium uppercase tracking-wider">
                          parallel steps
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Node cards grid */}
                  <div
                    className={`grid gap-2 sm:gap-3 ${
                      row.nodeIds.length === 1
                        ? "grid-cols-1 max-w-md mx-auto"
                        : row.nodeIds.length === 2
                          ? "grid-cols-1 sm:grid-cols-2"
                          : row.nodeIds.length === 3
                            ? "grid-cols-1 sm:grid-cols-3"
                            : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                    }`}
                  >
                    {row.nodeIds.map((nodeId, ni) => {
                      const node = nodeMap.get(nodeId);
                      if (!node) return null;
                      return (
                        <NodeCard
                          key={nodeId}
                          node={node}
                          index={ni}
                          nodeMap={nodeMap}
                          stepIndex={stepIndex}
                          isExpanded={expandedNodes.has(nodeId)}
                          onToggle={toggleNode}
                        />
                      );
                    })}
                  </div>

                  {/* Parallel bracket bottom */}
                  {isParallelRow && nextIsParallel && (
                    <div className="flex justify-center mt-1.5">
                      <div className="h-0.5 rounded-full bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" style={{ width: "60%" }} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ Footer / Legend ═══════════════════════════════════ */}
      <div className="px-4 sm:px-5 py-2.5 border-t border-white/[0.04] flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1">
        {(["completed", "running", "pending", "failed", "waiting_for_user"] as const).map((status) => {
          const cfg = STATUS_CONFIG[status];
          return (
            <span key={status} className="flex items-center gap-1.5 text-[8px] sm:text-[9px] text-gray-500">
              <StatusIcon status={status} size="sm" />
              <span className={cfg.color}>{cfg.label}</span>
            </span>
          );
        })}
      </div>

      {/* ═══ Injected CSS Animations ══════════════════════════ */}
      <style>{`
        @keyframes flow-gradient {
          0%, 100% { opacity: 0.4; transform: translateY(0); }
          50% { opacity: 0.8; transform: translateY(2px); }
        }
        .animate-flow-gradient {
          animation: flow-gradient 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// ── Context Badge ───────────────────────────────────────────────────
function ContextBadge({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[8px] sm:text-[9px] bg-white/[0.04] text-gray-500 border border-white/[0.06]">
      <span className="text-gray-600">{label}:</span>
      <span className="text-gray-400">{value}</span>
    </span>
  );
}

// ── PWA Install Hook (re-exported for backward compatibility) ───────
export type InstallState = "idle" | "installable" | "installed" | "unsupported";

interface InstallableEvent extends Event {
  prompt(): void;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

import { useState as useStateHook, useEffect, useRef } from "react";

export function usePWAInstall() {
  const [state, setState] = useStateHook<InstallState>("idle");
  const deferredRef = useRef<InstallableEvent | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      setState("unsupported");
      return;
    }

    const handler = (event: Event) => {
      event.preventDefault();
      deferredRef.current = event as InstallableEvent;
      setState((prev) => (prev === "installed" ? "installed" : "installable"));
    };

    const installedHandler = () => setState("installed");
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);

    if ("getInstalledRelatedApps" in navigator) {
      (navigator as any)
        .getInstalledRelatedApps()
        .then((apps: any[]) => {
          if (apps.length) setState("installed");
        })
        .catch(() => {});
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredRef.current) return false;
    deferredRef.current.prompt();
    const { outcome } = await deferredRef.current.userChoice;
    if (outcome === "accepted") setState("installed");
    deferredRef.current = null;
    return outcome === "accepted";
  };

  return { state, promptInstall };
}
