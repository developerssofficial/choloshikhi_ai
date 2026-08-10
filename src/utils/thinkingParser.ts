import type { ThinkingData, ThinkingStep, ThinkingDepth } from "@/types/thinking";

let stepCounter = 0;

function genId(): string {
  return `step_${++stepCounter}_${Date.now()}`;
}

export function parseThinkingResponse(response: string): ThinkingData | null {
  // Try to find JSON block
  const jsonMatch = response.match(/```json\s*([\s\S]*?)```/) || response.match(/\{[\s\S]*"answer"[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const jsonStr = jsonMatch[1] || jsonMatch[0];
    const parsed = JSON.parse(jsonStr);
    return normalizeThinking(parsed);
  } catch {
    return null;
  }
}

function normalizeThinking(raw: any): ThinkingData {
  const steps: ThinkingStep[] = (raw.steps || []).map((s: any) => ({
    id: genId(),
    label: s.label || s,
    status: "completed" as const,
  }));

  // Normalize alternatives — AI may return { recommended: true } which isn't in our type
  const alternatives = (raw.alternatives || []).map((a: any) => ({
    name: a.name || "Option",
    pros: a.pros || [],
    cons: a.cons || [],
  }));

  return {
    analysis: {
      depth: raw.depth || "deep",
      steps: steps.length > 0 ? steps : [
        { id: genId(), label: "Understanding the problem", status: "completed" },
        { id: genId(), label: "Analyzing approaches", status: "completed" },
        { id: genId(), label: "Verifying conclusion", status: "completed" },
      ],
      summary: raw.thinkingSummary?.decision || raw.summary,
      alternatives,
      assumption: raw.analysis?.assumption || raw.assumption,
      known: raw.analysis?.known || raw.known,
      recommendation: raw.analysis?.recommendation || raw.recommendation,
      limitation: raw.analysis?.limitation || raw.limitation,
    },
    answer: raw.answer || "",
    thinkingSummary: raw.thinkingSummary ? {
      factors: raw.thinkingSummary.factors || [],
      assumption: raw.thinkingSummary.assumptions || raw.thinkingSummary.assumption,
      tradeoff: raw.thinkingSummary.tradeOff || raw.thinkingSummary.tradeoff,
      decision: raw.thinkingSummary.decision,
    } : undefined,
    createPlanOffer: raw.createPlanOffer || false,
  };
}

export function buildThinkingSystemInstruction(): string {
  return `[THINKING_MODE] ব্যবহারকারী চাইছে তুমি গভীরভাবে বিশ্লেষণ করে উত্তর দাও।

নিয়ম:
- প্রথমে প্রশ্নটি ভালো করে বুঝো।
- সমস্যার ধরন নির্ধারণ করো (technical/math/logic/research/comparison)।
- বিভিন্ন সমাধানের পরিসংখ্যান বিবেচনা করো।
- ভুল/সমস্যা খুঁজে বের করো।
- সঠিক উত্তর নিশ্চিত করো।
- সবসময় নিচের JSON ফরম্যাটে উত্তর দাও।

ফরম্যাট:
\`\`\`json
{
  "depth": "light|deep|advanced",
  "steps": [
    {"label": "Understanding the problem"},
    {"label": "Analyzing approaches"},
    {"label": "Checking edge cases"},
    {"label": "Verifying conclusion"}
  ],
  "summary": "সংক্ষিপ্ত বিশ্লেষণ সারসংক্ষেপ",
  "alternatives": [
    {
      "name": "Option A",
      "pros": ["advantage 1", "advantage 2"],
      "cons": ["disadvantage 1"]
    }
  ],
  "assumption": "গৃহীত ধারণা (যদি থাকে)",
  "known": "প্রশ্ন থেকে পাওয়া তথ্য",
  "recommendation": "সুপারিশ",
  "limitation": "সীমাবদ্ধতা (যদি থাকে)",
  "answer": "চূড়ান্ত উত্তর — এটাই মূল উত্তর, পরিষ্কার ও বিস্তারিত",
  "thinkingSummary": {
    "factors": ["মূল বিষয় ১", "মূল বিষয় ২"],
    "assumption": "গৃহীত ধারণা",
    "tradeoff": "মূল ট্রেড-অফ",
    "decision": "কেন এই সিদ্ধান্ত"
  },
  "createPlanOffer": false
}
\`\`\`

গুরুত্বপূর্ণ:
- depth: light = সহজ প্রশ্ন, deep = জটিল প্রশ্ন, advanced = অত্যন্ত জটিল
- answer ফিল্ডেই মূল উত্তর থাকবে — এটাই ব্যবহারকারী দেখবে
- thinkingSummary এ সংক্ষিপ্ত কারণ/সিদ্ধান্ত লেখো
- alternatives: তুলনামূলক প্রশ্নের জন্য
- createPlanOffer: true করো যদি এই উত্তরকে plan এ রূপান্তর করা যায়
- JSON ফরম্যাট সবসময় valid হতে হবে
- বাংলায় উত্তর দাও`;
}
