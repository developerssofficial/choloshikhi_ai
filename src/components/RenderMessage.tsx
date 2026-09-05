"use client";

import { useMemo, useState } from "react";
import katex from "katex";

function renderKatex(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      trust: false,
      strict: false,
    });
  } catch {
    return `<span class="text-rose-400 font-mono text-xs">[Formula: ${latex}]</span>`;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const FLOWCHART_PALETTE = [
  { bg: "bg-[#3e3f44]", border: "border-[#585961]/80", shadow: "shadow-black/40" }, // 1. Dark Charcoal
  { bg: "bg-[#353673]", border: "border-[#4c4e9c]/80", shadow: "shadow-indigo-950/40" }, // 2. Indigo
  { bg: "bg-[#45377d]", border: "border-[#5d4ea8]/80", shadow: "shadow-purple-950/40" }, // 3. Royal Purple
  { bg: "bg-[#0e5241]", border: "border-[#18755d]/80", shadow: "shadow-emerald-950/40" }, // 4. Emerald Teal
  { bg: "bg-[#0d5947]", border: "border-[#137860]/80", shadow: "shadow-teal-950/40" }, // 5. Forest Teal
  { bg: "bg-[#7a3219]", border: "border-[#9f4526]/80", shadow: "shadow-orange-950/40" }, // 6. Rust Terracotta
  { bg: "bg-[#78350f]", border: "border-[#92400e]/80", shadow: "shadow-amber-950/40" }, // 7. Warm Bronze
];

function renderFlowchartCards(raw: string): string | null {
  const cleaned = raw.trim();
  let items: string[] = [];

  // Check if it's separated by arrow
  if (cleaned.includes("➔") || cleaned.includes("->") || cleaned.includes("-->")) {
    items = cleaned
      .split(/(?:➔|->|-->)/g)
      .map((s) => s.trim())
      .filter(Boolean);
  } else {
    items = cleaned
      .split(/\n+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("#") && !s.startsWith("//"));
  }

  if (items.length < 2) return null;

  const nodes: Array<{ title: string; desc: string }> = [];

  for (const item of items) {
    let clean = item.replace(/^\[+|\]+$/g, "").trim();
    if (!clean) continue;

    let title = clean;
    let desc = "";

    if (clean.includes("|")) {
      const parts = clean.split("|");
      title = parts[0].trim();
      desc = parts.slice(1).join("|").trim();
    } else if (clean.includes(" : ") || clean.includes(" - ")) {
      const parts = clean.split(/\s*(?::|-)\s*/);
      title = parts[0].trim();
      desc = parts.slice(1).join(" - ").trim();
    }

    nodes.push({ title, desc });
  }

  if (nodes.length < 2) return null;

  let html = `<div class="my-4 py-3 px-2 flex flex-col items-center justify-center w-full max-w-sm sm:max-w-md mx-auto">`;

  nodes.forEach((node, idx) => {
    const color = FLOWCHART_PALETTE[idx % FLOWCHART_PALETTE.length];
    
    // Add connector arrow before card (except first)
    if (idx > 0) {
      html += `
        <div class="flex items-center justify-center py-1.5 text-white/50">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      `;
    }

    html += `
      <div class="w-full ${color.bg} ${color.border} border rounded-2xl py-3 px-4 shadow-lg ${color.shadow} transition-all duration-200 hover:scale-[1.02] flex flex-col items-center justify-center text-center">
        <div class="font-bold text-[14.5px] leading-tight text-white tracking-wide drop-shadow-sm">
          ${escapeHtml(node.title)}
        </div>
        ${
          node.desc
            ? `<div class="text-[12px] leading-relaxed text-white/80 font-normal mt-1 text-center">
                ${escapeHtml(node.desc)}
              </div>`
            : ""
        }
      </div>
    `;
  });

  html += `</div>`;
  return html;
}

function parseMarkdownAndMath(rawText: string): string {
  if (!rawText) return "";

  const tokens: string[] = [];
  const pushToken = (html: string) => {
    tokens.push(html);
    return `§§TK_${tokens.length - 1}§§`;
  };

  let text = rawText;

  // 1. Code blocks ```lang\ncode\n```
  text = text.replace(/```([a-zA-Z0-9_\-#+]*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const cleanLang = (lang || "").trim().toLowerCase();

    // Check if flowchart or roadmap format
    if (cleanLang === "flowchart" || cleanLang === "roadmap" || code.includes("➔") || code.includes("[১.")) {
      const fcHtml = renderFlowchartCards(code);
      if (fcHtml) {
        return pushToken(fcHtml);
      }
    }

    const escapedCode = escapeHtml(code.replace(/\n$/, ""));
    const blockHtml = `
      <div class="my-3 rounded-xl border border-white/[0.08] bg-[#0c0c14] overflow-hidden shadow-lg group/code">
        <div class="flex items-center justify-between px-3.5 py-1.5 bg-white/[0.03] border-b border-white/[0.05] text-[11px] font-mono text-slate-400">
          <span class="uppercase font-semibold tracking-wider text-violet-400/90">${escapeHtml(cleanLang || "code")}</span>
          <button
            onclick="navigator.clipboard.writeText(decodeURIComponent('${encodeURIComponent(code.replace(/\n$/, ""))}')); this.innerText='কপি হয়েছে!'; setTimeout(() => this.innerText='কপি করুন', 2000)"
            class="text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
          >
            কপি করুন
          </button>
        </div>
        <pre class="p-3.5 text-xs text-slate-200 overflow-x-auto font-mono leading-relaxed selection:bg-violet-500/30"><code>${escapedCode}</code></pre>
      </div>
    `;
    return pushToken(blockHtml);
  });

  // 2. Math Block: $$...$$ or \[...\]
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, latex) => {
    return pushToken(`<div class="katex-block my-2 overflow-x-auto text-center">${renderKatex(latex.trim(), true)}</div>`);
  });
  text = text.replace(/\\\[([\s\S]+?)\\\]/g, (_, latex) => {
    return pushToken(`<div class="katex-block my-2 overflow-x-auto text-center">${renderKatex(latex.trim(), true)}</div>`);
  });

  // 3. Math Inline: \(...\) or $...$
  text = text.replace(/\\\((.+?)\\\)/g, (_, latex) => {
    return pushToken(`<span class="katex-inline">${renderKatex(latex.trim(), false)}</span>`);
  });
  text = text.replace(/\$([^\$\n]+?)\$/g, (_, latex) => {
    return pushToken(`<span class="katex-inline">${renderKatex(latex.trim(), false)}</span>`);
  });

  // 4. Detect raw backslash math patterns without delimiters (e.g. \frac{a}{b})
  text = text.replace(/(\\(?:frac|sqrt|sum|int|lim|sin|cos|tan|log|ln|exp|infty|alpha|beta|gamma|delta|pi|theta|sigma|pm|cdot|times|approx|leq|geq|neq)\s*(?:\{[^{}]*\}|\([^()]*\)|\[[^\[\]]*\])+)/g, (match) => {
    return pushToken(`<span class="katex-inline">${renderKatex(match.trim(), false)}</span>`);
  });

  // 5. Inline code `code`
  text = text.replace(/`([^`\n]+)`/g, (_, code) => {
    return pushToken(`<code class="inline-code">${escapeHtml(code)}</code>`);
  });

  // 6. Escape remaining plain text
  text = escapeHtml(text);

  // 7. Markdown Headings
  text = text.replace(/^### (.*$)/gim, '<h3 class="text-sm font-semibold text-violet-300 mt-3 mb-1.5 tracking-wide">$1</h3>');
  text = text.replace(/^## (.*$)/gim, '<h2 class="text-base font-bold text-white mt-4 mb-2 tracking-tight">$1</h2>');
  text = text.replace(/^# (.*$)/gim, '<h1 class="text-lg font-bold text-white mt-4 mb-2">$1</h1>');

  // 8. Markdown Bold & Italic
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>');
  text = text.replace(/__(.*?)__/g, '<strong class="font-semibold text-white">$1</strong>');
  text = text.replace(/\*(.*?)\*/g, '<em class="italic text-slate-300">$1</em>');

  // 9. Markdown Links [title](url)
  text = text.replace(/\[(.*?)\]\((https?:\/\/[^\s\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors">$1</a>');

  // 10. Markdown Blockquotes
  text = text.replace(/^\&gt;\s?(.*)$/gim, '<blockquote class="border-l-2 border-violet-500/50 pl-3 my-2 text-slate-300 italic text-[13px]">$1</blockquote>');

  // 11. Markdown Bullet / Numbered Lists
  text = text.replace(/^\s*[\-\*]\s+(.*)$/gim, '<div class="flex items-start gap-2 my-1 text-[13.5px] leading-relaxed"><span class="text-violet-400 select-none mt-1 text-xs">•</span><span>$1</span></div>');
  text = text.replace(/^\s*(\d+)\.\s+(.*)$/gim, '<div class="flex items-start gap-2 my-1 text-[13.5px] leading-relaxed"><span class="text-violet-400/80 font-mono text-xs select-none mt-0.5">$1.</span><span>$2</span></div>');

  // 12. Convert newlines to breaks (avoid double breaks inside lists/headings)
  text = text.replace(/\n\n+/g, '<div class="h-2"></div>');
  text = text.replace(/\n/g, "<br>");

  // 13. Restore tokens
  for (let i = 0; i < tokens.length; i++) {
    text = text.replace(`§§TK_${i}§§`, tokens[i]);
  }

  return text;
}

export default function RenderMessage({ text }: { text: string }) {
  const html = useMemo(() => parseMarkdownAndMath(text), [text]);

  return (
    <div
      className="prose-custom text-[13.5px] sm:text-[14px] leading-relaxed break-words overflow-hidden"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
