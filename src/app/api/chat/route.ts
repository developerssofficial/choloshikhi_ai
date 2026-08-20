import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { validateTaskGraph } from "@/lib/taskGraphValidator";
import { verifyAuthUser } from "@/lib/supabase-auth";

/* ===== CONSTANTS ===== */
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent";
const MIMO_URL = "https://api.xiaomimimo.com/v1/chat/completions";
const MIMO_MODEL = "mimo-v2.5";
const TIMEOUT_MS = 15000;
const MEMORY_LIMIT = 20;

/* ===== GEMINI KEY ROTATION ===== */
const geminiKeyState = { idx: 0 };
const rateLimitedKeys = new Map<string, number>();

function getGeminiKeys(): string[] {
  const raw = process.env.GEMINI_API_KEY || "";
  return raw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

function getNextGeminiKey(): string | null {
  const keys = getGeminiKeys();
  if (keys.length === 0) return null;
  const now = Date.now();
  for (const [key, ts] of rateLimitedKeys) {
    if (now - ts > 3600_000) rateLimitedKeys.delete(key);
  }
  for (let i = 0; i < keys.length; i++) {
    const idx = (geminiKeyState.idx + i) % keys.length;
    const key = keys[idx];
    if (!rateLimitedKeys.has(key)) {
      geminiKeyState.idx = (idx + 1) % keys.length;
      return key;
    }
  }
  geminiKeyState.idx = (geminiKeyState.idx + 1) % keys.length;
  return keys[0];
}

function markKeyRateLimited(key: string) {
  rateLimitedKeys.set(key, Date.now());
}

/* ===== SYSTEM PROMPTS ===== */
const NORMAL_PROMPT =
  "You are 'CholoShikhi 1.0', a friendly AI assistant for Bengali-speaking users (mostly from Bangladesh).\n" +
  "CRITICAL RULES:\n" +
  "1. NEVER reveal your underlying model names (Gemini, MIMO, Google, Xiaomi, or any provider name).\n" +
  "2. If asked 'which model are you?' or 'who made you?', answer: 'আমি CholoShikhi 1.0 — Siblings Team তৈরি করেছে।'\n" +
  "3. NEVER say 'I am Gemini', 'I am MIMO', or mention any AI model names.\n" +
  "4. ALWAYS respond in the SAME language the user writes in (Bangla/English/Hindi).\n" +
  "5. When sharing anime/images, describe what you see in BANGLA (Bengali).\n" +
  "6. When helping with exam papers, explain answers in BANGLA.\n" +
  "7. Remember previous conversation context. Be warm and helpful.\n" +
  "8. Keep responses concise but complete.\n" +
  "9. Always wrap math expressions in $...$ (inline) or $$...$$ (block). Never write raw LaTeX without delimiters.\n" +
  "10. GREETING RULE: When greeting a user for the FIRST time in a conversation, use 'আসসালামুয়ালাইকুম' (Assalamu Alaikum). Do NOT greet with 'নমস্কার' (Namaskar). After the first greeting, do NOT repeat any greeting or salam on subsequent messages — just answer the question directly.";

/* ===== EDUCATION MODE ===== */
function analyzeTeachingState(history: Array<{ role: string; content: string }>): string {
  const lastMsgs = history.slice(-6);
  const lastUserMsg = lastMsgs.filter((m) => m.role === "user").pop()?.content?.toLowerCase() || "";
  const confusionPatterns = ["বুঝিনি", "বুঝলাম না", "আবার বলো", "আরো সহজ", "explain", "পারিনি", "কীভাবে", "মাঝে মাঝে", "confused", "bujhina", "hobena", "ki hoise"];
  const isConfused = confusionPatterns.some((p) => lastUserMsg.includes(p));
  const lastAssistantMsg = lastMsgs.filter((m) => m.role === "assistant").pop()?.content || "";
  const hadCheckQuestion = /\d[.\)]\s/i.test(lastAssistantMsg) || /কিছু প্রশ্ন|check|পরীক্ষা|বলো দেখি|ধারণাটা/i.test(lastAssistantMsg);
  const positivePatterns = ["হ্যাঁ", "হ্যা", "yes", "ji", "ঠিক আছে", "bujhte perechi", "perechi", "সঠিক", "correct", "thik ache"];
  const isPositive = positivePatterns.some((p) => lastUserMsg.includes(p));
  const negativePatterns = ["না", "no", "nahi", "bhul", "ভুল", "parena", "পারিনি", "হয়নি"];
  const isNegative = negativePatterns.some((p) => lastUserMsg.includes(p));

  let state = "";
  if (isConfused) {
    state = "\n\n[TEACHING STATE: Student says they don't understand. You MUST NOT repeat the same explanation. Instead: (1) Use a completely different analogy or real-life example. (2) Break into smaller visual steps. (3) Use a simple flow/sequence. (4) Ask one tiny question to find WHERE they're stuck.]";
  } else if (hadCheckQuestion && isPositive) {
    state = "\n\n[TEACHING STATE: Student answered correctly. Praise briefly, then move to the NEXT concept. Build on what they just learned.]";
  } else if (hadCheckQuestion && isNegative) {
    state = "\n\n[TEACHING STATE: Student gave a wrong answer to your check question. Do NOT give the full answer. Give a small HINT first and let them think. If they already got a hint before, give a slightly bigger hint. Only explain fully if they've failed 2+ times.]";
  } else if (lastMsgs.length > 2) {
    state = "\n\n[TEACHING STATE: Ongoing lesson. Continue from where you left off. Keep the same topic. Don't restart from the beginning.]";
  }
  return state;
}

function getEducationPrompt(teachingState: string): string {
  return (
    "You are 'CholoShikhi Shikkhok' — a caring, patient personal tutor for Bengali-speaking students.\n\n" +
    "YOUR CORE IDENTITY:\n" +
    "- You are a teacher, NOT an answer machine.\n" +
    "- Your goal is to make the STUDENT understand, not to show how much you know.\n" +
    "- NEVER do homework FOR the student. Make them capable of doing it themselves.\n\n" +
    "TEACHING RULES:\n" +
    "1. Assume the student knows NOTHING about the topic. Start from zero.\n" +
    "2. Use simple, natural Bangla. For English technical terms, add Bangla explanation in brackets.\n" +
    "   Example: 'Algorithm (নির্দেশিকা) মানে হলো...'\n" +
    "3. ALWAYS explain WHY and HOW something works, not just WHAT it is.\n" +
    "4. For Math/calculations: Show EVERY step. Never skip a step. Write like:\n" +
    "   Step 1: ...\n" +
    "   Step 2: ...\n" +
    "5. Break big topics into small parts. Teach ONE concept at a time.\n" +
    "6. After explaining, ask 1-2 small check questions to verify understanding.\n" +
    "   Example: 'এখন বলো, [simple question about what was just taught]?'\n" +
    "7. If student answers CORRECTLY: Praise briefly ('বাহ! ঠিক বলেছো!') → Move to next concept.\n" +
    "8. If student answers WRONG: Give a small HINT first. Let them think.\n" +
    "   Do NOT immediately give the full answer.\n" +
    "9. If student says 'বুঝিনি' or similar:\n" +
    "   - First retry: Use a different real-life analogy.\n" +
    "   - Second retry: Break into a visual step-by-step flow.\n" +
    "   - Third retry: Use the simplest possible words, like talking to a child.\n" +
    "   NEVER just copy-paste the same explanation.\n" +
    "10. Try to identify WHERE the student is stuck and start from there.\n" +
    "11. Adjust difficulty: if student is doing well, go deeper. If struggling, simplify.\n\n" +
    "IMPORTANT: This is an interactive TUTORING session, not a one-way lecture.\n" +
    "Keep responses focused and not too long. After each concept, wait for student response.\n\n" +
    "CRITICAL RULES:\n" +
    "- NEVER reveal model names (Gemini, MIMO, Google, Xiaomi).\n" +
    "- If asked 'who are you?', answer: 'আমি CholoShikhi Shikkhok — Siblings Team তৈরি করেছে।'\n" +
    "- Respond in Bangla primarily. Use English only for technical terms with Bangla explanation.\n" +
    "- IMPORTANT: Always wrap ALL mathematical expressions in $...$ (inline) or $$...$$ (display). " +
    "Never write raw LaTeX without delimiters. Example: $\\frac{a}{b}$ not \\frac{a}{b}.\n" +
    "- GREETING RULE: When greeting a student for the FIRST time, use 'আসসালামুয়ালাইকুম'. Do NOT use 'নমস্কার'. After the first greeting, do NOT repeat any greeting or salam — just continue teaching." +
    teachingState
  );
}

/* ===== TASK PLAN MODE — COMPLETELY REWRITTEN ===== */
const TASKPLAN_PROMPT = `You are 'CholoShikhi Task Planner' — an intelligent, research-driven task architect.

Your job: Understand complex user goals → Research → Analyze → Build a dynamic, actionable task graph.

═══ CRITICAL RULE: JSON ISOLATION ═══
Your response MUST be ONLY a \`\`\`json block. NOTHING else before or after.
NO explanation text. NO markdown headers. NO bullet points outside the JSON.
The system extracts ONLY the JSON block — any text outside it will be treated as garbage and lost.

═══ PHASE 1: UNDERSTAND THE GOAL ═══
Analyze what the user wants to achieve. Consider:
- Their specific context (location, budget, skill level, deadline, target audience)
- What domain this falls into (research, coding, business, study, content, project)
- What critical information is MISSING that would make the plan much better

If 2-4 key pieces of information are missing:
\`\`\`json
{"action":"clarify","message":"Natural human message explaining what info you need (in user's language, warm and helpful tone). NOT robotic.","questions":[{"id":"q1","question":"Specific question?","why":"Why this matters for your plan — explain the value","options":["Option A","Option B","Skip/Don't know"]}]}
\`\`\`

Rules for clarification:
- Ask MAX 4 questions, MIN 2
- Each question must be specific and answerable
- Include 'why' that explains the BENEFIT of answering, not just the requirement
- If user already provided info in conversation history, DON'T ask again
- If the task is simple enough, skip clarification and go to Phase 3

═══ PHASE 2: RESEARCH (when needed) ═══
Does this task require CURRENT, REAL-TIME information?
- YES if: market data, prices, regulations, technology, platforms, competition, legal requirements, location-specific info
- NO if: general knowledge, math, personal productivity, study techniques

If YES, output:
\`\`\`json
{"action":"classify","searchQueries":["specific search query 1 in English for best results","specific search query 2"],"researchGoals":"What specific information you need and why (in user's language)"}
\`\`\`

Research quality rules:
- Queries must be SPECIFIC, not generic
- Prioritize OFFICIAL/PRIMARY sources (government sites, official docs, reputable publications)
- For location-specific queries, include the location in the search query
- For business queries, search for current market data, not old articles
- Never rely on a single source — cross-reference when possible

═══ PHASE 3: BUILD THE TASK GRAPH ═══
Using: user's requirements + conversation history + research findings (if any)

OUTPUT FORMAT:
\`\`\`json
{
  "action": "plan",
  "taskGraph": {
    "title": "Descriptive title reflecting the specific goal (in user's language)",
    "taskType": "research|coding|planning|study|content|business|project|mixed",
    "goal": "One-sentence goal restatement",
    "researchSummary": "Key findings from research (if any). If no research, omit this field.",
    "userContext": {
      "budget": "budget if mentioned",
      "location": "location/country if mentioned",
      "deadline": "deadline if mentioned",
      "skillLevel": "beginner|intermediate|advanced if determinable",
      "targetAudience": "if relevant"
    },
    "nodes": [
      {
        "id": "step-1",
        "title": "Short action title (max 40 chars)",
        "description": "One-line description of what this step accomplishes",
        "purpose": "WHY this step exists — its strategic importance",
        "howTo": "Concrete, actionable instructions. What specifically to do.",
        "expectedOutput": "What you'll have when this step is done",
        "status": "pending",
        "dependencies": [],
        "parallelGroup": null,
        "sources": [
          {"title":"Source name","url":"https://...","type":"official|academic|news|blog|government","reliability":"high|medium|low","snippet":"Key takeaway from this source (max 100 chars)"}
        ],
        "recommendation": null,
        "estimatedDuration": "e.g., 2-3 hours, 1 day",
        "tips": ["Practical tip 1", "Practical tip 2"]
      }
    ]
  }
}
\`\`\`

═══ DYNAMIC GRAPH RULES (CRITICAL) ═══
1. TASK TYPE determines the GRAPH SHAPE:
   - Coding project: Requirements → Architecture → Setup → Implementation → Testing → Deployment
   - Research: Question → Sources → Collection → Verification → Analysis → Synthesis → Report
   - Business plan: Goal → Market → Customers → Competitors → Strategy → Budget → Execute → Measure → Optimize
   - Study plan: Goal → Current level → Syllabus → Topics → Schedule → Practice → Test → Review
   - Content creation: Research → Outline → Draft → Review → Refine → Publish
   - Content is ALWAYS dynamic — NOT a fixed template

2. PARALLEL EXECUTION:
   - When 2+ steps can happen simultaneously, give them the SAME parallelGroup name
   - Example: Market Research and Competitor Analysis can both happen after Goal Setting
   - They would both have parallelGroup: "market_analysis"
   - Steps that depend on BOTH parallel steps should list ALL of them in dependencies

3. DEPENDENCIES:
   - A step ONLY runs after ALL its dependencies complete
   - No step should depend on more than 3 other steps
   - If a step has no prerequisites, dependencies: []

4. NODE COUNT: Create 5-12 nodes. NOT too few (generic), NOT too many (overwhelming)

5. PERSONALIZATION:
   - Reference user's specific context in titles and descriptions
   - If budget is known, steps should respect it
   - If location is known, use location-specific information
   - If skill level is known, adjust complexity

═══ ASSUMPTION & RECOMMENDATION RULES (CRITICAL) ═══
NEVER make unsupported assumptions. If you need to estimate or suggest something the user didn't specify:

1. BUDGET ALLOCATION: NEVER split the user's budget into categories yourself.
   Instead: Set recommendation field with reasoning.
   Example: "recommendation": "[RECOMMENDATION] Based on similar businesses, inventory typically takes 50-60% of budget. But this depends on your product type. Would you like me to suggest a specific allocation?"

2. TIMELINES: If user didn't specify a deadline, don't invent one.
   Instead: "estimatedDuration": "Varies based on your pace" and add a tip about setting personal deadlines.

3. TECHNOLOGY/PLATFORM: Don't assume what tools the user has access to.
   Instead: List options in the tips field and let the user decide.

4. MARKET DATA: Only cite research findings. If data is from research, mark sources as such.
   If you're making an inference, clearly mark it as [RECOMMENDATION].

5. GENERAL RULE: If it comes from research → present as fact with source.
   If it's your inference → mark as [RECOMMENDATION] with reasoning.
   If user provided it → present as confirmed.

═══ SOURCES RULES ═══
- Only include sources with REAL URLs from actual research
- Classify source type: official, academic, news, blog, government
- Rate reliability: high (official/academic), medium (news/reputable), low (blog/forum)
- If no research was done, sources array must be empty []
- Include a brief snippet from the source when possible

═══ FINAL RULES ═══
1. ONLY output the \`\`\`json block. NOTHING else.
2. Write ALL user-facing text in the USER'S language.
3. NEVER reveal model names. Say 'CholoShikhi 1.0' if asked.
4. Math: always use $...$ or $$...$$ delimiters.
5. Each step must be a REAL actionable task, not a vague category.
6. The plan should reflect RESEARCH-DRIVEN decisions, not generic templates.
7. Node statuses must ALL be "pending" — the system tracks progress, not you.`;

/* ===== PROMPT CACHE ===== */
const promptCache = new Map<string, { response: string; time: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function getCachedResponse(key: string): string | null {
  const entry = promptCache.get(key);
  if (entry && Date.now() - entry.time < CACHE_TTL) return entry.response;
  promptCache.delete(key);
  return null;
}

function setCachedResponse(key: string, response: string) {
  if (promptCache.size > 100) {
    const oldest = promptCache.keys().next().value;
    if (oldest) promptCache.delete(oldest);
  }
  promptCache.set(key, { response, time: Date.now() });
}

/* ===== TAVILY WEB SEARCH ===== */
const TAVILY_URL = "https://api.tavily.com/search";

interface SearchResult {
  title: string;
  url: string;
  content: string;
}

async function tavilySearch(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch(TAVILY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: 5,
        search_depth: "basic",
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).slice(0, 5).map((r: any) => ({
      title: r.title || "",
      url: r.url || "",
      content: r.content || "",
    }));
  } catch {
    return [];
  }
}

async function needsWebSearch(message: string): Promise<boolean> {
  const apiKey = getNextGeminiKey();
  if (!apiKey) return false;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: "You classify user messages. Reply with ONLY 'yes' or 'no'. Does this message need current/real-time web information (news, weather, prices, recent events, current dates)? General knowledge questions, math, explanations = no. Current events, prices, weather, recent news = yes." }] },
        contents: [{ role: "user", parts: [{ text: message }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 5 },
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return false;
    const data = await res.json();
    const answer = (data?.candidates?.[0]?.content?.parts?.[0]?.text || "").toLowerCase().trim();
    return answer.includes("yes");
  } catch {
    return false;
  }
}

function buildSearchPrompt(message: string, results: SearchResult[]): string {
  const context = results
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.content}`)
    .join("\n\n");

  return (
    `Use the following web search results to answer the user's question. ` +
    `Be accurate, cite sources using [1], [2] etc., and respond in the user's language.\n\n` +
    `SEARCH RESULTS:\n${context}\n\n` +
    `USER QUESTION: ${message}`
  );
}

/* ===== MEMORY ===== */
async function getMemory(userId: string): Promise<Array<{ role: string; content: string }>> {
  try {
    const { data } = await supabase
      .from("chat_history")
      .select("message, response")
      .eq("user_id", userId)
      .order("timestamp", { ascending: false })
      .limit(MEMORY_LIMIT);

    if (!data?.length) return [];
    const history: Array<{ role: string; content: string }> = [];
    for (const row of data.reverse()) {
      history.push({ role: "user", content: row.message });
      history.push({ role: "assistant", content: row.response });
    }
    return history;
  } catch {
    return [];
  }
}

async function getSessionMemory(sessionId: string): Promise<Array<{ role: string; content: string }>> {
  try {
    const { data } = await supabase
      .from("chat_history")
      .select("message, response")
      .eq("session_id", sessionId)
      .order("timestamp", { ascending: true })
      .limit(MEMORY_LIMIT);

    if (!data?.length) return [];
    const history: Array<{ role: string; content: string }> = [];
    for (const row of data) {
      history.push({ role: "user", content: row.message });
      history.push({ role: "assistant", content: row.response });
    }
    return history;
  } catch {
    return [];
  }
}

/* ===== AI PROVIDERS ===== */

function parseBase64Image(imageBase64: string): { mimeType: string; data: string } | null {
  const match = imageBase64.match(/^data:(.+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

async function callGemini(
  message: string,
  history: Array<{ role: string; content: string }>,
  imageBase64?: string,
  systemPrompt?: string
): Promise<string> {
  const apiKey = getNextGeminiKey();
  if (!apiKey) throw new Error("Gemini key not set");

  const contents = history.map((h) => ({
    role: h.role === "assistant" ? "model" : "user",
    parts: [{ text: h.content }],
  }));

  const parts: any[] = [];
  if (imageBase64) {
    const img = parseBase64Image(imageBase64);
    if (img) {
      parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
    }
    parts.push({ text: "এই ছবিটি দেখো এবং বাংলায় বর্ণনা করো। পরীক্ষার প্রশ্ন হলে উত্তর বাংলায় দাও। অ্যানিমে/ছবি হলে বাংলায় বর্ণনা করো।\n\nUser asked: " + message });
  } else {
    parts.push({ text: message });
  }
  contents.push({ role: "user", parts });

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt || NORMAL_PROMPT }] },
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (res.status === 429) throw new Error("RATE_LIMITED");
  if (res.status === 403) throw new Error("KEY_INVALID");

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Gemini ${res.status}`);

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty Gemini response");
  return text;
}

async function callMimo(
  message: string,
  history: Array<{ role: string; content: string }>,
  imageBase64?: string,
  systemPrompt?: string
): Promise<string> {
  const apiKey = process.env.MIMO_API_KEY;
  if (!apiKey) throw new Error("MIMO key not set");

  const imagePrompt =
    "এই ছবিটি দেখো এবং বাংলায় বর্ণনা করো। " +
    "পরীক্ষার প্রশ্ন হলে উত্তর বাংলায় দাও। " +
    "অ্যানিমে/ছবি হলে বাংলায় বর্ণনা করো।\n\n" +
    "User asked: " + message;

  const messages: any[] = [
    { role: "system", content: systemPrompt || NORMAL_PROMPT },
  ];

  for (const h of history) {
    messages.push({ role: h.role, content: h.content });
  }

  if (imageBase64) {
    messages.push({
      role: "user",
      content: [
        { type: "image_url", image_url: { url: imageBase64 } },
        { type: "text", text: imagePrompt },
      ],
    });
  } else {
    messages.push({ role: "user", content: message });
  }

  const res = await fetch(MIMO_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MIMO_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data?.error?.message || `MIMO ${res.status}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty MIMO response");
  return text;
}

/* ===== HELPER: Extract JSON safely from AI response ===== */
function extractJsonFromResponse(response: string): any | null {
  // Try ```json ... ``` block first
  const jsonBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch) {
    try {
      return JSON.parse(jsonBlockMatch[1]);
    } catch {
      // Fall through to other methods
    }
  }

  // Try finding raw JSON object (first { to matching })
  const braceMatch = response.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try {
      return JSON.parse(braceMatch[0]);
    } catch {
      // Not valid JSON
    }
  }

  return null;
}

/* ===== HELPER: Generate human-readable response for task actions ===== */
function generateHumanReadableMessage(action: string, data: any): string {
  if (action === "clarify" && data.message) {
    return data.message;
  }

  if (action === "classify" && data.researchGoals) {
    return `আমি এখন গুরুত্বপূর্ণ তথ্য সংগ্রহ করছি। একটু অপেক্ষা করো...\n\n${data.researchGoals}`;
  }

  if (action === "plan" && data.taskGraph) {
    const graph = data.taskGraph;
    const nodeCount = graph.nodes?.length || 0;
    const title = graph.title || "আপনার প্ল্যান";
    return `তোমার জন্য প্ল্যান তৈরি করা হয়েছে: ${title}\n\n${nodeCount}টি actionable step তৈরি করা হয়েছে। নিচে flowchart দেখো এবং প্রতিটি step expand করে বিস্তারিত জানো।`;
  }

  return "আমি আপনার request বিশ্লেষণ করছি...";
}

/* ===== MAIN ROUTE ===== */

export async function POST(req: NextRequest) {
  try {
    const { message, userId: bodyUserId, image, sessionId, mode } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    /* ===== AUTH: Verify JWT from header, fall back to body userId ===== */
    const authUser = await verifyAuthUser(req);
    const userId = authUser?.id || bodyUserId || null;

    /* ===== SLASH COMMANDS ===== */
    const cmd = message.trim().toLowerCase();

    if (cmd === "/help") {
      return NextResponse.json({
        response:
          "তোমার জন্য commands:\n\n" +
          "/help    — সব commands\n" +
          "/status  — সিস্টেম status\n" +
          "/about   — চলো শিখি Ai সম্পর্কে\n\n" +
          "সাধারণ মেসেজ পাঠালে AI উত্তর দেবে। আমি তোমার কথা মনে রাখি!",
        provider: "local",
      });
    }

    if (cmd === "/status") {
      return NextResponse.json({
        response: `CholoShikhi 1.0 — Active\nMemory: ${MEMORY_LIMIT} messages`,
        provider: "local",
      });
    }

    if (cmd === "/about") {
      return NextResponse.json({
        response:
          "চলো শিখি Ai — তোমার AI সহকারী! 🤖\n\n" +
          "আমি তোমার পূর্ববর্তী কথা মনে রাখি।\n" +
          "ছবি শেয়ার করো, শেখো, জানো।\n" +
          "Developed by Siblings Team.",
        provider: "local",
      });
    }

    if (cmd.startsWith("/")) {
      return NextResponse.json({
        response: `"${cmd}" command পাওয়া যায়নি। /help লিখে দেখো।`,
        provider: "local",
      });
    }

    /* ===== MEMORY ===== */
    let memory: Array<{ role: string; content: string }> = [];
    if (userId && sessionId) {
      memory = await getSessionMemory(sessionId);
    } else if (userId) {
      memory = await getMemory(userId);
    }

    /* ===== BUILD SYSTEM PROMPT BASED ON MODE ===== */
    const isEducation = mode === "education";
    const isTaskPlan = mode === "taskplan";
    let activeSystemPrompt = NORMAL_PROMPT;
    if (isEducation) {
      const teachingState = analyzeTeachingState(memory);
      activeSystemPrompt = getEducationPrompt(teachingState);
    } else if (isTaskPlan) {
      activeSystemPrompt = TASKPLAN_PROMPT;
    }

    /* ===== WEB SEARCH (Normal Mode only) ===== */
    let searchResults: SearchResult[] = [];
    let searched = false;
    if (!isEducation && !image) {
      try {
        const shouldSearch = await needsWebSearch(message);
        if (shouldSearch) {
          searchResults = await tavilySearch(message);
          searched = searchResults.length > 0;
        }
      } catch {
        // Classification failed — proceed without search
      }
    }

    /* ===== PROMPT CACHE (skip for image, multi-turn, education, search, taskplan) ===== */
    const cacheKey = message.trim().toLowerCase();
    if (!image && memory.length === 0 && !isEducation && !isTaskPlan && !searched) {
      const cached = getCachedResponse(cacheKey);
      if (cached) {
        return NextResponse.json({ response: cached, provider: "cache" });
      }
    }

    /* ===== AI CALL ===== */
    let response = "";
    let usedProvider = "";

    if (image) {
      const hasGemini = !!getNextGeminiKey();
      if (hasGemini) {
        try {
          response = await callGemini(message, memory, image, activeSystemPrompt);
          usedProvider = "gemini";
        } catch (err: any) {
          if (err.message === "RATE_LIMITED") markKeyRateLimited(getGeminiKeys()[geminiKeyState.idx] || "");
        }
      }
      if (!response) {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            response = await callMimo(message, memory, image, activeSystemPrompt);
            usedProvider = "mimo";
            break;
          } catch (err: any) {
            console.error(`MIMO image attempt ${attempt + 1} failed:`, err.message);
            if (attempt === 0) await new Promise((r) => setTimeout(r, 1000));
          }
        }
      }
      if (!response) {
        return NextResponse.json(
          { error: "ছবি বিশ্লেষণে সমস্যা। আবার চেষ্টা করো।" },
          { status: 503 }
        );
      }
    } else {
      const hasGemini = !!getNextGeminiKey();
      const textMessage = searched ? buildSearchPrompt(message, searchResults) : message;

      if (hasGemini) {
        try {
          response = await callGemini(textMessage, memory, undefined, activeSystemPrompt);
          usedProvider = "gemini";
        } catch (err: any) {
          if (err.message === "RATE_LIMITED") markKeyRateLimited(getGeminiKeys()[geminiKeyState.idx] || "");
        }
      }
      if (!response) {
        try {
          response = await callMimo(textMessage, memory, undefined, activeSystemPrompt);
          usedProvider = "mimo";
        } catch (err: any) {
          try {
            response = await callGemini(textMessage, memory, undefined, activeSystemPrompt);
            usedProvider = "gemini";
          } catch {
            throw new Error("AI Providers failed");
          }
        }
      }
    }

    /* ===== EXTRACT TASK PLAN ACTIONS (taskplan mode only) ===== */
    let taskGraph: any = null;
    let taskAction: string | null = null;
    let taskClarification: any = null;
    let taskSearchQueries: string[] = [];
    let taskResearchSummary: string = "";

    if (isTaskPlan && response) {
      try {
        const parsed = extractJsonFromResponse(response);

        if (parsed && parsed.action) {
          taskAction = parsed.action;

          if (parsed.action === "clarify" && parsed.questions) {
            taskClarification = { message: parsed.message, questions: parsed.questions };
            // Set human-readable response — NEVER raw JSON
            response = parsed.message || "আমাকে কিছু তথ্য দরকার।";

          } else if (parsed.action === "classify" && parsed.searchQueries) {
            taskSearchQueries = parsed.searchQueries;

            // Run parallel Tavily searches
            const searchPromises = parsed.searchQueries.map((q: string) =>
              tavilySearch(q).catch(() => [] as SearchResult[])
            );
            const searchResultsArrays = await Promise.all(searchPromises);
            const allSearchResults = searchResultsArrays.flat();

            if (allSearchResults.length > 0) {
              // Build research context from search results
              const researchContext = allSearchResults
                .slice(0, 8)
                .map((r: SearchResult) => `SOURCE: ${r.title}\nURL: ${r.url}\nCONTENT: ${r.content.slice(0, 500)}`)
                .join("\n\n---\n\n");

              const researchMessage = [
                { role: "user", content: `Research findings for your task:\n\n${researchContext}\n\nUse these research findings to create a customized, evidence-based plan. Reference specific findings in the plan. Include real source URLs in the nodes' sources arrays.` },
              ];

              // Second API call with research results
              try {
                response = await callGemini(message, [...memory, ...researchMessage], undefined, activeSystemPrompt);
                usedProvider = "gemini";
              } catch {
                try {
                  response = await callMimo(message, [...memory, ...researchMessage], undefined, activeSystemPrompt);
                  usedProvider = "mimo";
                } catch {
                  response = await callGemini(message, [...memory, ...researchMessage], undefined, activeSystemPrompt);
                  usedProvider = "gemini";
                }
              }

              // Re-extract the final plan
              const planParsed = extractJsonFromResponse(response);
              if (planParsed && planParsed.action === "plan" && planParsed.taskGraph) {
                taskGraph = planParsed.taskGraph;
                if (!taskGraph.researchSummary) {
                  taskGraph.researchSummary = researchContext.slice(0, 500);
                }
                taskResearchSummary = taskGraph.researchSummary || "";
                // Set human-readable response — NEVER raw JSON
                response = generateHumanReadableMessage("plan", planParsed);
              } else {
                // Second call didn't produce valid JSON — use a fallback message
                response = "গবেষণা সম্পন্ন হয়েছে, কিন্তু plan generate করতে সমস্যা হয়েছে। আবার চেষ্টা করো।";
              }
            } else {
              // No search results found
              response = "গবেষণার ফলাফল পাওয়া যায়নি। আবার চেষ্টা করো।";
            }

          } else if (parsed.action === "plan" && parsed.taskGraph) {
            taskGraph = parsed.taskGraph;
            // Set human-readable response — NEVER raw JSON
            response = generateHumanReadableMessage("plan", parsed);
          }
        } else {
          // AI didn't return valid JSON — this should NOT happen in taskplan mode
          // But we handle it gracefully: return a text response
          // Strip any JSON-like content from the response to prevent raw JSON leaking
          response = response.replace(/```json[\s\S]*?```/g, "").replace(/\{[\s\S]*\}/g, "").trim();
          if (!response) {
            response = "আমি আপনার request বুঝতে পারিনি। আবার চেষ্টা করো — বেশি বিস্তারিত লিখে।";
          }
        }
      } catch {
        // JSON parse failed — strip any JSON from response to prevent raw leak
        response = response.replace(/```json[\s\S]*?```/g, "").replace(/\{[\s\S]*\}/g, "").trim();
        if (!response) {
          response = "কিছু সমস্যা হয়েছে। আবার চেষ্টা করো।";
        }
      }
    }

    // Validate task graph if present
    if (taskGraph) {
      const validation = validateTaskGraph(taskGraph);
      if (validation.valid && validation.cleanedGraph) {
        taskGraph = validation.cleanedGraph;
      } else {
        taskGraph = null;
        if (validation.errors.length > 0) {
          response = "আমার তৈরি করা plan টি সঠিক ছিল না। আবার চেষ্টা করছি...";
        }
      }
    }

    /* ===== STRIP MARKDOWN (clean text for frontend, preserve LaTeX) ===== */
    if (response) {
      const latexBlocks: string[] = [];
      response = response.replace(/\$\$([\s\S]+?)\$\$/g, (_, m) => { latexBlocks.push(m); return `§§BLK${latexBlocks.length - 1}§§`; });
      response = response.replace(/\\\[([\s\S]+?)\\\]/g, (_, m) => { latexBlocks.push(m); return `§§BLK${latexBlocks.length - 1}§§`; });
      response = response.replace(/\\\((.+?)\\\)/g, (_, m) => { latexBlocks.push(m); return `§§INL${latexBlocks.length - 1}§§`; });
      response = response.replace(/\$([^\$\n]+?)\$/g, (_, m) => { latexBlocks.push(m); return `§§INL${latexBlocks.length - 1}§§`; });

      response = response
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/\*(.+?)\*/g, "$1")
        .replace(/__(.+?)__/g, "$1")
        .replace(/~~(.+?)~~/g, "$1")
        .replace(/`{3}[\s\S]*?`{3}/g, (m) => m.replace(/`{3}\w*\n?/g, "").replace(/`{3}/g, ""))
        .replace(/`(.+?)`/g, "$1")
        .replace(/^#{1,6}\s+/gm, "")
        .replace(/^[-*+]\s+/gm, "• ")
        .replace(/^>\s+/gm, "")
        .replace(/---+/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .trim();

      // Restore LaTeX
      for (let i = latexBlocks.length - 1; i >= 0; i--) {
        response = response.replace(`§§BLK${i}§§`, `$$${latexBlocks[i]}$$`);
        response = response.replace(`§§INL${i}§§`, `$${latexBlocks[i]}$`);
      }

      // Final safety: strip any remaining JSON-like content that might leak
      response = response.replace(/```json[\s\S]*?```/g, "").trim();
    }

    /* ===== CACHE ===== */
    if (!image && memory.length === 0 && !isEducation && !isTaskPlan && response) {
      setCachedResponse(cacheKey, response);
    }

    /* ===== SAVE + COUNT + UPDATE MEMORY ===== */
    if (userId) {
      await supabase.from("chat_history").insert({
        user_id: userId,
        session_id: sessionId || null,
        message: message.trim(),
        response,
      });
    }

    return NextResponse.json({
      response,
      provider: usedProvider,
      ...(taskGraph ? { taskGraph } : {}),
      ...(taskClarification ? { taskClarification } : {}),
      ...(taskSearchQueries.length > 0 ? { taskSearchQueries } : {}),
      ...(taskAction ? { taskAction } : {}),
      ...(taskResearchSummary ? { taskResearchSummary } : {}),
      ...(searched && searchResults.length > 0 ? {
        sources: searchResults.map((r) => ({ title: r.title, url: r.url })),
      } : {}),
    });
  } catch (error: any) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "কিছু সমস্যা হয়েছে। আবার চেষ্টা করো।" },
      { status: 500 }
    );
  }
}
