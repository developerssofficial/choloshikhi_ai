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
    const cleanLang = lang?.trim() || "code";
    const escapedCode = escapeHtml(code.replace(/\n$/, ""));
    const blockHtml = `
      <div class="my-3 rounded-xl border border-white/[0.08] bg-[#0c0c14] overflow-hidden shadow-lg group/code">
        <div class="flex items-center justify-between px-3.5 py-1.5 bg-white/[0.03] border-b border-white/[0.05] text-[11px] font-mono text-slate-400">
          <span class="uppercase font-semibold tracking-wider text-violet-400/90">${escapeHtml(cleanLang)}</span>
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
