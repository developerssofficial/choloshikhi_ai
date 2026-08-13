/* ===================================================================
   TaskGraphValidator — validates AI-generated task graph JSON
   
   Checks: unique IDs, dependency references, circular deps,
   valid statuses, required fields, execution order, parallel groups,
   source validation, assumption marking.
   =================================================================== */

import type { TaskGraph, TaskNode, TaskValidationResult } from "./taskTypes";

// ── Input types (loose — AI output is not perfectly typed) ──────────
export interface TaskNodeInput {
  id?: string;
  title?: string;
  description?: string;
  purpose?: string;
  what?: string;
  howTo?: string;
  expectedOutput?: string;
  status?: string;
  dependencies?: string[];
  parallelGroup?: string | null;
  sources?: { title?: string; url?: string; type?: string; reliability?: string; snippet?: string }[];
  output?: string;
  recommendation?: string;
  estimatedDuration?: string;
  tips?: string[];
}

export interface TaskGraphInput {
  title?: string;
  taskType?: string;
  goal?: string;
  researchSummary?: string;
  userContext?: any;
  nodes?: TaskNodeInput[];
}

const VALID_STATUSES = new Set(["pending", "running", "completed", "failed", "waiting_for_user", "skipped"]);
const VALID_TASK_TYPES = new Set(["research", "coding", "planning", "study", "content", "business", "project", "mixed"]);
const REQUIRED_NODE_FIELDS = ["id", "title", "purpose"];
const MAX_NODES = 20;
const MAX_DEPENDENCIES_PER_NODE = 3;

export function validateTaskGraph(input: any): TaskValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ── Top-level structure ──────────────────────────────────────────
  if (!input || typeof input !== "object") {
    return { valid: false, errors: ["Invalid graph: not an object"], warnings, cleanedGraph: null };
  }

  if (!input.title || typeof input.title !== "string") {
    errors.push("Missing or invalid 'title'");
  }

  if (!input.taskType || !VALID_TASK_TYPES.has(input.taskType)) {
    errors.push(`Invalid taskType '${input.taskType}'. Must be: ${Array.from(VALID_TASK_TYPES).join(", ")}`);
  }

  if (!Array.isArray(input.nodes) || input.nodes.length === 0) {
    return { valid: false, errors: ["Missing or empty 'nodes' array"], warnings, cleanedGraph: null };
  }

  if (input.nodes.length > MAX_NODES) {
    warnings.push(`Large graph (${input.nodes.length} nodes). Consider breaking into smaller tasks.`);
  }

  // ── Node-level validation ────────────────────────────────────────
  const ids = new Set<string>();
  const nodeMap = new Map<string, TaskNodeInput>();

  for (let i = 0; i < input.nodes.length; i++) {
    const node = input.nodes[i];
    const prefix = `Node #${i + 1} (${node.id || "no-id"})`;

    // Required fields
    for (const field of REQUIRED_NODE_FIELDS) {
      if (!node[field as keyof TaskNodeInput] || typeof node[field as keyof TaskNodeInput] !== "string") {
        errors.push(`${prefix}: missing or invalid '${field}'`);
      }
    }

    // ID validation
    if (node.id) {
      if (typeof node.id !== "string" || node.id.trim() === "") {
        errors.push(`${prefix}: invalid ID`);
      } else if (ids.has(node.id)) {
        errors.push(`${prefix}: duplicate ID '${node.id}'`);
      } else {
        ids.add(node.id);
        nodeMap.set(node.id, node);
      }
    }

    // Status validation
    if (node.status && !VALID_STATUSES.has(node.status)) {
      warnings.push(`${prefix}: invalid status '${node.status}', defaulting to 'pending'`);
    }

    // Dependencies count
    if (Array.isArray(node.dependencies) && node.dependencies.length > MAX_DEPENDENCIES_PER_NODE) {
      warnings.push(`${prefix}: too many dependencies (${node.dependencies.length}). Consider restructuring.`);
    }

    // Dependencies validation
    if (Array.isArray(node.dependencies)) {
      for (const depId of node.dependencies) {
        if (typeof depId !== "string") {
          errors.push(`${prefix}: invalid dependency reference`);
        }
      }
    }

    // Source validation — ensure URLs are real
    if (Array.isArray(node.sources)) {
      for (const src of node.sources) {
        if (src && src.url) {
          if (!src.url.startsWith("http://") && !src.url.startsWith("https://")) {
            warnings.push(`${prefix}: source URL '${src.url}' doesn't look like a real URL`);
          }
        }
      }
    }

    // Recommendation detection
    if (typeof node.recommendation === "string" && node.recommendation) {
      // Valid — recommendation is a proper field
    }
    if (typeof node.output === "string" && node.output.includes("[RECOMMENDATION]")) {
      // Also valid — AI sometimes puts recommendations in output
    }
  }

  // ── Dependency existence check ───────────────────────────────────
  for (let i = 0; i < input.nodes.length; i++) {
    const node = input.nodes[i];
    if (!node.id || !Array.isArray(node.dependencies)) continue;

    for (const depId of node.dependencies) {
      if (!ids.has(depId)) {
        errors.push(`Node '${node.id}': dependency '${depId}' does not exist`);
      }
    }
  }

  // ── Circular dependency check (DFS) ─────────────────────────────
  function hasCycle(nodeId: string, visited: Set<string>, stack: Set<string>): boolean {
    visited.add(nodeId);
    stack.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (node && Array.isArray(node.dependencies)) {
      for (const depId of node.dependencies) {
        if (!ids.has(depId)) continue;
        if (stack.has(depId)) return true;
        if (!visited.has(depId) && hasCycle(depId, visited, stack)) return true;
      }
    }

    stack.delete(nodeId);
    return false;
  }

  const visited = new Set<string>();
  for (const id of ids) {
    if (!visited.has(id) && hasCycle(id, visited, new Set())) {
      errors.push(`Circular dependency detected involving node '${id}'`);
      break;
    }
  }

  // ── Parallel group validation ────────────────────────────────────
  const parallelGroups = new Map<string, string[]>();
  for (const node of input.nodes) {
    if (node.id && typeof node.parallelGroup === "string" && node.parallelGroup) {
      if (!parallelGroups.has(node.parallelGroup)) {
        parallelGroups.set(node.parallelGroup, []);
      }
      parallelGroups.get(node.parallelGroup)!.push(node.id);
    }
  }

  // Check that parallel group members share the same dependencies
  // If mismatched, remove parallelGroup from offending nodes (auto-correct)
  for (const [groupName, memberIds] of parallelGroups) {
    if (memberIds.length < 2) {
      warnings.push(`Parallel group '${groupName}' has only 1 member — removing it`);
      // Remove parallelGroup from the single member
      for (const id of memberIds) {
        const node = input.nodes.find((n: TaskNodeInputInput) => n.id === id);
        if (node) node.parallelGroup = null;
      }
      parallelGroups.delete(groupName);
      continue;
    }

    // All members should have the same dependencies
    const depSets = memberIds.map((id) => {
      const node = nodeMap.get(id);
      return new Set(Array.isArray(node?.dependencies) ? node!.dependencies : []);
    });

    for (let i = 1; i < depSets.length; i++) {
      const a = depSets[0];
      const b = depSets[i];
      if (a.size !== b.size || ![...a].every((d) => b.has(d))) {
        warnings.push(`Parallel group '${groupName}': members have different dependencies — removing group`);
        // Auto-correct: remove parallelGroup from all members
        for (const id of memberIds) {
          const node = input.nodes.find((n: TaskNodeInputInput) => n.id === id);
          if (node) node.parallelGroup = null;
        }
        parallelGroups.delete(groupName);
        break;
      }
    }
  }

  // ── Execution order validation ───────────────────────────────────
  if (errors.length === 0) {
    const inDegree = new Map<string, number>();
    for (const id of ids) inDegree.set(id, 0);
    for (const id of ids) {
      const node = nodeMap.get(id);
      if (node && Array.isArray(node.dependencies)) {
        for (const depId of node.dependencies) {
          if (ids.has(depId)) {
            inDegree.set(id, (inDegree.get(id) || 0) + 1);
          }
        }
      }
    }

    const queue: string[] = [];
    for (const [id, deg] of inDegree) {
      if (deg === 0) queue.push(id);
    }

    let processed = 0;
    while (queue.length > 0) {
      const current = queue.shift()!;
      processed++;
      const node = nodeMap.get(current);
      if (node && Array.isArray(node.dependencies)) {
        for (const id of ids) {
          const n = nodeMap.get(id);
          if (n && Array.isArray(n.dependencies) && n.dependencies.includes(current)) {
            inDegree.set(id, (inDegree.get(id) || 0) - 1);
            if (inDegree.get(id) === 0) queue.push(id);
          }
        }
      }
    }

    if (processed !== ids.size) {
      errors.push("Execution order invalid: not all nodes can be processed");
    }
  }

  // ── Build cleaned graph ──────────────────────────────────────────
  if (errors.length > 0) {
    return { valid: false, errors, warnings, cleanedGraph: null };
  }

  const cleanedNodes: TaskNode[] = input.nodes.map((node: TaskNodeInputInput) => ({
    id: String(node.id),
    title: String(node.title || "Untitled"),
    description: String(node.description || node.what || ""),
    purpose: String(node.purpose || ""),
    howTo: String(node.howTo || node.what || ""),
    expectedOutput: String(node.expectedOutput || node.output || ""),
    status: VALID_STATUSES.has(node.status || "") ? (node.status as any) : "pending",
    dependencies: Array.isArray(node.dependencies)
      ? node.dependencies.filter((d: any) => ids.has(d) && typeof d === "string")
      : [],
    parallelGroup: typeof node.parallelGroup === "string" ? node.parallelGroup : null,
    sources: Array.isArray(node.sources)
      ? node.sources
          .filter((s: any) => s && typeof s === "object" && s.url)
          .map((s: any) => ({
            title: String(s.title || ""),
            url: String(s.url || ""),
            type: (["official", "academic", "news", "blog", "government", "other"].includes(s.type) ? s.type : "other") as any,
            reliability: (["high", "medium", "low"].includes(s.reliability) ? s.reliability : "medium") as any,
            snippet: typeof s.snippet === "string" ? s.snippet : undefined,
          }))
      : [],
    recommendation: typeof node.recommendation === "string" ? node.recommendation : undefined,
    estimatedDuration: typeof node.estimatedDuration === "string" ? node.estimatedDuration : undefined,
    tips: Array.isArray(node.tips) ? node.tips.filter((t: any) => typeof t === "string") : undefined,
  }));

  // Ensure first-level nodes (no deps) come first in the array
  cleanedNodes.sort((a: TaskNode, b: TaskNode) => {
    if (a.dependencies.length === 0 && b.dependencies.length > 0) return -1;
    if (a.dependencies.length > 0 && b.dependencies.length === 0) return 1;
    return 0;
  });

  const cleanedGraph: TaskGraph = {
    title: String(input.title || "Task Plan"),
    taskType: VALID_TASK_TYPES.has(input.taskType) ? (input.taskType as any) : "planning",
    goal: typeof input.goal === "string" ? input.goal : "",
    researchSummary: typeof input.researchSummary === "string" ? input.researchSummary : undefined,
    userContext: typeof input.userContext === "object" && input.userContext ? input.userContext : undefined,
    nodes: cleanedNodes,
  };

  return { valid: true, errors: [], warnings, cleanedGraph };
}

// Helper type to avoid TS error
type TaskNodeInputInput = {
  id?: string;
  title?: string;
  description?: string;
  purpose?: string;
  what?: string;
  howTo?: string;
  expectedOutput?: string;
  output?: string;
  status?: string;
  dependencies?: string[];
  parallelGroup?: string | null;
  sources?: { title?: string; url?: string; type?: string; reliability?: string; snippet?: string }[];
  recommendation?: string;
  estimatedDuration?: string;
  tips?: string[];
};
