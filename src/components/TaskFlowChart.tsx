"use client";

import {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  type ReactNode,
} from "react";

/* ===================================================================
   TaskFlowChart — Interactive visual workflow component

   Renders a structured JSON task graph as a dependency-aware flowchart.
   Nodes are arranged in rows by dependency depth; parallel-group nodes
   sit side-by-side.  Animated SVG lines connect parent → child nodes.
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

export type InstallState =
  | "idle"
  | "installable"
  | "installed"
  | "unsupported";

// ── Constants ──────────────────────────────────────────────────────────

const TASK_TYPE_LABELS: Record<
  string,
  { label: string; icon: string; color: string }
> = {
  research: { label: "Research", icon: "🔍", color: "sky" },
  coding: { label: "Coding", icon: "💻", color: "violet" },
  planning: { label: "Planning", icon: "📋", color: "amber" },
  study: { label: "Study Plan", icon: "📚", color: "emerald" },
  content: { label: "Content", icon: "✍️", color: "rose" },
};

const STATUS_CONFIG: Record<
  string,
  {
    color: string;
    dot: string;
    ring: string;
    bg: string;
    border: string;
    label: string;
  }
> = {
  completed: {
    color: "text-emerald-400",
    dot: "bg-emerald-400",
    ring: "ring-emerald-400/30",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/25",
    label: "Completed",
  },
  running: {
    color: "text-violet-400",
    dot: "bg-violet-400",
    ring: "ring-violet-400/30",
    bg: "bg-violet-500/10",
    border: "border-violet-500/25",
    label: "Running",
  },
  pending: {
    color: "text-gray-500",
    dot: "bg-gray-500",
    ring: "",
    bg: "bg-white/[0.03]",
    border: "border-white/[0.06]",
    label: "Pending",
  },
  failed: {
    color: "text-red-400",
    dot: "bg-red-400",
    ring: "ring-red-400/30",
    bg: "bg-red-500/10",
    border: "border-red-500/25",
    label: "Failed",
  },
  waiting_for_user: {
    color: "text-amber-400",
    dot: "bg-amber-400",
    ring: "ring-amber-400/30",
    bg: "bg-amber-500/10",
    border: "border-amber-500/25",
    label: "Waiting for you",
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

    // Split into parallel groups and ungrouped
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

    // Emit grouped rows first, then ungrouped as individual rows
    for (const [group, gids] of groups) {
      rows.push({ nodes: gids, parallelGroup: group });
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
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const nodeMap = useMemo(
    () => new Map(graph.nodes.map((n) => [n.id, n])),
    [graph.nodes],
  );
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

  const completedCount = graph.nodes.filter(
    (n) => n.status === "completed",
  ).length;
  const totalNodes = graph.nodes.length;
  const overallProgress =
    totalNodes > 0 ? Math.round((completedCount / totalNodes) * 100) : 0;

  // ── SVG connections ─────────────────────────────────────────────────
  // We compute connection paths once per render and draw them inside an
  // SVG overlay that sits above the flow area.  The SVG is absolutely
  // positioned so it doesn't affect the card layout.

  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 });
  const [connections, setConnections] = useState<
    { x1: number; y1: number; x2: number; y2: number }[]
  >([]);

  const recalcConnections = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();

    const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];

    for (const node of graph.nodes) {
      const childEl = cardRefs.current.get(node.id);
      if (!childEl) continue;
      const childRect = childEl.getBoundingClientRect();
      const childCx =
        childRect.left + childRect.width / 2 - containerRect.left;
      const childTop = childRect.top - containerRect.top;

      for (const depId of node.dependencies) {
        const parentEl = cardRefs.current.get(depId);
        if (!parentEl) continue;
        const parentRect = parentEl.getBoundingClientRect();
        const parentCx =
          parentRect.left + parentRect.width / 2 - containerRect.left;
        const parentBottom =
          parentRect.bottom - containerRect.top;

        lines.push({
          x1: parentCx,
          y1: parentBottom,
          x2: childCx,
          y2: childTop,
        });
      }
    }

    setSvgSize({ w: container.offsetWidth, h: container.offsetHeight });
    setConnections(lines);
  }, [graph.nodes]);

  // Recalculate on mount, expand/collapse, and window resize
  useEffect(() => {
    // Small delay so expanded content is measured after layout
    const timer = setTimeout(recalcConnections, 60);
    return () => clearTimeout(timer);
  }, [expandedNodes, recalcConnections]);

  useEffect(() => {
    const onResize = () => recalcConnections();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [recalcConnections]);

  // ── Render helpers ──────────────────────────────────────────────────

  const renderStatusDot = (status: string, size: "sm" | "md" = "md") => {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
    const sizeClass = size === "sm" ? "w-2 h-2" : "w-2.5 h-2.5";
    return (
      <span
        className={`${sizeClass} rounded-full ${cfg.dot} inline-block ${
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
    const depsMet = node.dependencies.every(
      (depId) => nodeMap.get(depId)?.status === "completed",
    );

    return (
      <div
        key={node.id}
        ref={(el) => {
          if (el) cardRefs.current.set(node.id, el);
        }}
        className="flex flex-col"
      >
        <button
          onClick={() => toggleNode(node.id)}
          className={`group relative w-full text-left rounded-2xl border transition-all duration-200 ${cfg.bg} ${cfg.border} ${
            isExpanded
              ? `shadow-lg shadow-black/20 ${cfg.ring ? "ring-1 " + cfg.ring : ""}`
              : "hover:bg-white/[0.04] hover:border-white/[0.10]"
          }`}
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

            {/* Expand chevron */}
            <svg
              className={`w-4 h-4 text-gray-600 flex-shrink-0 transition-transform duration-200 ${
                isExpanded ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </button>

        {/* Expanded details panel */}
        {isExpanded && (
          <div className="mt-1.5 mx-1 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
            {/* Purpose */}
            <DetailRow label="Purpose" icon="🎯">
              {node.purpose}
            </DetailRow>

            {/* What to do */}
            <DetailRow label="What to do" icon="📌">
              {node.what}
            </DetailRow>

            {/* Why */}
            <DetailRow label="Why" icon="💡">
              {node.why}
            </DetailRow>

            {/* Output */}
            {node.output && (
              <DetailRow label="Output" icon="📦">
                {node.output}
              </DetailRow>
            )}

            {/* Details */}
            {node.details && (
              <DetailRow label="Details" icon="📝">
                {node.details}
              </DetailRow>
            )}

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

            {/* Dependency status warning */}
            {hasDeps && !depsMet && (
              <p className="text-[10px] text-amber-400/80 flex items-center gap-1.5 pt-1 border-t border-white/[0.04]">
                <span>⚠</span> Complete the required steps above before
                starting this one.
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
            <span className="text-indigo-400 text-[12px] mt-0.5 flex-shrink-0">
              📊
            </span>
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

      {/* ── Flow Area ───────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="relative overflow-x-auto px-5 py-4"
      >
        <div className="min-w-[520px] space-y-0">
          {rows.map((row, ri) => (
            <div key={ri}>
              {/* Row connector (vertical) */}
              {ri > 0 && (
                <div className="flex justify-center py-0">
                  <div className="w-px h-4 bg-white/[0.08]" />
                </div>
              )}

              {/* Nodes in this row */}
              <div
                className={`grid gap-3 ${
                  row.nodes.length > 1
                    ? `grid-cols-${Math.min(row.nodes.length, 4)}`
                    : "grid-cols-1 max-w-md mx-auto"
                }`}
              >
                {row.nodes.map((nodeId, ni) => renderNodeCard(nodeId, ni))}
              </div>
            </div>
          ))}
        </div>

        {/* SVG overlay for connection lines */}
        {svgSize.w > 0 && svgSize.h > 0 && (
          <svg
            width={svgSize.w}
            height={svgSize.h}
            className="absolute top-0 left-0 pointer-events-none"
            style={{ overflow: "visible" }}
          >
            <style>{`
              @keyframes flowDash {
                to { stroke-dashoffset: -20; }
              }
              .flow-line {
                stroke-dasharray: 6 4;
                animation: flowDash 1s linear infinite;
              }
            `}</style>
            <defs>
              <linearGradient id="flowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.3" />
              </linearGradient>
            </defs>
            {connections.map((c, ci) => {
              const midY = (c.y1 + c.y2) / 2;
              return (
                <path
                  key={ci}
                  d={`M ${c.x1} ${c.y1} C ${c.x1} ${midY}, ${c.x2} ${midY}, ${c.x2} ${c.y2}`}
                  fill="none"
                  stroke="url(#flowGrad)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className="flow-line"
                />
              );
            })}
          </svg>
        )}
      </div>

      {/* ── Footer / Legend ─────────────────────────────────────────── */}
      <div className="px-5 py-2.5 border-t border-white/[0.04] flex flex-wrap items-center gap-x-4 gap-y-1">
        {(
          Object.entries(STATUS_CONFIG) as [
            string,
            (typeof STATUS_CONFIG)[string],
          ][]
        ).map(([key, cfg]) => (
          <span
            key={key}
            className="flex items-center gap-1.5 text-[9px] text-gray-500"
          >
            {renderStatusDot(key, "sm")}
            <span className={cfg.color}>{cfg.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Detail row helper ───────────────────────────────────────────────────

function DetailRow({
  label,
  icon,
  children,
}: {
  label: string;
  icon: string;
  children: ReactNode;
}) {
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
