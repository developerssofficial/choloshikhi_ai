"use client";

import { useState, useRef, useEffect, useMemo, useCallback, type ReactNode } from "react";

/* ===================================================================
   TaskFlowChart — Interactive visual workflow (pure CSS layout)

   Renders a structured JSON task graph as a dependency-aware flowchart.
   Nodes are arranged in rows by dependency depth; parallel-group nodes
   sit side-by-side.  Connections use CSS pseudo-elements only — no SVG.
   =================================================================== */

// ── Types ──────────────────────────────────────────────────────────────

export interface TaskNode {
  id: string;
  title: string;
  purpose: string;
  what: string;
  why: string;
  status: "pending" | "running" | "completed" | "failed" | "waiting_for_user";
  dependencies: string[];
  parallelGroup?: string;
  sources: { title: string; url: string }[];
  output?: string;
  details?: string;
}

export interface TaskGraph {
  title: string;
  taskType: "research" | "coding" | "planning" | "study" | "content";
  researchSummary?: string;
  nodes: TaskNode[];
}

export type InstallState = "idle" | "installable" | "installed" | "unsupported";

// ── Constants ──────────────────────────────────────────────────────────

const TASK_TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  research: { label: "Research", icon: "🔍", color: "sky" },
  coding: { label: "Coding", icon: "💻", color: "violet" },
  planning: { label: "Planning", icon: "📋", color: "amber" },
  study: { label: "Study Plan", icon: "📚", color: "emerald" },
  content: { label: "Content", icon: "✍️", color: "rose" },
};

const STATUS_CONFIG: Record<string, {
  color: string;
  dot: string;
  borderLeft: string;
  ring: string;
  bg: string;
  border: string;
  label: string;
  shadow: string;
}> = {
  completed: {
    color: "text-emerald-400",
    dot: "bg-emerald-400",
    borderLeft: "border-l-emerald-500",
    ring: "ring-emerald-400/30",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/25",
    label: "Completed",
    shadow: "",
  },
  running: {
    color: "text-violet-400",
    dot: "bg-violet-400",
    borderLeft: "border-l-violet-500",
    ring: "ring-violet-400/30",
    bg: "bg-violet-500/10",
    border: "border-violet-500/25",
    label: "Running",
    shadow: "shadow-[0_0_20px_rgba(139,92,246,0.15)]",
  },
  pending: {
    color: "text-gray-500",
    dot: "bg-gray-500",
    borderLeft: "border-l-gray-600",
    ring: "",
    bg: "bg-white/[0.03]",
    border: "border-white/[0.06]",
    label: "Pending",
    shadow: "",
  },
  failed: {
    color: "text-red-400",
    dot: "bg-red-400",
    borderLeft: "border-l-red-500",
    ring: "ring-red-400/30",
    bg: "bg-red-500/10",
    border: "border-red-500/25",
    label: "Failed",
    shadow: "",
  },
  waiting_for_user: {
    color: "text-amber-400",
    dot: "bg-amber-400",
    borderLeft: "border-l-amber-500",
    ring: "ring-amber-400/30",
    bg: "bg-amber-500/10",
    border: "border-amber-500/25",
    label: "Waiting for you",
    shadow: "",
  },
};

// ── Layout helpers ──────────────────────────────────────────────────────

interface LayoutRow {
  nodes: string[];
  parallelGroup?: string;
}

/** Compute rows from nodes so dependencies always appear above dependants. */
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
    for (const [, gids] of groups) {
      rows.push({ nodes: gids, parallelGroup: "group" });
    }
    for (const id of ungrouped) {
      rows.push({ nodes: [id] });
    }
  }

  return rows;
}

/** Assign a global index (step number) to each node. */
function buildStepIndex(nodes: TaskNode[]): Map<string, number> {
  const map = new Map<string, number>();
  nodes.forEach((n, i) => map.set(n.id, i + 1));
  return map;
}

// ── Main Component ─────────────────────────────────────────────────────

export default function TaskFlowChart({ graph }: { graph: TaskGraph }) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const nodeMap = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph.nodes]);
  const rows = useMemo(() => computeRows(graph.nodes), [graph.nodes]);
  const stepIndex = useMemo(() => buildStepIndex(graph.nodes), [graph.nodes]);

  const toggleNode = useCallback((id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const typeInfo = TASK_TYPE_LABELS[graph.taskType] ?? TASK_TYPE_LABELS.planning;
  const completedCount = graph.nodes.filter((n) => n.status === "completed").length;
  const totalNodes = graph.nodes.length;
  const overallProgress = totalNodes > 0 ? Math.round((completedCount / totalNodes) * 100) : 0;

  // ── Render helpers ──────────────────────────────────────────────────

  const renderStatusDot = (status: string, size: "sm" | "md" = "md") => {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
    const sizeClass = size === "sm" ? "w-2 h-2" : "w-2.5 h-2.5";
    return (
      <span
        className={`${sizeClass} rounded-full ${cfg.dot} inline-block flex-shrink-0 ${
          status === "running" ? "animate-pulse" : ""
        }`}
      />
    );
  };

  const renderNodeCard = (nodeId: string, index: number) => {
    const node = nodeMap.get(nodeId);
    if (!node) return null;
    const cfg = STATUS_CONFIG[node.status] ?? STATUS_CONFIG.pending;
    const isExpanded = expandedNodes.has(node.id);
    const hasDeps = node.dependencies.length > 0;
    const depsMet = node.dependencies.every((depId) => nodeMap.get(depId)?.status === "completed");
    const isLocked = hasDeps && !depsMet;

    return (
      <div key={node.id} className="flex flex-col">
        <button
          onClick={() => toggleNode(node.id)}
          className={`group relative w-full text-left rounded-2xl border-l-[3px] border border-white/[0.06] transition-all duration-200 ${cfg.borderLeft} ${cfg.bg} ${
            isExpanded
              ? `shadow-lg shadow-black/20 ${cfg.ring ? "ring-1 " + cfg.ring : ""}`
              : "hover:bg-white/[0.04] hover:border-white/[0.10]"
          } ${cfg.shadow} ${isLocked ? "opacity-50" : ""}`}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            {/* Status dot */}
            <div className="flex-shrink-0">
              {renderStatusDot(node.status)}
            </div>

            <div className="flex-1 min-w-0">
              {/* Title + step number */}
              <div className="flex items-center gap-2">
                <h5 className="text-[13px] font-semibold text-white truncate">
                  {node.title}
                </h5>
                <span className="text-[9px] text-gray-600 font-mono flex-shrink-0 bg-white/[0.04] px-1.5 py-0.5 rounded-md">
                  #{stepIndex.get(node.id) ?? index + 1}
                </span>
              </div>

              {/* Dependencies badges */}
              {hasDeps && (
                <div className="flex flex-wrap items-center gap-1 mt-1.5">
                  {node.dependencies.map((depId) => {
                    const dep = nodeMap.get(depId);
                    const met = dep?.status === "completed";
                    return (
                      <span
                        key={depId}
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-medium border ${
                          met
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-white/[0.03] text-gray-600 border-white/[0.06]"
                        }`}
                      >
                        {met ? "✓" : "🔒"}{" "}
                        {dep?.title?.slice(0, 14) || depId}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Lock overlay for locked nodes */}
            {isLocked && (
              <div className="absolute inset-0 rounded-2xl flex items-center justify-center pointer-events-none">
                <span className="text-lg opacity-20">🔒</span>
              </div>
            )}

            {/* Expand chevron */}
            <svg
              className={`w-4 h-4 text-gray-600 flex-shrink-0 transition-transform duration-200 ${
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

        {/* Expanded details panel */}
        {isExpanded && (
          <div className="mt-1.5 mx-1 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
            <DetailRow label="Purpose" icon="🎯">{node.purpose}</DetailRow>
            <DetailRow label="What to do" icon="📌">{node.what}</DetailRow>
            <DetailRow label="Why" icon="💡">{node.why}</DetailRow>
            {node.output && <DetailRow label="Output" icon="📦">{node.output}</DetailRow>}
            {node.details && <DetailRow label="Details" icon="📝">{node.details}</DetailRow>}

            {/* Sources */}
            {node.sources.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-gray-500 mb-1 flex items-center gap-1">
                  <span>🔗</span> Sources
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {node.sources.map((src, si) => (
                    <a
                      key={si}
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-violet-400 hover:text-violet-300 underline underline-offset-2 decoration-violet-500/30 transition-colors"
                    >
                      {src.title || src.url}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Dependency warning */}
            {hasDeps && !depsMet && (
              <p className="text-[10px] text-amber-400/80 flex items-center gap-1.5 pt-1 border-t border-white/[0.04]">
                <span>⚠</span> Complete the required steps above before starting this one.
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  // ── Main render ─────────────────────────────────────────────────────

  return (
    <div className="mt-3 border border-white/[0.08] rounded-2xl overflow-hidden bg-[#12121a]">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-lg flex-shrink-0">{typeInfo.icon}</span>
            <div className="min-w-0">
              <h4 className="text-[14px] font-bold text-white leading-tight truncate">
                {graph.title}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wider bg-${typeInfo.color}-500/10 text-${typeInfo.color}-400 border border-${typeInfo.color}-500/20`}
                >
                  {typeInfo.label}
                </span>
                <span className="text-[10px] text-gray-500">
                  {completedCount}/{totalNodes} steps
                </span>
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-28 h-2 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <span className="text-[11px] text-gray-400 font-mono w-8 text-right">
              {overallProgress}%
            </span>
          </div>
        </div>
      </div>

      {/* ── Research Summary ────────────────────────────────────────── */}
      {graph.researchSummary && (
        <div className="px-5 py-3 border-b border-white/[0.04] bg-indigo-500/[0.03]">
          <div className="flex items-start gap-2.5">
            <span className="text-indigo-400 text-[12px] mt-0.5 flex-shrink-0">📊</span>
            <div>
              <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider mb-0.5">
                Research Summary
              </p>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                {graph.researchSummary}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Flow Area (pure CSS) ────────────────────────────────────── */}
      <div className="overflow-x-auto px-5 py-6">
        <div className="min-w-[480px]">
          {rows.map((row, ri) => (
            <div key={ri} className="relative">
              {/* ── Vertical connector between rows ────────────────── */}
              {ri > 0 && (
                <div className="flex justify-center relative h-6">
                  {/* Animated gradient line */}
                  <div className="w-0.5 h-full relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-violet-500/60 via-indigo-500/40 to-violet-500/60 animate-flow-gradient" />
                  </div>
                  {/* Small arrow indicator at bottom */}
                  <div className="absolute bottom-0 w-2 h-2 rotate-45 border-b border-r border-violet-500/40 -mb-1 bg-[#12121a]" />
                </div>
              )}

              {/* ── Row: parallel bracket + nodes ─────────────────── */}
              <div className="relative">
                {/* Parallel bracket bar (only for grouped rows with >1 node) */}
                {row.nodes.length > 1 && (
                  <div className="flex justify-center mb-2">
                    <div
                      className="h-0.5 rounded-full bg-gradient-to-r from-transparent via-violet-500/40 to-transparent"
                      style={{ width: `${Math.min(row.nodes.length * 50, 100)}%` }}
                    />
                  </div>
                )}

                {/* Node cards grid */}
                <div
                  className={`grid gap-3 ${
                    row.nodes.length === 1
                      ? "grid-cols-1 max-w-md mx-auto"
                      : row.nodes.length === 2
                        ? "grid-cols-2"
                        : row.nodes.length === 3
                          ? "grid-cols-3"
                          : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
                  }`}
                >
                  {row.nodes.map((nodeId, ni) => renderNodeCard(nodeId, ni))}
                </div>

                {/* Bottom bracket connector for grouped rows */}
                {row.nodes.length > 1 && (
                  <div className="flex justify-center mt-2">
                    <div
                      className="h-0.5 rounded-full bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent"
                      style={{ width: `${Math.min(row.nodes.length * 50, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer / Legend ─────────────────────────────────────────── */}
      <div className="px-5 py-2.5 border-t border-white/[0.04] flex flex-wrap items-center gap-x-4 gap-y-1">
        {(Object.entries(STATUS_CONFIG) as [string, (typeof STATUS_CONFIG)[string]][]).map(
          ([key, cfg]) => (
            <span key={key} className="flex items-center gap-1.5 text-[9px] text-gray-500">
              {renderStatusDot(key, "sm")}
              <span className={cfg.color}>{cfg.label}</span>
            </span>
          ),
        )}
      </div>

      {/* ── CSS Animations (injected once) ─────────────────────────── */}
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

// ── Detail row helper ───────────────────────────────────────────────────

function DetailRow({ label, icon, children }: { label: string; icon: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-medium text-gray-500 mb-0.5 flex items-center gap-1">
        <span>{icon}</span> {label}
      </p>
      <p className="text-[11px] text-gray-300 leading-relaxed">{children}</p>
    </div>
  );
}

// ── PWA Install Hook (re-exported for convenience) ─────────────────────

interface InstallableEvent extends Event {
  prompt(): void;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function usePWAInstall() {
  const [state, setState] = useState<InstallState>("idle");
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
