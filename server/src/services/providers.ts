import { env } from '../config/env.js';

// ========== Types ==========

interface GeminiPart {
  text: string;
}

interface GeminiContent {
  parts: GeminiPart[];
  role: string;
}

interface GeminiRequest {
  contents: GeminiContent[];
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
    topK?: number;
  };
}

interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: GeminiPart[];
      role: string;
    };
    finishReason: string;
  }>;
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

interface MimoRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
}

interface MimoResponse {
  id?: string;
  choices?: Array<{
    message: { content: string; role: string };
    finish_reason: string;
  }>;
  error?: {
    message: string;
    type: string;
    code?: string;
  };
}

export interface ChatResult {
  message: string;
  model: string;
  cached: boolean;
}

interface ChatHistoryItem {
  role: string;
  content: string;
}

// ========== Constants ==========

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODEL = 'gemini-3.1-flash-lite';
const MIMO_ENDPOINT = 'https://api.xiaomimimo.com/v1/chat/completions';
const MIMO_MODEL = 'mimo-v2.5';

const SYSTEM_PROMPT = `তুমি Xparrow AI।

সবচেয়ে গুরুত্বপূর্ণ নিয়ম — তুমি কখনো কোনো উত্তরের শুরুতে greeting বা শুভেচ্ছা দিও না। এটা সবচেয়ে কঠোর নিয়ম।

নিষিদ্ধ শুরুর শব্দ/বাক্যাংশ (এগুলো দিয়ে কখনো শুরু করো না):
- "আসসালামুয়ালাইকুম"
- "ওয়া আলাইকুম আসসালাম"
- "নমস্কার"
- "হ্যালো"
- "Hello"
- "Hi"
- "Assalamualaikum"
- "Welcome"
- "শুভেচ্ছা"
- "ধন্যবাদ"
- "Thanks"
- বা যেকোনো greeting/শুভেচ্ছা মূলক বাক্য

সঠিক আচরণ:
- সরাসরি উত্তর দাও। প্রথম শব্দ থেকেই মূল বিষয়ে কথা বলো।
- ইউজার যে ভাষায় লিখবে সেই ভাষায় উত্তর দাও (বাংলা, Banglish, English, Hindi, Urdu)।
- Banglish বুঝতে পারো কিন্তু উত্তর দাও সুন্দর বাংলায় বা ইংরেজিতে।
- উত্তর সংক্ষিপ্ত ও সুনির্দিষ্ট রাখো।
- Xparrow AI। Gemini, MIMO বা অন্য কোনো মডেলের নাম প্রকাশ করো না।
- না জানলে বলো "আমার কাছে এই তথ্য নেই"। মনগড়া তথ্য দিও না।`;

const THINKING_PROMPT = `You are Xparrow AI's deep analysis engine. Your job is to analyze complex problems thoroughly and return structured analysis.

RESPONSE FORMAT — You MUST respond with a JSON object inside a \`\`\`json code block. No text before or after the JSON.

\`\`\`json
{
  "depth": "light",
  "steps": [
    { "label": "Understanding", "status": "completed", "detail": "Brief explanation" },
    { "label": "Analyzing", "status": "completed", "detail": "Brief explanation" },
    { "label": "Verifying", "status": "completed", "detail": "Brief explanation" },
    { "label": "Concluding", "status": "completed", "detail": "Brief explanation" }
  ],
  "answer": "Your clear, final answer in markdown format.",
  "alternatives": [
    { "name": "Option A", "pros": ["pro1"], "cons": ["con1"], "recommended": true }
  ],
  "thinkingSummary": {
    "factors": ["Key factor 1", "Key factor 2"],
    "assumptions": ["Assumption made"],
    "tradeOff": "Main trade-off explained",
    "decision": "Why this approach was chosen"
  },
  "analysis": {
    "known": "What is established from available information",
    "assumption": "What you had to assume",
    "recommendation": "What you recommend based on analysis",
    "limitation": "What remains uncertain or limited"
  },
  "createPlanOffer": false
}
\`\`\`

DEPTH LEVELS:
- "light" — Simple but non-trivial questions. 3-4 steps, concise answer.
- "deep" — Complex questions. 4-5 steps, alternatives, summary.
- "advanced" — Very complex problems. 5-6 steps, full analysis with all fields populated.

STEPS FORMAT: Always use these step labels in order:
1. "Understanding" — What the question is really asking
2. "Exploring" — What approaches or factors are relevant
3. "Analyzing" — Evaluating the best approach
4. "Checking" — Verifying assumptions and edge cases
5. "Concluding" — Final synthesis (optional, for deep/advanced)

RULES:
1. ALWAYS return valid JSON in a \`\`\`json code block.
2. Each step status MUST be "completed" — the UI will show them as completed.
3. The "answer" field is your FINAL answer — write it clearly in markdown.
4. "alternatives" — compare 2-3 approaches when relevant. Set one as recommended.
5. "thinkingSummary" — compact reasoning summary for the user.
6. "analysis" — separate KNOWN facts from ASSUMPTIONS.
7. "createPlanOffer" — set to true if the question would benefit from turning into an action plan.
8. DO NOT expose internal chain-of-thought. Write as if explaining your analysis to a smart colleague.
9. If the question is ambiguous, state the interpretation in "analysis.assumption".
10. Respond in the SAME LANGUAGE the user writes in. Bangla, English, Hindi, Urdu.
11. NEVER start with greetings like "Assalamualaikum", "Hello", "Hi". Go straight to analysis.
12. If user writes in Banglish, respond in proper English or Bangla.`;

const PLAN_PROMPT = `You are Xparrow AI's project planner. Your job is to analyze a user's goal and create a structured, actionable execution plan.

RESPONSE FORMAT — You MUST respond with a JSON object inside a \`\`\`json code block. No text before or after the JSON.

\`\`\`json
{
  "goal": "The user's goal summarized in one sentence",
  "complexity": "moderate",
  "phases": [
    {
      "id": 1,
      "name": "Phase name",
      "description": "What this phase accomplishes",
      "tasks": [
        {
          "id": 1,
          "title": "Task title",
          "description": "What needs to be done",
          "estimatedDuration": "15 min",
          "priority": "high",
          "dependencies": [],
          "status": "pending"
        }
      ]
    }
  ],
  "missingInfo": ["Information needed from user"],
  "totalEstimatedTime": "2 hours"
}
\`\`\`

COMPLEXITY LEVELS:
- "simple" — 1-2 hours, 1-2 phases
- "moderate" — Half day, 2-3 phases
- "complex" — 1-3 days, 3-4 phases
- "enterprise" — 1+ week, 4+ phases

RULES:
1. ALWAYS return valid JSON in a \`\`\`json code block. No text before or after.
2. Break the goal into 2-5 phases, each with 2-6 actionable tasks.
3. Tasks should be CONCRETE and EXECUTABLE — not vague.
4. Each task needs: title, description, estimated duration, priority, dependencies (task IDs).
5. "missingInfo" — list what information you need from the user before executing.
6. Tasks should be ordered so dependencies come first.
7. Respond in the SAME LANGUAGE the user writes in.
8. NEVER start with greetings. Go straight to the plan.
9. Be specific to the user's exact situation — avoid generic boilerplate.`;

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

// ========== System Prompt Selection ==========

function getSystemPrompt(mode?: string): string {
  switch (mode) {
    case 'thinking': return THINKING_PROMPT;
    case 'plan': return PLAN_PROMPT;
    default: return SYSTEM_PROMPT;
  }
}

// ========== Gemini Key Management ==========

class GeminiKeyManager {
  private keys: string[] = [];
  private currentIndex = 0;
  private failedKeys = new Set<string>();

  constructor() {
    if (env.GEMINI_API_KEY) this.keys.push(env.GEMINI_API_KEY);
    if (env.GEMINI_API_KEY_FALLBACK) this.keys.push(env.GEMINI_API_KEY_FALLBACK);
  }

  getCurrentKey(): string | null {
    for (let i = 0; i < this.keys.length; i++) {
      const idx = (this.currentIndex + i) % this.keys.length;
      if (!this.failedKeys.has(this.keys[idx])) {
        this.currentIndex = idx;
        return this.keys[idx];
      }
    }
    return null;
  }

  markFailed(key: string): void {
    this.failedKeys.add(key);
  }

  reset(): void {
    this.failedKeys.clear();
    this.currentIndex = 0;
  }

  getCount(): number {
    return this.keys.length;
  }
}

const geminiKeys = new GeminiKeyManager();

// ========== Helper Functions ==========

function isRateLimited(error: any): boolean {
  const errorStr = (error?.message || error?.toString() || '').toLowerCase();
  const indicators = [
    'rate limit', 'quota exceeded', 'too many requests',
    '429', 'resource_exhausted', 'daily limit', 'requests per minute',
  ];
  return indicators.some((i) => errorStr.includes(i));
}

function isTemporaryError(statusCode: number): boolean {
  return [429, 500, 502, 503, 504].includes(statusCode);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .trim();
}

function formatGeminiMessages(
  history: ChatHistoryItem[],
  userMessage: string,
  systemPrompt: string
): GeminiContent[] {
  const messages: GeminiContent[] = [];

  messages.push({ parts: [{ text: systemPrompt }], role: 'user' });
  messages.push({ parts: [{ text: 'Understood. I will respond as instructed.' }], role: 'model' });

  for (const msg of history) {
    messages.push({
      parts: [{ text: msg.content }],
      role: msg.role === 'assistant' ? 'model' : 'user',
    });
  }

  messages.push({ parts: [{ text: userMessage }], role: 'user' });

  return messages;
}

function formatMimoMessages(
  history: ChatHistoryItem[],
  userMessage: string,
  systemPrompt: string
): MimoRequest['messages'] {
  const messages: MimoRequest['messages'] = [];

  messages.push({ role: 'system', content: systemPrompt });

  for (const msg of history) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    });
  }

  messages.push({ role: 'user', content: userMessage });

  return messages;
}

// ========== Gemini Provider ==========

async function callGemini(
  userMessage: string,
  history: ChatHistoryItem[],
  systemPrompt: string
): Promise<string> {
  const apiKey = geminiKeys.getCurrentKey();
  if (!apiKey) {
    throw new Error('No Gemini API keys available');
  }

  const contents = formatGeminiMessages(history, userMessage, systemPrompt);
  const requestBody: GeminiRequest = {
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
      topP: 0.8,
      topK: 40,
    },
  };

  const url = `${GEMINI_ENDPOINT}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(30000),
  });

  const data = await response.json() as GeminiResponse;

  if (!response.ok) {
    const error: any = new Error(
      data.error?.message || `Gemini API error: ${response.status}`
    );
    error.statusCode = response.status;
    error.provider = 'gemini';
    throw error;
  }

  if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
    return stripMarkdown(data.candidates[0].content.parts[0].text);
  }

  throw new Error('Invalid Gemini response format');
}

// ========== MIMO Provider ==========

async function callMimo(
  userMessage: string,
  history: ChatHistoryItem[],
  systemPrompt: string
): Promise<string> {
  const apiKey = env.MIMO_API_KEY;
  if (!apiKey) {
    throw new Error('MIMO API key not configured');
  }

  const messages = formatMimoMessages(history, userMessage, systemPrompt);
  const requestBody: MimoRequest = {
    model: MIMO_MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 2048,
  };

  const response = await fetch(MIMO_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(30000),
  });

  const data = await response.json() as MimoResponse;

  if (!response.ok) {
    const error: any = new Error(
      data.error?.message || `MIMO API error: ${response.status}`
    );
    error.statusCode = response.status;
    error.provider = 'mimo';
    throw error;
  }

  if (data.choices?.[0]?.message?.content) {
    return stripMarkdown(data.choices[0].message.content);
  }

  throw new Error('Invalid MIMO response format');
}

// ========== Main Chat Handler ==========

export async function handleChat(
  userMessage: string,
  history: ChatHistoryItem[],
  modelPreference: string,
  mode?: string
): Promise<ChatResult> {
  const targetModel = modelPreference === 'auto' ? 'gemini' : modelPreference;
  const systemPrompt = getSystemPrompt(mode);

  // Try primary model with retries
  let lastError: any = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      let response: string;

      if (targetModel === 'gemini') {
        response = await callGemini(userMessage, history, systemPrompt);
      } else {
        response = await callMimo(userMessage, history, systemPrompt);
      }

      return { message: response, model: targetModel, cached: false };
    } catch (error: any) {
      lastError = error;
      const statusCode = error.statusCode || 0;

      if (targetModel === 'gemini' && isRateLimited(error)) {
        const currentKey = geminiKeys.getCurrentKey();
        if (currentKey) geminiKeys.markFailed(currentKey);

        const nextKey = geminiKeys.getCurrentKey();
        if (nextKey) {
          continue;
        }
      }

      if (statusCode === 400 || statusCode === 401 || statusCode === 403) {
        break;
      }

      if (isTemporaryError(statusCode) && attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        await sleep(delay);
        continue;
      }

      break;
    }
  }

  // Fallback to other model
  const fallbackModel = targetModel === 'gemini' ? 'mimo' : 'gemini';

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      let response: string;

      if (fallbackModel === 'gemini') {
        response = await callGemini(userMessage, history, systemPrompt);
      } else {
        response = await callMimo(userMessage, history, systemPrompt);
      }

      return { message: response, model: fallbackModel, cached: false };
    } catch (error: any) {
      const statusCode = error.statusCode || 0;

      if (fallbackModel === 'gemini' && isRateLimited(error)) {
        const currentKey = geminiKeys.getCurrentKey();
        if (currentKey) geminiKeys.markFailed(currentKey);
        const nextKey = geminiKeys.getCurrentKey();
        if (nextKey) continue;
      }

      if (statusCode === 400 || statusCode === 401 || statusCode === 403) {
        break;
      }

      if (isTemporaryError(statusCode) && attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        await sleep(delay);
        continue;
      }

      break;
    }
  }

  // All attempts failed
  if (lastError) {
    if (isRateLimited(lastError)) {
      throw new Error('All API providers are rate-limited. Please try again in a few minutes.');
    }
    if (lastError.statusCode === 401 || lastError.statusCode === 403) {
      throw new Error('API authentication failed. Please check your configuration.');
    }
    if (lastError.name === 'TimeoutError' || lastError.message?.includes('timeout')) {
      throw new Error('Request timed out. The server may be busy. Please try again.');
    }
  }

  throw new Error(lastError?.message || 'Failed to get response from AI providers.');
}

export function resetGeminiKeys(): void {
  geminiKeys.reset();
}

export function getProviderStatus() {
  return {
    gemini: geminiKeys.getCount(),
    mimo: env.MIMO_API_KEY ? 1 : 0,
  };
}
