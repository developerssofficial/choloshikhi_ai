/* ===================================================================
   TaskExecutionEngine — Provider-agnostic step execution
   
   Executes individual task steps via AI (Gemini).
   Future: swap in n8n webhook adapter via ExecutionProvider interface.
   =================================================================== */

import type {
  TaskGraph,
  TaskNode,
  TaskNodeStatus,
  ExecutionProvider,
  StepExecutionParams,
  StepExecutionResult,
  TaskStepExecution,
} from "./taskTypes";

/* ===== AI CALL HELPERS (borrowed from route.ts) ===== */
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent";
const TIMEOUT_MS = 20000;

function getGeminiKeys(): string[] {
  const raw = process.env.GEMINI_API_KEY || "";
  return raw.split(",").map((k) => k.trim()).filter(Boolean);
}

const geminiKeyState = { idx: 0 };
function getNextGeminiKey(): string | null {
  const keys = getGeminiKeys();
  if (keys.length === 0) return null;
  geminiKeyState.idx = (geminiKeyState.idx + 1) % keys.length;
  return keys[geminiKeyState.idx - 1] || keys[0];
}

async function callGeminiForStep(prompt: string): Promise<string> {
  const apiKey = getNextGeminiKey();
  if (!apiKey) throw new Error("No Gemini key available");

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{
          text: "You are an AI task executor. Execute the given step and return structured JSON output. Always respond in the user's language. Never reveal model names."
        }],
      },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.5, maxOutputTokens: 1500 },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error?.message || `Gemini ${res.status}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty Gemini response");
  return text;
}

async function executeStepWithAI(prompt: string): Promise<string> {
  return await callGeminiForStep(prompt);
}

/* ===== STEP EXECUTION PROMPT BUILDER ===== */
function buildStepExecutionPrompt(params: StepExecutionParams): string {
  const completedContext = params.completedSteps.length > 0
    ? params.completedSteps.map((s, i) =>
      `[Completed Step ${i + 1}: ${s.stepId}]\nResult: ${s.output.slice(0, 500)}`
    ).join("\n\n")
    : "(No previous steps completed yet)";

  const userInputSection = params.userInput
    ? `\n\nUSER PROVIDED INPUT:\n${params.userInput}\n\nUse this input in your execution.`
    : "";

  const retrySection = params.retryCount > 0
    ? `\n\nNOTE: This is retry #${params.retryCount}. The previous attempt failed. Try a different approach or be more careful.`
    : "";

  return `You are executing a step in a task plan.

TASK: "${params.graphTitle}"
TASK TYPE: ${params.taskType}

COMPLETED STEPS (for context):
${completedContext}

CURRENT STEP TO EXECUTE:
- Step ID: ${params.stepId}
- Title: ${params.stepTitle}
- Description: ${params.stepDescription}
- How to do it: ${params.stepHowTo}
- Expected output: ${params.stepExpectedOutput}
${userInputSection}${retrySection}

═══ YOUR JOB ═══
Execute this step. Based on the step type and description:

1. For RESEARCH steps: Do the analysis, gather insights, present findings
2. For PLANNING steps: Create the plan, outline, strategy
3. For CODING steps: Generate the code, explain the approach
4. For STUDY steps: Explain the concept, create learning materials
5. For CONTENT steps: Draft the content, write the material
6. For BUSINESS steps: Analyze, strategize, provide recommendations

═══ OUTPUT FORMAT ═══
Return your output as a JSON block:
\`\`\`json
{
  "output": "Human-readable summary of what was accomplished (in user's language, 2-5 sentences)",
  "details": "Detailed output/content for this step (in user's language, can be long)",
  "recommendations": ["Optional recommendation 1", "Optional recommendation 2"],
  "waitForUser": false,
  "waitForUserQuestion": null
}
\`\`\`

If the step requires user input before continuing (e.g., choosing between options, confirming a decision):
\`\`\`json
{
  "output": "What was done so far",
  "details": "Why user input is needed",
  "recommendations": [],
  "waitForUser": true,
  "waitForUserQuestion": "The specific question to ask the user"
}
\`\`\`

═══ RULES ═══
- Write ALL text in the user's language
- Be actionable and specific, not generic
- If previous steps produced results, BUILD ON THEM
- Never repeat what was already done
- If this is a research step, reference real data/trends
- If this is a coding step, provide actual code
- Be concise in "output", detailed in "details"`;
}

/* ===== CORE EXECUTION ENGINE ===== */
export const AIExecutionProvider: ExecutionProvider = {
  name: "ai_internal",

  async executeStep(params: StepExecutionParams): Promise<StepExecutionResult> {
    try {
      const prompt = buildStepExecutionPrompt(params);
      const rawResponse = await executeStepWithAI(prompt);

      // Try to extract JSON from response
      let parsed: any = null;
      const jsonBlock = rawResponse.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonBlock) {
        try { parsed = JSON.parse(jsonBlock[1]); } catch {}
      }
      if (!parsed) {
        const braceMatch = rawResponse.match(/\{[\s\S]*\}/);
        if (braceMatch) {
          try { parsed = JSON.parse(braceMatch[0]); } catch {}
        }
      }

      if (parsed && typeof parsed.output === "string") {
        return {
          success: true,
          outputText: parsed.output,
          result: {
            output: parsed.output,
            details: parsed.details || "",
            recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
          },
          waitForUser: parsed.waitForUser === true,
          waitForUserQuestion: parsed.waitForUserQuestion || undefined,
        };
      }

      // Fallback: treat entire response as output
      return {
        success: true,
        outputText: rawResponse.replace(/```json[\s\S]*?```/g, "").trim().slice(0, 500),
        result: { output: rawResponse, details: rawResponse, recommendations: [] },
      };
    } catch (err: any) {
      return {
        success: false,
        outputText: "",
        result: null,
        error: err.message || "Execution failed",
      };
    }
  },
};

/* ===== HELPER: Get eligible steps (all deps completed, not yet started) ===== */
export function getEligibleSteps(
  graph: TaskGraph,
  stepStatuses: Map<string, TaskNodeStatus>
): string[] {
  const eligible: string[] = [];

  for (const node of graph.nodes) {
    const status = stepStatuses.get(node.id) || "pending";

    // Only pending steps can be eligible
    if (status !== "pending") continue;

    // All dependencies must be completed
    const allDepsMet = node.dependencies.every((depId) => {
      const depStatus = stepStatuses.get(depId) || "pending";
      return depStatus === "completed" || depStatus === "skipped";
    });

    if (allDepsMet) {
      eligible.push(node.id);
    }
  }

  return eligible;
}

/* ===== HELPER: Check if execution is complete ===== */
export function isExecutionComplete(stepStatuses: Map<string, TaskNodeStatus>): boolean {
  for (const status of stepStatuses.values()) {
    if (status === "pending" || status === "running" || status === "waiting_for_user") {
      return false;
    }
  }
  return true;
}

/* ===== HELPER: Calculate progress ===== */
export function calculateProgress(
  graph: TaskGraph,
  stepStatuses: Map<string, TaskNodeStatus>
): { total: number; completed: number; running: number; failed: number; pending: number; percentage: number } {
  const total = graph.nodes.length;
  let completed = 0;
  let running = 0;
  let failed = 0;
  let pending = 0;

  for (const node of graph.nodes) {
    const status = stepStatuses.get(node.id) || "pending";
    switch (status) {
      case "completed": completed++; break;
      case "running": running++; break;
      case "failed": failed++; break;
      default: pending++; break;
    }
  }

  return {
    total,
    completed,
    running,
    failed,
    pending,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}
