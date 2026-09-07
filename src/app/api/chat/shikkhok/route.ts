import { NextRequest, NextResponse } from "next/server";
import { getPageContext } from "@/lib/nctbPageRegistry";
import { filterProfanity } from "@/lib/profanityFilter";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const TIMEOUT_MS = 25000;

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pageId, userMessage, imageBase64, history = [] } = body;

    const sanitizedMessage = filterProfanity(userMessage || "");

    // Retrieve deterministic NCTB page & chapter context
    const pageData = await getPageContext(pageId || "cls4_math_p38");

    const classNum = pageData?.classNum || 4;
    const subject = pageData?.subject || "প্রাথমিক গণিত";
    const chapterNo = pageData?.chapterNo || 1;
    const chapterTitle = pageData?.chapterTitle || "গাণিতিক বাক্য ও নিয়ম";
    const pageNumber = pageData?.pageNumber || 38;
    const pageType = pageData?.pageType || "exercise";
    const curriculumRules = pageData?.chapterContext?.curriculumRules || "Class 4 arithmetic unitary method, no algebraic variables.";
    const coreConcepts = pageData?.chapterContext?.coreConcepts?.join(", ") || "প্যাটার্ন, বিয়োগ ও যোগ";

    // System prompt construction
    const systemPrompt = `Role: NCTB Shikkhok (Socratic AI Tutor)
Target Grade: Class ${classNum}, Subject: ${subject}
Current Focus: Chapter ${chapterNo} - "${chapterTitle}" (Page ${pageNumber})
Page Classification: ${pageType}

[STRICT CHAPTER CURRICULUM BOUNDARIES]:
${curriculumRules}
Key Rules/Theorems: ${coreConcepts}

[PEDAGOGICAL INSTRUCTIONS]:
1. The student is asking about the textbook page (Page ${pageNumber}).
2. Answer STRICTLY using the methods taught in this specific chapter. Under no circumstance use out-of-syllabus methods (e.g. high-school algebra for primary school arithmetic).
3. Never hand out the direct answer on step 1. Ask guiding questions (Socratic method) to nudge the student to the next step.
4. Use Bengali language with friendly, encouraging tone. Render all math formulas using KaTeX ($...$ or $$...$$).
5. Always address the student warmly as 'সোনামণি' or 'প্রিয় শিক্ষার্থী'.`;

    // Prepare message contents for Gemini Vision / Chat
    const parts: any[] = [{ text: sanitizedMessage || "এই পৃষ্ঠার বিষয়বস্তু বুঝিয়ে বলো।" }];

    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      parts.push({
        inlineData: {
          mimeType: "image/png",
          data: cleanBase64,
        },
      });
    }

    const contents: any[] = [];
    
    // Append conversation history
    if (Array.isArray(history) && history.length > 0) {
      history.slice(-6).forEach((h: any) => {
        if (h.role && h.content) {
          contents.push({
            role: h.role === "assistant" ? "model" : "user",
            parts: [{ text: h.content }],
          });
        }
      });
    }

    contents.push({ role: "user", parts });

    const apiKey = getNextGeminiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API Key missing or limit exceeded." },
        { status: 500 }
      );
    }

    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 2048,
        },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!geminiRes.ok) {
      if (geminiRes.status === 429) {
        markKeyRateLimited(apiKey);
      }
      const errData = await geminiRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: errData?.error?.message || `Gemini API returned status ${geminiRes.status}` },
        { status: geminiRes.status }
      );
    }

    const data = await geminiRes.json();
    const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "পড়াশোনায় সাহায্য করতে আমি প্রস্তুত। তোমার যেকোনো সমস্যা বলো!";

    return NextResponse.json({
      success: true,
      pageData,
      reply: replyText,
    });
  } catch (error: any) {
    console.error("[Shikkhok API Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
