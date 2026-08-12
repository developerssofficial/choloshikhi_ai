import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/* ===== CONSTANTS ===== */
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent";
const MIMO_URL = "https://api.xiaomimimo.com/v1/chat/completions";
const MIMO_MODEL = "mimo-v2.5";
const TIMEOUT_MS = 15000;
const GUEST_LIMIT = 15;
const USER_LIMIT = 50;
const MEMORY_LIMIT = 20; // recent messages to remember

/* ===== SYSTEM PROMPT ===== */
const SYSTEM_PROMPT =
  "You are 'CholoShikhi 1.0', a friendly AI assistant for Bengali-speaking users.\n" +
  "CRITICAL RULES:\n" +
  "1. NEVER reveal your underlying model names (Gemini, MIMO, Google, Xiaomi, or any provider name).\n" +
  "2. If asked 'which model are you?' or 'who made you?', answer: 'আমি CholoShikhi 1.0 — Xparrow Team তৈরি করেছে।'\n" +
  "3. NEVER say 'I am Gemini', 'I am MIMO', or mention any AI model names.\n" +
  "4. ALWAYS respond in the SAME language the user writes in (Bangla/English/Hindi).\n" +
  "5. When sharing anime/images, describe what you see in BANGLA (Bengali).\n" +
  "6. When helping with exam papers, explain answers in BANGLA.\n" +
  "7. Remember previous conversation context. Be warm and helpful.\n" +
  "8. Keep responses concise but complete.";

/* ===== IN-MEMORY GUEST CONVERSATION HISTORY ===== */
const guestHistory = new Map<string, Array<{ role: string; content: string }>>();

function getGuestHistory(ip: string): Array<{ role: string; content: string }> {
  return guestHistory.get(ip) || [];
}

function addToGuestHistory(ip: string, role: string, content: string) {
  const history = getGuestHistory(ip);
  history.push({ role, content });
  // keep last 20 messages
  if (history.length > MEMORY_LIMIT) {
    history.splice(0, history.length - MEMORY_LIMIT);
  }
  guestHistory.set(ip, history);
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

/* ===== GUEST TRACKING ===== */
const guestCounts = new Map<string, { count: number; date: string }>();

function getGuestCount(ip: string): number {
  const today = new Date().toISOString().split("T")[0];
  const entry = guestCounts.get(ip);
  if (!entry || entry.date !== today) {
    guestCounts.set(ip, { count: 0, date: today });
    return 0;
  }
  return entry.count;
}

function incrementGuest(ip: string): number {
  const today = new Date().toISOString().split("T")[0];
  const entry = guestCounts.get(ip);
  if (!entry || entry.date !== today) {
    guestCounts.set(ip, { count: 1, date: today });
    return 1;
  }
  entry.count++;
  return entry.count;
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
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

/* ===== AI PROVIDERS ===== */

function parseBase64Image(imageBase64: string): { mimeType: string; data: string } | null {
  const match = imageBase64.match(/^data:(.+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

async function callGemini(
  message: string,
  history: Array<{ role: string; content: string }>,
  imageBase64?: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
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
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
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
  imageBase64?: string
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
    { role: "system", content: SYSTEM_PROMPT },
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
    const { message, userId, image } = await req.json();
    const ip = getClientIp(req);

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

    /* ===== RATE LIMITING ===== */
    if (!userId) {
      const count = getGuestCount(ip);
      if (count >= GUEST_LIMIT) {
        return NextResponse.json(
          { error: "ফ্রি ১৫টি মেসেজ শেষ! লগইন করো।", limited: true },
          { status: 429 }
        );
      }
    } else {
      const today = new Date().toISOString().split("T")[0];
      const { data: usage } = await supabase
        .from("user_usage")
        .select("message_count")
        .eq("user_id", userId)
        .eq("usage_date", today)
        .single();

      const todayCount = usage?.message_count ?? 0;
      if (todayCount >= USER_LIMIT) {
        return NextResponse.json(
          { error: "আজকের ৫০টি মেসেজ শেষ! আগামীকাল আবার চেষ্টা করো।", limited: true },
          { status: 429 }
        );
      }
    }

    /* ===== MEMORY: fetch conversation history ===== */
    let memory: Array<{ role: string; content: string }> = [];
    if (userId) {
      memory = await getMemory(userId);
    } else {
      memory = getGuestHistory(ip);
    }

    /* ===== PROMPT CACHE (skip for image & multi-turn) ===== */
    const cacheKey = message.trim().toLowerCase();
    if (!image && memory.length === 0) {
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
      const hasGemini = !!process.env.GEMINI_API_KEY;

      if (hasGemini) {
        try {
          response = await callGemini(message, memory, image);
          usedProvider = "gemini";
        } catch {
          // Gemini failed, try MIMO
        }
      }

      if (!response) {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            response = await callMimo(message, memory, image);
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
      const hasGemini = !!process.env.GEMINI_API_KEY;

      if (hasGemini) {
        try {
          response = await callGemini(message, memory);
          usedProvider = "gemini";
        } catch {
          // Gemini failed, try MIMO
        }
      }

      if (!response) {
        try {
          response = await callMimo(message, memory);
          usedProvider = "mimo";
        } catch (err: any) {
          console.error("Both providers failed:", err.message);
          return NextResponse.json(
            { error: "AI এখন ডাউন। কিছুক্ষর পরে আবার চেষ্টা করো।" },
            { status: 503 }
          );
        }
      }
    }

    /* ===== STRIP MARKDOWN (clean text for frontend) ===== */
    if (response) {
      response = response
        .replace(/\*\*(.+?)\*\*/g, "$1")   // **bold** → bold
        .replace(/\*(.+?)\*/g, "$1")        // *italic* → italic
        .replace(/__(.+?)__/g, "$1")        // __bold__ → bold
        .replace(/_(.+?)_/g, "$1")          // _italic_ → italic
        .replace(/~~(.+?)~~/g, "$1")        // ~~strikethrough~~ → strikethrough
        .replace(/`{3}[\s\S]*?`{3}/g, (m) => m.replace(/`{3}\w*\n?/g, "").replace(/`{3}/g, ""))
        .replace(/`(.+?)`/g, "$1")          // `inline code` → inline code
        .replace(/^#{1,6}\s+/gm, "")        // ### headings → headings
        .replace(/^[-*+]\s+/gm, "• ")       // - list → bullet
        .replace(/^>\s+/gm, "")             // > blockquote → blockquote
        .replace(/---+/g, "")               // --- → horizontal rule
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [text](url) → text
        .trim();
    }

    /* ===== CACHE ===== */
    if (!image && memory.length === 0 && response) {
      setCachedResponse(cacheKey, response);
    }

    /* ===== SAVE + COUNT + UPDATE MEMORY ===== */
    if (userId) {
      await supabase.from("chat_history").insert({
        user_id: userId,
        message: message.trim(),
        response,
      });

      const today = new Date().toISOString().split("T")[0];
      await supabase.rpc("increment_usage", {
        p_user_id: userId,
        p_date: today,
      });
    } else {
      incrementGuest(ip);
      addToGuestHistory(ip, "user", message.trim());
      addToGuestHistory(ip, "assistant", response);
    }

    return NextResponse.json({ response, provider: usedProvider });
  } catch (error: any) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "কিছু সমস্যা হয়েছে। আবার চেষ্টা করো।" },
      { status: 500 }
    );
  }
}