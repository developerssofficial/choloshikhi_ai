import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { validateTaskGraph } from "@/lib/taskGraphValidator";

/* ===== CONSTANTS ===== */
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent";
const MIMO_URL = "https://api.xiaomimimo.com/v1/chat/completions";
const MIMO_MODEL = "mimo-v2.5";
const TIMEOUT_MS = 15000;
const MEMORY_LIMIT = 20; // recent messages to remember

/* ===== GEMINI KEY ROTATION ===== */
// Supports comma-separated multiple keys: GEMINI_API_KEY=key1,key2,key3
// Rate-limited keys auto-recover after 1 hour
const geminiKeyState = { idx: 0 };
const rateLimitedKeys = new Map<string, number>(); // key → timestamp

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
  // Clean up expired rate-limited keys (older than 1 hour)
  for (const [key, ts] of rateLimitedKeys) {
    if (now - ts > 3600_000) rateLimitedKeys.delete(key);
  }

  // Try all keys starting from current index
  for (let i = 0; i < keys.length; i++) {
    const idx = (geminiKeyState.idx + i) % keys.length;
    const key = keys[idx];
    if (!rateLimitedKeys.has(key)) {
      geminiKeyState.idx = (idx + 1) % keys.length;
      return key;
    }
  }

  // All keys rate-limited — return first one (will fail and trigger MIMO fallback)
  geminiKeyState.idx = (geminiKeyState.idx + 1) % keys.length;
  return keys[0];
}

function markKeyRateLimited(key: string) {
  rateLimitedKeys.set(key, Date.now());
}

/* ===== SYSTEM PROMPTS ===== */
const NORMAL_PROMPT =
  "You are 'CholoShikhi 1.0', a friendly AI assistant for Bengali-speaking users.\n" +
  "CRITICAL RULES:\n" +
  "1. NEVER reveal your underlying model names (Gemini, MIMO, Google, Xiaomi, or any provider name).\n" +
  "2. If asked 'which model are you?' or 'who made you?', answer: 'আমি CholoShikhi 1.0 — Xparrow Team তৈরি করেছে।'\n" +
  "3. NEVER say 'I am Gemini', 'I am MIMO', or mention any AI model names.\n" +
  "4. ALWAYS respond in the SAME language the user writes in (Bangla/English/Hindi).\n" +
  "5. When sharing anime/images, describe what you see in BANGLA (Bengali).\n" +
  "6. When helping with exam papers, explain answers in BANGLA.\n" +
  "7. Remember previous conversation context. Be warm and helpful.\n" +
  "8. Keep responses concise but complete.\n" +
  "9. Always wrap math expressions in $...$ (inline) or $$...$$ (block). Never write raw LaTeX without delimiters.";

/* ===== EDUCATION MODE: analyze conversation state ===== */
function analyzeTeachingState(history: Array<{ role: string; content: string }>): string {
  const lastMsgs = history.slice(-6); // last 3 exchanges
  const lastUserMsg = lastMsgs.filter((m) => m.role === "user").pop()?.content?.toLowerCase() || "";

  // Student doesn't understand
  const confusionPatterns = ["বুঝিনি", "বুঝলাম না", "আবার বলো", "আরো সহজ", "explain", "পারিনি", "কীভাবে", "মাঝে মাঝে", "confused", "bujhina", "hobena", "ki hoise"];
  const isConfused = confusionPatterns.some((p) => lastUserMsg.includes(p));

  // Student answered a check question
  const lastAssistantMsg = lastMsgs.filter((m) => m.role === "assistant").pop()?.content || "";
  const hadCheckQuestion = /\d[.\)]\s/i.test(lastAssistantMsg) || /কিছু প্রশ্ন|check|পরীক্ষা|বলো দেখি|ধারণাটা/i.test(lastAssistantMsg);

  // Student said yes/correct
  const positivePatterns = ["হ্যাঁ", "হ্যা", "yes", "ji", "ঠিক আছে", "bujhte perechi", "perechi", "সঠিক", "correct", "thik ache"];
  const isPositive = positivePatterns.some((p) => lastUserMsg.includes(p));

  // Student said no/wrong
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
    "- If asked 'who are you?', answer: 'আমি CholoShikhi Shikkhok — Xparrow Team তৈরি করেছে।'\n" +
    "- Respond in Bangla primarily. Use English only for technical terms with Bangla explanation.\n" +
    "- IMPORTANT: Always wrap ALL mathematical expressions in $...$ (inline) or $$...$$ (display). " +
    "Never write raw LaTeX without delimiters. Example: $\\frac{a}{b}$ not \\frac{a}{b}." +
    teachingState
  );
}

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

/* ===== TASK PLAN MODE ===== */
const TASKPLAN_PROMPT =
  "You are 'CholoShikhi Task Planner' — a deeply intelligent, research-aware task planner.\n\n" +
  "You follow a STRICT 3-phase pipeline:\n\n" +
  "═══ PHASE 1: ASSESS ═══\n" +
  "Analyze the user's request:\n" +
  "- What are they trying to achieve?\n" +
  "- What critical information is missing? (budget, location, target audience, deadline, scope, technology, preferences)\n" +
  "- If critical info is missing → respond with action: clarify\n\n" +
  "═══ PHASE 2: RESEARCH NEEDS ═══\n" +
  "Does this plan depend on CURRENT/EXTERNAL information?\n" +
  "- Market conditions, pricing, regulations, latest technology, competition, available services, best practices\n" +
  "- If YES → respond with action: classify (include targeted searchQueries)\n" +
  "- If NO → skip to PHASE 3\n\n" +
  "═══ PHASE 3: STRATEGIZE & PLAN ═══\n" +
  "Using user requirements + research findings:\n" +
  "- Analyze what's best for THIS SPECIFIC situation\n" +
  "- Make strategic decisions (not generic templates)\n" +
  "- Create a customized workflow where steps have REAL dependencies and some can run IN PARALLEL\n\n" +
  "═══ RESPONSE FORMAT ═══\n" +
  "You MUST respond with ONLY a ```json block. Nothing else.\n\n" +
  "For CLARIFICATION:\n" +
  '```json\n{"action":"clarify","message":"Message explaining what info you need (in user language)","questions":[{"id":"q1","question":"Question?","why":"Why this matters for the plan"}]}\n```\n\n' +
  "For RESEARCH (web search needed):\n" +
  '```json\n{"action":"classify","searchQueries":["targeted query 1","targeted query 2"],"summary":"Research goals (in user language)"}\n```\n\n' +
  "For FINAL PLAN (research results provided or no research needed):\n" +
  '```json\n{"action":"plan","taskGraph":{"title":"Custom Plan Title","taskType":"research|coding|planning|study|content","researchSummary":"Key research findings summary (in user language)","nodes":[{"id":"step-1","title":"Step Title","purpose":"Why this step exists","what":"What to do specifically","why":"Why this approach (based on research/user context)","status":"pending","dependencies":[],"parallelGroup":"group-name","sources":[{"title":"Source Title","url":"https://..."}],"output":"Expected output/result of this step"}]}}\n```\n\n' +
  "═══ RULES ═══\n" +
  "1. ONLY output the ```json block. No markdown, no explanation before/after.\n" +
  "2. clarify: 2-4 questions. Each specific and actionable. Include 'why' for each.\n" +
  "3. classify: 2-4 targeted search queries (English preferred for better search results).\n" +
  "4. plan: 5-10 nodes. Each MUST have: id, title, purpose, what, why, status('pending'), dependencies, parallelGroup, sources, output.\n" +
  "5. parallelGroup: nodes with the SAME group name run in parallel. Use null for sequential nodes.\n" +
  "6. Dependencies: reference step IDs. A node only runs after ALL its dependencies complete.\n" +
  "7. taskType: research, coding, planning, study, or content.\n" +
  "8. Write ALL text (title, purpose, what, why, output) in the USER'S language.\n" +
  "9. NEVER reveal model names (Gemini, MIMO, Google, Xiaomi). Say 'CholoShikhi 1.0' if asked.\n" +
  "10. Plans must be CUSTOMIZED. Reference user's specific context, budget, location, goals.\n" +
  "11. Math: always use $...$ or $$...$$ delimiters.\n" +
  "12. Sources: only include if you have real URLs from search results. Otherwise empty array [].\n" +
  "13. Each step must be a REAL actionable task, not a vague category.\n" +
  "14. The plan should show RESEARCH-DRIVEN decisions — not generic best practices.\n" +
  "15. NEVER make arbitrary budget/resource allocation decisions. If user says '1 lakh budget', do NOT split it into categories yourself. Instead, mark budget allocation as a recommendation that needs user confirmation.\n" +
  "16. When marking assumptions or recommendations, prefix them with '[RECOMMENDATION]' in the 'what' or 'output' field so the frontend can visually distinguish confirmed decisions from suggestions.";

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

// Decide if the user's message needs web search (cheap Gemini classification)
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

// Build search-augmented prompt
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

/* ===== MEMORY: fetch recent chat history from Supabase ===== */
async function getMemory(userId: string): Promise<Array<{ role: string; content: string }>> {
  try {
    const { data } = await supabase
      .from("chat_history")
      .select("message, response")
      .eq("user_id", userId)
      .order("timestamp", { ascending: false })
      .limit(MEMORY_LIMIT);

    if (!data?.length) return [];

    // build conversation history (newest first → reverse)
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

/* ===== MEMORY: fetch session-specific chat history ===== */
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

  // build contents with memory
  const contents = history.map((h) => ({
    role: h.role === "assistant" ? "model" : "user",
    parts: [{ text: h.content }],
  }));

  // build current message parts
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
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
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

  // Image-specific prompt for better Bangla output
  const imagePrompt =
    "এই ছবিটি দেখো এবং বাংলায় বর্ণনা করো। " +
    "পরীক্ষার প্রশ্ন হলে উত্তর বাংলায় দাও। " +
    "অ্যানিমে/ছবি হলে বাংলায় বর্ণনা করো।\n\n" +
    "User asked: " + message;

  // build messages with memory
  const messages: any[] = [
    { role: "system", content: systemPrompt || NORMAL_PROMPT },
  ];

  for (const h of history) {
    messages.push({ role: h.role, content: h.content });
  }

  // current message (with optional image)
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
      max_tokens: 1024,
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

/* ===== MAIN ROUTE ===== */

export async function POST(req: NextRequest) {
  try {
    const { message, userId, image, sessionId, mode } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

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
          "Developed by Xparrow Team.",
        provider: "local",
      });
    }

    if (cmd.startsWith("/")) {
      return NextResponse.json({
        response: `"${cmd}" command পাওয়া যায়নি। /help লিখে দেখো।`,
        provider: "local",
      });
    }

    /* ===== MEMORY: fetch conversation history ===== */
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

    /* ===== PROMPT CACHE (skip for image, multi-turn, education, and search) ===== */
    const cacheKey = message.trim().toLowerCase();
    if (!image && memory.length === 0 && !isEducation && !searched) {
      const cached = getCachedResponse(cacheKey);
      if (cached) {
        return NextResponse.json({ response: cached, provider: "cache" });
      }
    }

    /* ===== AI CALL ===== */
    let response = "";
    let usedProvider = "";

    if (image) {
      // Image → Gemini first, MIMO fallback (both support vision)
      const hasGemini = !!getNextGeminiKey();

      if (hasGemini) {
        try {
          response = await callGemini(message, memory, image, activeSystemPrompt);
          usedProvider = "gemini";
        } catch (err: any) {
          if (err.message === "RATE_LIMITED") markKeyRateLimited(getGeminiKeys()[geminiKeyState.idx] || "");
          // Gemini failed, try MIMO
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
      // Text → Gemini first, MIMO fallback (both get memory)
      const hasGemini = !!getNextGeminiKey();

      // Use search-augmented prompt if search was performed
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
          // Fallback: try Gemini one more time
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
    let taskResearchNotes: string = "";
    let taskResearchSummary: string = "";

    if (isTaskPlan && response) {
      try {
        const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[1]);
          taskAction = parsed.action;

          if (parsed.action === "clarify" && parsed.questions) {
            // Store clarification for frontend rendering
            taskClarification = { message: parsed.message, questions: parsed.questions };
            response = parsed.message || "আমাকে কিছু তথ্য দরকার।";

          } else if (parsed.action === "classify" && parsed.searchQueries) {
            // AI says research is needed — perform Tavily searches now
            taskSearchQueries = parsed.searchQueries;
            taskResearchNotes = parsed.summary || "";

            // Run parallel Tavily searches
            const searchPromises = parsed.searchQueries.map((q: string) =>
              tavilySearch(q).catch(() => [] as SearchResult[])
            );
            const searchResultsArrays = await Promise.all(searchPromises);
            const allSearchResults = searchResultsArrays.flat();

            if (allSearchResults.length > 0) {
              // Build research context from search results
              const researchContext = allSearchResults
                .slice(0, 6)
                .map((r: SearchResult) => `SOURCE: ${r.title}\nURL: ${r.url}\nCONTENT: ${r.content.slice(0, 500)}`)
                .join("\n\n---\n\n");

              const researchMessage = [
                { role: "user", content: `Research findings for your task:\n\n${researchContext}\n\nUse these research findings to create a customized, evidence-based plan. Reference specific findings in the plan.` },
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

              // Re-extract the final plan from the second response
              const planMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
              if (planMatch) {
                const planParsed = JSON.parse(planMatch[1]);
                if (planParsed.action === "plan" && planParsed.taskGraph) {
                  taskGraph = planParsed.taskGraph;
                  if (!taskGraph.researchSummary) {
                    taskGraph.researchSummary = researchContext.slice(0, 300);
                  }
                  taskResearchSummary = taskGraph.researchSummary || "";
                  response = "";
                }
              }
            }

          } else if (parsed.action === "plan" && parsed.taskGraph) {
            taskGraph = parsed.taskGraph;
            response = "";
          }
        }
      } catch {
        // JSON parse failed — response stays as plain text
      }
    }

    // Validate task graph if present
    if (taskGraph) {
      const validation = validateTaskGraph(taskGraph);
      if (validation.valid && validation.cleanedGraph) {
        taskGraph = validation.cleanedGraph;
      } else {
        // Graph invalid — strip it and return error message
        taskGraph = null;
        if (validation.errors.length > 0) {
          response = "আমার তৈরি করা plan টি সঠিক ছিল না। আবার চেষ্টা করছি...";
        }
      }
    }

    /* ===== STRIP MARKDOWN (clean text for frontend, preserve LaTeX) ===== */
    if (response) {
      // Extract ALL LaTeX expressions first to protect them
      const latexBlocks: string[] = [];
      // Block math: $$...$$ or \[...\]
      response = response.replace(/\$\$([\s\S]+?)\$\$/g, (_, m) => { latexBlocks.push(m); return `§§BLK${latexBlocks.length - 1}§§`; });
      response = response.replace(/\\\[([\s\S]+?)\\\]/g, (_, m) => { latexBlocks.push(m); return `§§BLK${latexBlocks.length - 1}§§`; });
      // Inline math: \(...\) — do this before $...$ to avoid conflicts
      response = response.replace(/\\\((.+?)\\\)/g, (_, m) => { latexBlocks.push(m); return `§§INL${latexBlocks.length - 1}§§`; });
      // Inline math: $...$ (single line only)
      response = response.replace(/\$([^\$\n]+?)\$/g, (_, m) => { latexBlocks.push(m); return `§§INL${latexBlocks.length - 1}§§`; });

      response = response
        .replace(/\*\*(.+?)\*\*/g, "$1")   // **bold** → bold
        .replace(/\*(.+?)\*/g, "$1")        // *italic* → italic
        .replace(/__(.+?)__/g, "$1")        // __bold__ → bold
        .replace(/~~(.+?)~~/g, "$1")        // ~~strikethrough~~ → strikethrough
        .replace(/`{3}[\s\S]*?`{3}/g, (m) => m.replace(/`{3}\w*\n?/g, "").replace(/`{3}/g, ""))
        .replace(/`(.+?)`/g, "$1")          // `inline code` → inline code
        .replace(/^#{1,6}\s+/gm, "")        // ### headings → headings
        .replace(/^[-*+]\s+/gm, "• ")       // - list → bullet
        .replace(/^>\s+/gm, "")             // > blockquote → blockquote
        .replace(/---+/g, "")               // --- → horizontal rule
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [text](url) → text
        .trim();

      // Restore LaTeX expressions — block math first, then inline
      for (let i = latexBlocks.length - 1; i >= 0; i--) {
        response = response.replace(`§§BLK${i}§§`, `$$${latexBlocks[i]}$$`);
        response = response.replace(`§§INL${i}§§`, `$${latexBlocks[i]}$`);
      }
    }

    /* ===== CACHE ===== */
    if (!image && memory.length === 0 && !isEducation && response) {
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
      ...(taskAction === "classify" && taskSearchQueries.length > 0 ? {
        sources: taskSearchQueries.map((q) => ({ query: q })),
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