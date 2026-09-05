import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { validateTaskGraph } from "@/lib/taskGraphValidator";
import { verifyAuthUser } from "@/lib/supabase-auth";
import { canSendMessage, incrementTeacherUsage } from "@/lib/subscription";
import { filterProfanity } from "@/lib/profanityFilter";
import { findSaptabarnaContext } from "@/lib/knowledge/saptabarna";
import { findPrimaryTextbookContext } from "@/lib/knowledge/primaryTextbooks";
import { getBookById, getBooksByClass, getChaptersByBookId, getQuestionsByChapterId } from "@/lib/nctbDb";

/* ===== CONSTANTS ===== */
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent";
const TIMEOUT_MS = 15000;
const MEMORY_LIMIT = 50;

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
  "1. NEVER reveal your underlying model names (Gemini, Google, or any provider name).\n" +
  "2. If asked 'which model are you?' or 'who made you?', answer: 'আমি CholoShikhi 1.0 — Siblings Team তৈরি করেছে।'\n" +
  "3. NEVER say 'I am Gemini' or mention any AI model names.\n" +
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
    "- NEVER reveal model names (Gemini, Google).\n" +
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

// Quality indicators: government, academic, news, official domains
const HIGH_QUALITY_DOMAINS = [
  ".gov", ".edu", ".org", "wikipedia.org", "bbc.com", "reuters.com",
  "apnews.com", "who.int", "un.org", "worldbank.org", "imf.org",
  "stackoverflow.com", "github.com", "mdn.mozilla.org", "w3.org",
];

function isHighQualityUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return HIGH_QUALITY_DOMAINS.some(d => lower.includes(d));
}

function filterResults(results: SearchResult[]): SearchResult[] {
  // Remove duplicates by URL domain+path
  const seen = new Set<string>();
  const unique = results.filter(r => {
    try {
      const key = new URL(r.url).pathname.replace(/\/+$/, "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    } catch {
      return true;
    }
  });

  // Remove results with very short content (< 50 chars = likely junk)
  const substantial = unique.filter(r => r.content.length >= 50);

  // Sort: high-quality sources first, then by content length
  return substantial.sort((a, b) => {
    const aQuality = isHighQualityUrl(a.url) ? 1 : 0;
    const bQuality = isHighQualityUrl(b.url) ? 1 : 0;
    if (bQuality !== aQuality) return bQuality - aQuality;
    return b.content.length - a.content.length;
  });
}

interface SearchConfig {
  query: string;
  maxResults: number;
  searchDepth: "basic" | "advanced";
}

// Build multiple targeted queries for complex topics
function buildSearchQueries(message: string, complexity: "simple" | "standard" | "heavy"): SearchConfig {
  if (complexity === "heavy") {
    // Heavy: multi-angle search with advanced depth
    return {
      query: message,
      maxResults: 12,
      searchDepth: "advanced",
    };
  }
  if (complexity === "standard") {
    return {
      query: message,
      maxResults: 8,
      searchDepth: "basic",
    };
  }
  // Simple: quick search, few results
  return {
    query: message,
    maxResults: 5,
    searchDepth: "basic",
  };
}

async function tavilySearch(query: string, complexity: "simple" | "standard" | "heavy" = "standard"): Promise<SearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  const config = buildSearchQueries(query, complexity);

  try {
    const res = await fetch(TAVILY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: config.query,
        max_results: config.maxResults,
        search_depth: config.searchDepth,
      }),
      signal: AbortSignal.timeout(config.searchDepth === "advanced" ? 15000 : 10000),
    });

    if (!res.ok) return [];
    const data = await res.json();
    const raw = (data.results || []).map((r: any) => ({
      title: r.title || "",
      url: r.url || "",
      content: r.content || "",
    }));

    // Filter and sort by quality
    const filtered = filterResults(raw);

    // For heavy queries: also run a second angle query if first results are thin
    if (complexity === "heavy" && filtered.length < 5) {
      try {
        const secondQuery = `${query} detailed analysis`;
        const res2 = await fetch(TAVILY_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: apiKey,
            query: secondQuery,
            max_results: 8,
            search_depth: "advanced",
          }),
          signal: AbortSignal.timeout(15000),
        });
        if (res2.ok) {
          const data2 = await res2.json();
          const raw2 = (data2.results || []).map((r: any) => ({
            title: r.title || "",
            url: r.url || "",
            content: r.content || "",
          }));
          // Merge, deduplicate, re-filter
          const merged = filterResults([...filtered, ...raw2]);
          return merged.slice(0, 15);
        }
      } catch {}
    }

    return filtered.slice(0, config.maxResults);
  } catch {
    return [];
  }
}

interface SearchClassification {
  needsSearch: boolean;
  complexity: "simple" | "standard" | "heavy";
}

// Fast keyword-based pre-filter: skip classifySearch for obvious non-search messages
// Saves 3-5 seconds per non-search message by eliminating the Gemini classify call
function fastClassify(message: string): SearchClassification {
  const lower = message.toLowerCase().trim();

  // Very short messages — never need search
  if (lower.length < 8) return { needsSearch: false, complexity: "simple" };

  // Greetings, thanks, small talk
  const noSearchPatterns = [
    "hi", "hello", "hey", "thanks", "thank you", "ok", "okay", "bye",
    "assalamu", "namaskar", "shukriya", "dhonnobad",
    "ki obostha", "kemon acho", "amar naam", "tumi ki",
    /^\/[a-z]+/,  // slash commands
  ];
  if (noSearchPatterns.some(p => typeof p === "string" ? lower === p || lower.startsWith(p) : p.test(lower))) {
    return { needsSearch: false, complexity: "simple" };
  }

  // Math, code, explanation, creative patterns — never need search
  const noSearchKeywords = [
    "calculate", "solve", "equation", "formula",
    "code", "program", "function", "python", "javascript", "html", "css",
    "explain", "বোঝাও", "ব্যাখ্যা", "কী হয়", "কি হয়",
    "write", "লিখো", "translate", "অনুবাদ",
    "summarize", "সারমর্ম", "list", "তালিকা",
    "how to", "কিভাবে", "step by step", "ধাপে ধাপে",
    "define", "সংজ্ঞা", "meaning", "মানে",
    "example", "উদাহরণ",
    "pattern", "fibbonacci", "factorial", "recursion",
    "essay", "paragraph", "letter", "application",
    "prompt", "system prompt",
    "shikkhok", "education", "শিক্ষক", "শেখো",
  ];
  if (noSearchKeywords.some(k => lower.includes(k))) {
    return { needsSearch: false, complexity: "simple" };
  }

  // Clear search signals — go direct to search
  const heavySearchPatterns = [
    "market analysis", "market research", "বাজার বিশ্লেষণ",
    "competitive analysis", "প্রতিযোগিতা",
    "legal", "regulation", "আইন", "নীতিমালা",
    "investment", "বিনিয়োগ", "stock", "শেয়ার",
    "detailed comparison", "বিস্তারিত তুলনা",
    "comprehensive", "সম্পূর্ণ",
    "research report", "গবেষণা প্রতিবেদন",
  ];
  if (heavySearchPatterns.some(p => lower.includes(p))) {
    return { needsSearch: true, complexity: "heavy" };
  }

  const standardSearchPatterns = [
    "today", "current", "recent", "latest", "now", "this year", "this month",
    "আজ", "এইমাত্র", "সাম্প্রতিক", "এখন", "এই বছর", "এই মাস",
    "price", "দাম", "cost", "খরচ",
    "weather", "আবহাওয়া", "মৌসুম",
    "news", "খবর", "সংবাদ",
    "rate", "রেট", "interest rate", "বৈঠার",
    "population", "জনসংখ্যা",
    "gdp", "inflation", "মুদ্রাস্ফীতি",
    "election", "নির্বাচন",
    "result", "রেজাল্ট", "exam result",
    "score", "স্কোর",
    "match", "খেলা", "cricket", "football",
    "campaign", "প্রচারণা",
    "launch", "রিলিজ",
    "release date", "মুক্তির তারিখ",
    "review", "রিভিউ",
    "recipe", "রেসিপি",
    "tourism", "পর্যটন",
    "visa", "ভিসা",
    "admission", "ভর্তি",
    "scholarship", "বৃত্তি",
    "job", "চাকরি", "recruitment", "নিয়োগ",
    "salary", "বেতন",
    "flight", "ফ্লাইট",
    "hotel", "হোটেল",
  ];
  if (standardSearchPatterns.some(p => lower.includes(p))) {
    return { needsSearch: true, complexity: "standard" };
  }

  // Default: assume no search needed (speed over completeness)
  return { needsSearch: false, complexity: "simple" };
}

async function classifySearch(message: string): Promise<SearchClassification> {
  // Fast pre-filter first
  const fast = fastClassify(message);
  if (fast !== null) return fast;

  const apiKey = getNextGeminiKey();
  if (!apiKey) return { needsSearch: false, complexity: "simple" };

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text:
          "Classify this user message for web search needs.\n" +
          "Reply with ONLY a JSON: {\"needsSearch\": true/false, \"complexity\": \"simple\"/\"standard\"/\"heavy\"}\n\n" +
          "Rules:\n" +
          "- needsSearch = false: General knowledge, math, explanations, coding help, creative writing, personal questions\n" +
          "- needsSearch = true, complexity = simple: Quick factual lookup (weather, time, simple price, single fact)\n" +
          "- needsSearch = true, complexity = standard: Current events, news, product comparison, recent developments\n" +
          "- needsSearch = true, complexity = heavy: Deep research needed — market analysis, detailed comparison, multi-faceted topics, legal/regulatory info, comprehensive guides\n\n" +
          "Consider: Does this need REAL-TIME data? Is it multi-faceted? Would a single source be enough or do we need cross-referencing?\n" +
          "Return ONLY the JSON object."
        }] },
        contents: [{ role: "user", parts: [{ text: message }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 50 },
      }),
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) return { needsSearch: false, complexity: "simple" };
    const data = await res.json();
    const text = (data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();

    // Parse JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        needsSearch: parsed.needsSearch === true,
        complexity: ["simple", "standard", "heavy"].includes(parsed.complexity) ? parsed.complexity : "standard",
      };
    }

    // Fallback: simple yes/no
    return { needsSearch: text.includes("true") || text.includes("yes"), complexity: "standard" };
  } catch {
    return { needsSearch: false, complexity: "simple" };
  }
}

function buildSearchPrompt(message: string, results: SearchResult[], complexity: "simple" | "standard" | "heavy"): string {
  const context = results
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.content}`)
    .join("\n\n");

  const sourceCount = results.length;
  const highQualityCount = results.filter(r => isHighQualityUrl(r.url)).length;

  let instructions = "";
  if (complexity === "heavy") {
    instructions =
      `This is a RESEARCH query requiring comprehensive analysis. You have ${sourceCount} sources (${highQualityCount} high-quality).\n` +
      `Cross-reference multiple sources. Cite sources using [1], [2] etc.\n` +
      `If sources conflict, mention the different viewpoints. Be thorough.\n` +
      `Present facts from sources — if information is insufficient, say so honestly rather than guessing.`;
  } else if (complexity === "standard") {
    instructions =
      `Use these ${sourceCount} sources to answer accurately. Cite sources using [1], [2] etc.\n` +
      `Prioritize recent and authoritative information. Respond in the user's language.`;
  } else {
    instructions =
      `Use these ${sourceCount} sources for a quick, direct answer. Cite using [1].\n` +
      `Keep it brief and to the point.`;
  }

  return (
    `${instructions}\n\n` +
    `SEARCH RESULTS:\n${context}\n\n` +
    `USER QUESTION: ${message}`
  );
}

/* ===== MEMORY ===== */

// Fetch stored user knowledge (personal, learning, preference, progress, context)
async function getUserMemory(userId: string): Promise<Record<string, string>> {
  try {
    const { data } = await supabase
      .from("user_memory")
      .select("category, key, value")
      .eq("user_id", userId)
      .order("confidence", { ascending: false });

    if (!data?.length) return {};
    const memory: Record<string, string> = {};
    for (const row of data) {
      memory[`${row.category}:${row.key}`] = row.value;
    }
    return memory;
  } catch {
    return {};
  }
}

// Get last few messages from user's most recent OTHER session (cross-session context)
async function getCrossSessionContext(userId: string, currentSessionId?: string | null): Promise<Array<{ role: string; content: string }>> {
  try {
    // Find user's most recent session that is NOT the current one
    const { data: sessions } = await supabase
      .from("chat_sessions")
      .select("id")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(5);

    if (!sessions?.length) return [];

    // Pick the most recent session that isn't the current one
    const otherSession = sessions.find(s => s.id !== currentSessionId);
    if (!otherSession) return [];

    // Get last 6 messages from that session (3 exchanges)
    const { data: rows } = await supabase
      .from("chat_history")
      .select("message, response")
      .eq("session_id", otherSession.id)
      .order("timestamp", { ascending: false })
      .limit(3);

    if (!rows?.length) return [];
    const history: Array<{ role: string; content: string }> = [];
    for (const row of rows.reverse()) {
      history.push({ role: "user", content: row.message });
      history.push({ role: "assistant", content: row.response });
    }
    return history;
  } catch {
    return [];
  }
}

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

// Extract key facts from a conversation and store in user_memory
// Also extracts topics and session summary in a single API call for efficiency
const MEMORY_EXTRACT_PROMPT =
  "Analyze this conversation turn and extract structured information.\n" +
  "Return ONLY a JSON object with THREE fields:\n\n" +
  "1. \"facts\": Array of user facts discovered. Each has category, key, value.\n" +
  "   - personal: name/class/age/location/occupation\n" +
  "   - learning: academic_level/strong_subject/weak_subject/topics_studied\n" +
  "   - preference: language/teaching_style/response_length\n" +
  "   - progress: what_mastered/what_struggles_with/current_mistakes\n" +
  "   - context: current_project/recent_question/deadline\n" +
  "   Rules: Only extract EXPLICITLY stated facts. Not guesses. Max 3 facts per turn.\n" +
  "   If user contradicts old memory, UPDATE the key with new value.\n\n" +
  "2. \"topics\": Array of academic/learning topics discussed this turn.\n" +
  "   Each has: topic (specific, e.g. 'quadratic equations' not just 'math'),\n" +
  "   coverage: 'introduced' (first time), 'practiced' (answering questions),\n" +
  "   'mastered' (got correct), 'struggled' (had difficulty)\n\n" +
  "3. \"summary\": ONE sentence (max 15 words) describing what this conversation turn was about.\n" +
  "   Example: \"User asked about Pythagorean theorem and solved 3 practice problems\"\n\n" +
  "Example output:\n" +
  "{\"facts\":[{\"category\":\"learning\",\"key\":\"weak_at\",\"value\":\"Algebra\"}],\n" +
  " \"topics\":[{\"topic\":\"Pythagorean theorem\",\"coverage\":\"practiced\"}],\n" +
  " \"summary\":\"Discussed Pythagorean theorem with practice problems\"}\n\n" +
  "If nothing notable, return: {\"facts\":[],\"topics\":[],\"summary\":\"\"}\n" +
  "Return ONLY the JSON object.";

interface ExtractedMemory {
  facts: Array<{ category: string; key: string; value: string }>;
  topics: Array<{ topic: string; coverage: string }>;
  summary: string;
}

async function extractUserMemory(userId: string, userMsg: string, aiResponse: string): Promise<ExtractedMemory | null> {
  try {
    const apiKey = getNextGeminiKey();
    if (!apiKey) return null;

    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: MEMORY_EXTRACT_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: `User: ${userMsg}\nAI: ${aiResponse}` }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 400 },
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const text = (data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();

    // Parse JSON object from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]) as ExtractedMemory;
    return parsed;
  } catch {
    return null;
  }
}

// Save extracted facts into user_memory (with deduplication)
async function saveFacts(userId: string, facts: Array<{ category: string; key: string; value: string }>): Promise<void> {
  for (const fact of facts.slice(0, 3)) {
    if (!fact.category || !fact.key || !fact.value) continue;
    // Skip noise: very short or generic values
    if (String(fact.value).length < 3) continue;
    // Skip generic categories that don't carry real info
    if (fact.key === "other" || fact.key === "general") continue;

    await supabase.rpc("upsert_user_memory", {
      p_user_id: userId,
      p_category: fact.category,
      p_key: fact.key,
      p_value: String(fact.value).slice(0, 500),
      p_confidence: 0.8,
    });
  }
}

// Save topic tracking
async function saveTopics(userId: string, topics: Array<{ topic: string; coverage: string }>): Promise<void> {
  for (const t of topics.slice(0, 5)) {
    if (!t.topic) continue;
    const topicSlug = t.topic.toLowerCase().trim().slice(0, 100);
    const coverage = ["introduced", "practiced", "mastered", "struggled"].includes(t.coverage)
      ? t.coverage : "practiced";

    // Upsert topic: increment mention count, update coverage
    try {
      const { data: existing } = await supabase
        .from("user_topics")
        .select("id, mention_count, coverage")
        .eq("user_id", userId)
        .eq("topic", topicSlug)
        .single();

      if (existing) {
        // Update existing topic
        const newCoverage = coverage === "struggled" ? "struggled"
          : coverage === "mastered" ? "mastered"
          : existing.coverage === "mastered" ? "mastered"
          : existing.coverage === "struggled" && coverage !== "mastered" ? "struggled"
          : coverage;

        await supabase
          .from("user_topics")
          .update({
            coverage: newCoverage,
            mention_count: existing.mention_count + 1,
            last_practiced: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("user_topics")
          .insert({
            user_id: userId,
            topic: topicSlug,
            coverage,
            mention_count: 1,
          });
      }
    } catch {
      // Best-effort
    }
  }
}

// Run smart pruning (low-confidence old entries, cap at 100)
async function pruneMemory(userId: string): Promise<void> {
  try {
    await supabase.rpc("prune_user_memory", { p_user_id: userId });
  } catch {
    // Best-effort
  }
}

// Build a knowledge context string from stored user memory + topics
function buildUserKnowledgePrompt(memory: Record<string, string>, topics?: Array<{ topic: string; coverage: string; mention_count: number }>): string {
  if (Object.keys(memory).length === 0 && (!topics || topics.length === 0)) return "";

  const personal = Object.entries(memory)
    .filter(([k]) => k.startsWith("personal:"))
    .map(([_, v]) => v)
    .join(", ");
  const learning = Object.entries(memory)
    .filter(([k]) => k.startsWith("learning:"))
    .map(([k, v]) => `${k.split(":")[1]}: ${v}`)
    .join(", ");
  const preferences = Object.entries(memory)
    .filter(([k]) => k.startsWith("preference:"))
    .map(([k, v]) => `${k.split(":")[1]}: ${v}`)
    .join(", ");
  const progress = Object.entries(memory)
    .filter(([k]) => k.startsWith("progress:"))
    .map(([k, v]) => `${k.split(":")[1]}: ${v}`)
    .join(", ");
  const context = Object.entries(memory)
    .filter(([k]) => k.startsWith("context:"))
    .map(([k, v]) => `${k.split(":")[1]}: ${v}`)
    .join(", ");

  let prompt = "\n\n═══ USER KNOWLEDGE (from past conversations) ═══\n";
  if (personal) prompt += `Personal: ${personal}\n`;
  if (learning) prompt += `Learning profile: ${learning}\n`;
  if (preferences) prompt += `Preferences: ${preferences}\n`;
  if (progress) prompt += `Progress: ${progress}\n`;
  if (context) prompt += `Recent context: ${context}\n`;

  // Add topic knowledge
  if (topics && topics.length > 0) {
    const struggled = topics.filter(t => t.coverage === "struggled").map(t => t.topic);
    const mastered = topics.filter(t => t.coverage === "mastered").map(t => t.topic);
    const practiced = topics.filter(t => t.coverage === "practiced").map(t => t.topic);

    if (struggled.length > 0) prompt += `Struggled with: ${struggled.join(", ")} — spend extra time here\n`;
    if (mastered.length > 0) prompt += `Mastered: ${mastered.join(", ")} — can skip basics\n`;
    if (practiced.length > 0) prompt += `Practiced: ${practiced.join(", ")} — reinforce if needed\n`;
  }

  prompt += "Use this knowledge to personalize your responses. Reference it naturally — don't list it back to the user.";

  return prompt;
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
    const isPdf = img?.mimeType === "application/pdf";
    const promptText = isPdf
      ? "এই PDF ডকুমেন্টটি মনোযোগ দিয়ে বিশ্লেষণ করো এবং ব্যবহারকারীর প্রশ্নের যথাযথ উত্তর বাংলায় দাও। সামারি, গুরুত্বপূর্ণ পয়েন্ট বা পরীক্ষার প্রশ্ন চাইলে সুন্দর ও প্রাঞ্জলভাবে ব্যাখ্যা করো।\n\nUser asked: " + message
      : "এই ছবিটি দেখো এবং বাংলায় বর্ণনা করো। পরীক্ষার প্রশ্ন হলে উত্তর বাংলায় দাও। অ্যানিমে/ছবি হলে বাংলায় বর্ণনা করো।\n\nUser asked: " + message;
    parts.push({ text: promptText });
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
    const {
      message: rawMessage,
      userId: bodyUserId,
      image,
      sessionId,
      mode,
      guestMemory,
      selectedClass,
      selectedSubject,
      selectedBookId,
      selectedChapterId,
      selectedChapterNumber,
      selectedChapterTitle,
    } = await req.json();

    if (!rawMessage?.trim()) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    /* ===== AUTH: Verify JWT from header, fall back to body userId ===== */
    const authUser = await verifyAuthUser(req);
    const userId = authUser?.id || bodyUserId || null;

    /* ===== SLASH COMMANDS ===== */
    const cmd = rawMessage.trim().toLowerCase();

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
        response: `CholoShikhi 1.0 — Active\nMemory: ${MEMORY_LIMIT} messages + persistent user knowledge`,
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

    /* ===== PROFANITY FILTER: Replace bad words with stars ===== */
    const message = filterProfanity(rawMessage.trim());

    /* ===== SUBSCRIPTION QUOTA CHECK ===== */
    if (userId && mode === "education") {
      const quota = await canSendMessage(userId, mode);
      if (!quota.allowed) {
        return NextResponse.json({
          error: quota.reason || "Shikkhok mode limit reached. Upgrade or redeem a code.",
          quotaExceeded: true,
        }, { status: 429 });
      }
    }

    /* ===== MEMORY (ALL DB QUERIES IN PARALLEL) ===== */
    let memory: Array<{ role: string; content: string }> = [];
    let userKnowledge = "";

    // Fire all DB queries at once — saves ~400-600ms
    const [sessionMemory, crossContext, userMemoryData, topicsData] = await Promise.all([
      // Session or full memory
      (userId && sessionId)
        ? supabase.from("chat_history").select("message, response").eq("session_id", sessionId).order("timestamp", { ascending: true }).limit(MEMORY_LIMIT).then(r => r.data || [])
        : userId
        ? supabase.from("chat_history").select("message, response").eq("user_id", userId).order("timestamp", { ascending: false }).limit(MEMORY_LIMIT).then(r => r.data || [])
        : Promise.resolve([]),
      // Cross-session context (only if user has session with few messages)
      (userId && sessionId)
        ? supabase.from("chat_sessions").select("id").eq("user_id", userId).order("updated_at", { ascending: false }).limit(5).then(async (r) => {
            const sessions = r.data || [];
            const otherSession = sessions.find((s: any) => s.id !== sessionId);
            if (!otherSession) return [];
            const msgs = await supabase.from("chat_history").select("message, response").eq("session_id", otherSession.id).order("timestamp", { ascending: false }).limit(3);
            return msgs.data || [];
          })
        : Promise.resolve([]),
      // User memory
      userId ? getUserMemory(userId) : Promise.resolve({}),
      // User topics
      userId ? supabase.from("user_topics").select("topic, coverage, mention_count").eq("user_id", userId).order("last_practiced", { ascending: false }).limit(20).then(r => r.data || []) : Promise.resolve([]),
    ]);

    // Assemble session memory
    if (userId && sessionId && sessionMemory.length > 0) {
      memory = sessionMemory.map((row: any) => [
        { role: "user", content: row.message },
        { role: "assistant", content: row.response },
      ]).flat();
      // Add cross-session context if session is young
      if (memory.length < 6 && crossContext.length > 0) {
        const crossHistory: Array<{ role: string; content: string }> = [];
        for (const row of crossContext) {
          crossHistory.push({ role: "user", content: row.message });
          crossHistory.push({ role: "assistant", content: row.response });
        }
        memory = [...crossHistory, { role: "user", content: "[Previous conversation context]" }, ...memory];
      }
    } else if (userId && !sessionId && sessionMemory.length > 0) {
      memory = sessionMemory.map((row: any) => [
        { role: "user", content: row.message },
        { role: "assistant", content: row.response },
      ]).flat();
    } else if (guestMemory && Array.isArray(guestMemory) && guestMemory.length > 0) {
      memory = guestMemory.slice(-MEMORY_LIMIT);
    }

    // Assemble user knowledge
    if (userId) {
      userKnowledge = buildUserKnowledgePrompt(userMemoryData, topicsData);
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
    // Inject user knowledge into system prompt
    if (userKnowledge) {
      activeSystemPrompt += userKnowledge;
    }

    // Grounded NCTB Textbook Knowledge Base (সপ্তবর্ণা — সপ্তম শ্রেণি বাংলা)
    const saptabarnaContext = findSaptabarnaContext(message);
    if (saptabarnaContext) {
      activeSystemPrompt += saptabarnaContext;
    }

    // Grounded NCTB Primary Textbooks Knowledge Base (১ম থেকে ৫ম শ্রেণি)
    const primaryContext = findPrimaryTextbookContext(message, memory);
    if (primaryContext) {
      activeSystemPrompt += primaryContext;
    }

    // Teacher Mode Locked Class & Subject Scope
    if (isEducation && (selectedClass || selectedSubject || selectedBookId)) {
      const classNum = selectedClass || 2;
      const classBooks = getBooksByClass(classNum);
      const book = selectedBookId
        ? getBookById(selectedBookId) || classBooks.find((b) => b.id === selectedBookId)
        : selectedSubject
        ? classBooks.find((b) => b.subject.includes(selectedSubject) || b.book_name.includes(selectedSubject))
        : classBooks[0];

      if (book) {
        const chapters = getChaptersByBookId(book.id);
        const totalLessons = book.total_chapters || book.table_of_contents?.length || chapters.length;
        activeSystemPrompt +=
          `\n\n═══ [TEACHER LOCKED SCOPE: ${book.class_name} — ${book.book_name}] ═══\n` +
          `[CRITICAL TEACHER INSTRUCTION:
1. You are the dedicated personal tutor exclusively for ${book.class_name} — "${book.book_name}".
2. The student has selected this specific subject. You MUST ONLY discuss, teach, explain, and solve problems from this specific book (${book.book_name}).
3. Total official lessons in 2026 NCTB curriculum: ঠিক ${totalLessons}টি পাঠ।
4. Official Table of Contents:
${book.table_of_contents?.map((t: string) => `- ${t}`).join("\n") || chapters.map((c: any) => `- পাঠ ${c.chapter_number}: ${c.chapter_title}`).join("\n")}
5. Teach using interactive, encouraging Bengali, step-by-step math/science explanations, ask check questions, and give small hints before revealing full answers!]\n`;

        // Specific Chapter Lock
        if (selectedChapterId || selectedChapterTitle || selectedChapterNumber) {
          const selectedCh = chapters.find(
            (c) =>
              c.chapter_id === selectedChapterId ||
              (selectedChapterTitle && c.chapter_title.toLowerCase().includes(selectedChapterTitle.toLowerCase())) ||
              c.chapter_number === selectedChapterNumber
          );

          if (selectedCh) {
            const chQuestions = getQuestionsByChapterId(selectedCh.chapter_id);
            activeSystemPrompt +=
              `\n\n🎯 [CURRENT LOCKED CHAPTER FOCUS: পাঠ ${selectedCh.chapter_number} — ${selectedCh.chapter_title}]\n` +
              `[STRICT CHAPTER INSTRUCTION:
- The student is specifically studying: "পাঠ ${selectedCh.chapter_number}: ${selectedCh.chapter_title}" (পৃষ্ঠা ${selectedCh.start_page}-${selectedCh.end_page}).
- Chapter Type: ${selectedCh.chapter_type}${selectedCh.author ? ` | লেখক: ${selectedCh.author}` : ""}
- Official Summary & Core Topic: ${selectedCh.summary}
${selectedCh.sections && selectedCh.sections.length > 0 ? `- 📑 পাঠের উপ-বিষয়বস্তু (Sections):\n${selectedCh.sections.map((s) => `  • [পৃষ্ঠা ${s.page}] ${s.title}`).join("\n")}` : ""}
${(selectedCh as any).illustrations && (selectedCh as any).illustrations.length > 0 ? `- 🖼️ পাঠ্যবইয়ের অফিসিয়াল চিত্রসমূহ (Illustrations):\n${(selectedCh as any).illustrations.map((img: any) => `  • [পৃষ্ঠা ${img.page}] ${img.description || img.title}`).join("\n")}` : ""}
${chQuestions.length > 0 ? `- 📋 অফিশিয়াল অনুশীলনী ও প্রশ্নাবলী (মোট ${chQuestions.length}টি প্রশ্ন):\n${chQuestions.map((q, qIdx) => `  ${qIdx + 1}. [${q.question_type}] ${q.question_number ? `${q.question_number} ` : ""}${q.original_text || q.instruction} (পৃষ্ঠা ${q.page_number})${q.options && q.options.length > 0 ? `\n     বিকল্পসমূহ: ${q.options.join(" | ")}` : ""}`).join("\n")}` : ""}
- STRICT PEDAGOGY & QUESTION RULE: 
1. When the student asks "এই অধ্যায়ে কি কি চিত্র আছে", "চিত্রগুলো কি কি", "ছবি কি কি দেওয়া আছে", you MUST detail the EXACT illustrations above with page numbers.
2. When the student asks "এই অধ্যায়ে কি কি প্রশ্ন আছে", "অনুশীলনী বের করে শোনাও", "প্রশ্নগুলো বলো", or asks for exercises/MCQs/questions, you MUST ONLY list the EXACT questions above under their respective sections (১. সঠিক উত্তর নির্বাচন, ২. শূন্যস্থান পূরণ, ৩. সংক্ষিপ্ত উত্তর প্রশ্ন, ৪. বর্ণনামূলক প্রশ্ন). DO NOT make up fake, generic, or old outdated curriculum questions!
3. When the student asks "এই চাপ্টার এ কি কি আছে সুন্দর করে বুঝাও", explain THIS EXACT LESSON (${selectedCh.chapter_title}), its core topics, concepts, authentic illustrations, and exact questions.]\n`;
          }
        }
      }
    }

    /* ===== WEB SEARCH (Normal Mode only) ===== */
    let searchResults: SearchResult[] = [];
    let searched = false;
    let searchComplexity: "simple" | "standard" | "heavy" = "standard";

    // ONLY use fast keyword filter — NO separate classify API call
    // This saves 3-5 seconds per request
    if (!isEducation && !image) {
      const fastResult = fastClassify(message);
      if (fastResult.needsSearch) {
        searchComplexity = fastResult.complexity;
        searchResults = await tavilySearch(message, searchComplexity);
        searched = searchResults.length > 0;
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
        return NextResponse.json(
          { error: "ছবি বিশ্লেষণে সমস্যা। আবার চেষ্টা করো।" },
          { status: 503 }
        );
      }
    } else {
      const hasGemini = !!getNextGeminiKey();
      const textMessage = searched ? buildSearchPrompt(message, searchResults, searchComplexity) : message;

      if (hasGemini) {
        try {
          response = await callGemini(textMessage, memory, undefined, activeSystemPrompt);
          usedProvider = "gemini";
        } catch (err: any) {
          if (err.message === "RATE_LIMITED") markKeyRateLimited(getGeminiKeys()[geminiKeyState.idx] || "");
        }
      }
      if (!response) {
        throw new Error("AI provider unavailable");
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
                response = "গবেষণা সম্পন্ন হয়েছে, কিন্তু plan generate করতে সমস্যা হয়েছে। আবার চেষ্টা করো।";
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

    /* ===== CLEAN RESPONSE: PRESERVE RICH MARKDOWN & KATEX, STRIP ONLY LEAKED JSON ===== */
    if (response) {
      // Strip any raw JSON codeblocks or leaked JSON objects
      response = response.replace(/```json[\s\S]*?```/g, "").trim();
      if (/^\{[\s\S]*\}$/.test(response) && response.includes('"action"')) {
        response = "আমি আপনার অনুরোধটি প্রসেস করেছি।";
      }
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

      // Increment teacher mode usage (non-blocking)
      if (isEducation) {
        incrementTeacherUsage(userId).catch(() => {});
      }

      // Extract and store user memory (best-effort, non-blocking)
      if (!isTaskPlan && response && message.trim().length > 10) {
        extractUserMemory(userId, message.trim(), response).then(async (extracted) => {
          if (extracted) {
            // Save facts, topics, and prune in parallel
            await Promise.all([
              extracted.facts.length > 0 ? saveFacts(userId, extracted.facts) : Promise.resolve(),
              extracted.topics.length > 0 ? saveTopics(userId, extracted.topics) : Promise.resolve(),
              pruneMemory(userId),
            ]);
          }
        }).catch(() => {});
      }
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
        searchComplexity,
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
