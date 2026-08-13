/* ===================================================================
   TaskGraphValidator — validates AI-generated task graph JSON
   
   Checks: unique IDs, dependency references, circular deps,
   valid statuses, required fields, execution order.
   =================================================================== */

export interface TaskNodeInput {
  id?: string;
  title?: string;
  purpose?: string;
  what?: string;
  why?: string;
  status?: string;
  dependencies?: string[];
  parallelGroup?: string | null;
  sources?: { title?: string; url?: string }[];
  output?: string;
  details?: string;
}

export interface TaskGraphInput {
  title?: string;
  taskType?: string;
  researchSummary?: string;
  nodes?: TaskNodeInput[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  cleanedGraph: any | null;
}

const VALID_STATUSES = new Set(["pending", "running", "completed", "failed", "waiting_for_user"]);
const VALID_TASK_TYPES = new Set(["research", "coding", "planning", "study", "content"]);
const REQUIRED_NODE_FIELDS = ["id", "title", "purpose", "what", "why"];

export function validateTaskGraph(input: any): ValidationResult {
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
    errors.push(`Invalid taskType '${input.taskType}'. Must be: research, coding, planning, study, content`);
  }

  if (!Array.isArray(input.nodes) || input.nodes.length === 0) {
    return { valid: false, errors: ["Missing or empty 'nodes' array"], warnings, cleanedGraph: null };
  }

  if (input.nodes.length > 15) {
    warnings.push(`Large graph (${input.nodes.length} nodes). Consider breaking into smaller tasks.`);
  }

  // ── Node-level validation ────────────────────────────────────────
  const ids = new Set<string>();
  const nodeMap = new Map<string, any>();

  for (let i = 0; i < input.nodes.length; i++) {
    const node = input.nodes[i];
    const prefix = `Node #${i + 1}`;

    // Required fields
    for (const field of REQUIRED_NODE_FIELDS) {
      if (!node[field] || typeof node[field] !== "string") {
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

    // Dependencies validation
    if (Array.isArray(node.dependencies)) {
      for (const depId of node.dependencies) {
        if (typeof depId !== "string") {
          errors.push(`${prefix}: invalid dependency reference`);
        }
        // We'll check existence after all IDs are collected
      }
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

  // ── Execution order validation ───────────────────────────────────
  // Check that the topological sort is possible
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
    const sorted: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      sorted.push(current);
      processed++;
      const node = nodeMap.get(current);
      if (node && Array.isArray(node.dependencies)) {
        // Find nodes that depend on current
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

  const cleanedNodes = input.nodes.map((node: any) => ({
    id: String(node.id),
    title: String(node.title || "Untitled"),
    purpose: String(node.purpose || ""),
    what: String(node.what || ""),
    why: String(node.why || ""),
    status: VALID_STATUSES.has(node.status) ? node.status : "pending",
    dependencies: Array.isArray(node.dependencies)
      ? node.dependencies.filter((d: any) => ids.has(d) && typeof d === "string")
      : [],
    parallelGroup: typeof node.parallelGroup === "string" ? node.parallelGroup : null,
    sources: Array.isArray(node.sources)
      ? node.sources
          .filter((s: any) => s && typeof s === "object" && s.url)
          .map((s: any) => ({ title: String(s.title || ""), url: String(s.url || "") }))
      : [],
    output: typeof node.output === "string" ? node.output : "",
    details: typeof node.details === "string" ? node.details : "",
  }));

  // Ensure first-level nodes (no deps) come first in the array
  cleanedNodes.sort((a: any, b: any) => {
    if (a.dependencies.length === 0 && b.dependencies.length > 0) return -1;
    if (a.dependencies.length > 0 && b.dependencies.length === 0) return 1;
    return 0;
  });

  const cleanedGraph = {
    title: String(input.title || "Task Plan"),
    taskType: VALID_TASK_TYPES.has(input.taskType) ? input.taskType : "planning",
    researchSummary: typeof input.researchSummary === "string" ? input.researchSummary : "",
    nodes: cleanedNodes,
  };

  return { valid: true, errors: [], warnings, cleanedGraph };
}
