import type { PlanData, MissingInfo, PlanDependency, Complexity } from "@/types/plan";

let taskCounter = 0;

function genId(): string {
  return `task_${++taskCounter}_${Date.now()}`;
}

const VALID_COMPLEXITY: Complexity[] = ["simple", "medium", "complex"];

export function parsePlanResponse(response: string): PlanData | null {
  try {
    // Try to find JSON block in the response
    const jsonMatch = response.match(/```json\s*([\s\S]*?)```/) || response.match(/\{[\s\S]*"goal"[\s\S]*\}/);
    if (!jsonMatch) return null;

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    const parsed = JSON.parse(jsonStr);
    const plan = normalizePlan(parsed);

    // Validate: must have at least a goal and one phase with tasks
    if (!plan.goal || plan.phases.length === 0) return null;

    return plan;
  } catch {
    return null;
  }
}

function normalizePlan(raw: any): PlanData {
  // Normalize complexity
  const rawComplexity = String(raw.complexity || "medium").toLowerCase();
  const complexity: Complexity = VALID_COMPLEXITY.includes(rawComplexity as Complexity)
    ? (rawComplexity as Complexity)
    : "medium";

  // Normalize phases — ensure each has title and tasks array
  const phases = Array.isArray(raw.phases)
    ? raw.phases.map((phase: any, pi: number) => ({
        id: `phase_${pi}`,
        title: phase.title || phase.name || `Phase ${pi + 1}`,
        tasks: Array.isArray(phase.tasks)
          ? phase.tasks.map((task: any) => ({
              id: genId(),
              title: task.title || task.name || "Untitled task",
              description: task.description || "",
              status: "pending" as const,
              effort: normalizeEffort(task.effort),
              dependencies: normalizeStringArray(task.dependencies),
            }))
          : [],
      }))
    : [];

  // Normalize dependencies — handle both {from, to} objects and plain strings
  const dependencies: PlanDependency[] = normalizeDependencies(raw.dependencies);

  // Normalize missingInfo — handle both {question, options} objects and plain strings
  const missingInfo: MissingInfo[] = normalizeMissingInfo(raw.missingInfo);

  return {
    goal: raw.goal || raw.title || "Untitled Goal",
    complexity,
    summary: raw.summary || raw.description || "",
    phases,
    dependencies,
    missingInfo: missingInfo.length > 0 ? missingInfo : undefined,
  };
}

function normalizeEffort(val: any): "easy" | "medium" | "hard" | undefined {
  const s = String(val || "").toLowerCase();
  if (s === "easy" || s === "medium" || s === "hard") return s;
  return undefined;
}

function normalizeStringArray(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(v => String(v));
  if (typeof val === "string") return [val];
  return [];
}

function normalizeDependencies(val: any): PlanDependency[] {
  if (!val) return [];
  if (!Array.isArray(val)) return [];

  return val.map((dep: any): PlanDependency => {
    // Already a {from, to} object
    if (dep && typeof dep === "object" && dep.from && dep.to) {
      return { from: String(dep.from), to: String(dep.to) };
    }
    // Plain string like "Backend before Frontend"
    if (typeof dep === "string") {
      const parts = dep.split(/\s*(?:→|->|before|depends on|→|=>|,)\s*/i);
      if (parts.length >= 2) {
        return { from: parts[0].trim(), to: parts.slice(1).join(" ").trim() };
      }
      return { from: dep, to: "" };
    }
    // Has name/title but no from/to
    if (dep && typeof dep === "object") {
      return { from: String(dep.name || dep.title || dep.from || ""), to: String(dep.target || dep.to || "") };
    }
    return { from: String(dep), to: "" };
  }).filter((d: PlanDependency) => d.from);
}

function normalizeMissingInfo(val: any): MissingInfo[] {
  if (!val) return [];
  if (!Array.isArray(val)) return [];

  return val.map((item: any): MissingInfo => {
    // Already a {question, options} object
    if (item && typeof item === "object" && item.question) {
      return {
        question: String(item.question),
        options: Array.isArray(item.options) ? item.options.map(String) : [],
        selected: item.selected,
      };
    }
    // Plain string like "What genre?"
    if (typeof item === "string") {
      return { question: item, options: [] };
    }
    // Might have different field names
    if (item && typeof item === "object") {
      return {
        question: String(item.question || item.text || item.label || item.title || ""),
        options: Array.isArray(item.options) ? item.options.map(String) : Array.isArray(item.choices) ? item.choices.map(String) : [],
        selected: item.selected,
      };
    }
    return { question: String(item), options: [] };
  }).filter((m: MissingInfo) => m.question);
}

export function buildPlanSystemInstruction(): string {
  return `[PLAN_MODE] ব্যবহারকারী একটি কাজের পরিকল্পনা চাইছে। তুমি একটি স্মার্ট AI Task Planner।

নিয়ম:
- প্রথমে ব্যবহারকারীর অনুরোধ বুঝো।
- কাজের জটিলতা নির্ধারণ করো (simple / medium / complex)।
- ধাপে ধাপে পরিকল্পনা তৈরি করো — phase এ ভাগ করো (যদি medium/complex হয়)।
- প্রতিটি task এ title, description, effort (easy/medium/hard) দাও।
- Dependencies চিহ্নিত করো।
- গুরুত্বপূর্ণ তথ্য অনুপস্থিত থাকলে missingInfo এ লেখো।
- সবসময় নিচের JSON ফরম্যাটে উত্তর দাও। অন্য কোনো টেক্সট লেখো না।

ফরম্যাট:
\`\`\`json
{
  "goal": "পরিকল্পনার লক্ষ্য",
  "complexity": "simple|medium|complex",
  "summary": "সংক্ষিপ্ত বিবরণ",
  "phases": [
    {
      "title": "Phase এর নাম",
      "tasks": [
        {
          "title": "কাজের নাম",
          "description": "বিস্তারিত বিবরণ",
          "effort": "easy|medium|hard",
          "dependencies": []
        }
      ]
    }
  ],
  "dependencies": [
    {"from": "কাজ A", "to": "কাজ B"}
  ],
  "missingInfo": [
    {"question": "প্রশ্ন", "options": ["বিকল্প ১", "বিকল্প ২"]}
  ]
}
\`\`\`

গুরুত্বপূর্ণ:
- Simple কাজ: ১টি phase, ২-৪টি task
- Medium কাজ: ২-৩টি phase, ৫-১০টি task
- Complex কাজ: ৩-৫টি phase, ১০+টি task, dependencies, missingInfo
- JSON ফরম্যাট সবসময় valid হতে হবে।
- বাংলায় উত্তর দাও।`;
}
