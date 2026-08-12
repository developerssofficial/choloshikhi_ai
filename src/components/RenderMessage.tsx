"use client";

import { useMemo } from "react";
import katex from "katex";

function renderKatex(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      trust: true,
      strict: false,
    });
  } catch {
    return `<span style="color:#f87171;font-size:12px">[${latex}]</span>`;
  }
}

function parseMathToHTML(text: string): string {
  const tokens: string[] = [];
  let result = text;

  // Block math: $$...$$ or \[...\]
  result = result.replace(/\$\$([\s\S]+?)\$\$/g, (_, latex) => {
    tokens.push(`<div class="katex-block my-3 overflow-x-auto text-center">${renderKatex(latex.trim(), true)}</div>`);
    return `§§${tokens.length - 1}§§`;
  });
  result = result.replace(/\\\[([\s\S]+?)\\\]/g, (_, latex) => {
    tokens.push(`<div class="katex-block my-3 overflow-x-auto text-center">${renderKatex(latex.trim(), true)}</div>`);
    return `§§${tokens.length - 1}§§`;
  });

  // Inline math: \(...\) then $...$
  result = result.replace(/\\\((.+?)\\\)/g, (_, latex) => {
    tokens.push(`<span class="katex-inline">${renderKatex(latex.trim(), false)}</span>`);
    return `§§${tokens.length - 1}§§`;
  });
  result = result.replace(/\$([^\$\n]+?)\$/g, (_, latex) => {
    tokens.push(`<span class="katex-inline">${renderKatex(latex.trim(), false)}</span>`);
    return `§§${tokens.length - 1}§§`;
  });

  // Detect raw backslash patterns like \frac{a}{b} (without $ delimiters)
  result = result.replace(/(\\(?:frac|sqrt|sum|int|lim|sin|cos|tan|log|ln|exp|sup|inf|max|min|partial|nabla|infty|alpha|beta|gamma|delta|theta|pi|sigma|forall|exists|rightarrow|leftarrow|mathbb|mathrm|mathbf|text|leq|geq|neq|approx|equiv|times|div|cdot|pm|cup|cap|in|notin|subset|supset|Rightarrow|Leftarrow)\s*(?:\{[^{}]*\}|\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}|\([^()]*\)|\[[^\[\]]*\]))/g, (match) => {
    tokens.push(`<span class="katex-inline">${renderKatex(match.trim(), false)}</span>`);
    return `§§${tokens.length - 1}§§`;
  });

  // Escape HTML in remaining plain text
  result = result
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");

  // Restore all math tokens
  for (let i = 0; i < tokens.length; i++) {
    result = result.replace(`§§${i}§§`, tokens[i]);
  }

  return result;
}

export default function RenderMessage({ text }: { text: string }) {
  const html = useMemo(() => parseMathToHTML(text), [text]);

  return (
    <span dangerouslySetInnerHTML={{ __html: html }} />
  );
}
