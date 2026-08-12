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
      macros: {
        "\\R": "\\mathbb{R}",
        "\\N": "\\mathbb{N}",
        "\\Z": "\\mathbb{Z}",
      },
    });
  } catch {
    // If KaTeX fails, return the raw LaTeX in a code tag
    return `<code class="text-red-400 text-[12px]">${latex}</code>`;
  }
}

// Parse text with LaTeX and return HTML string
function parseMathToHTML(text: string): string {
  // Protect LaTeX from any remaining HTML escaping
  const tokens: string[] = [];
  let result = text;

  // Block math: $$...$$ or \[...\]
  result = result.replace(/\$\$([\s\S]+?)\$\$/g, (_, latex) => {
    const html = renderKatex(latex.trim(), true);
    tokens.push(`<div class="katex-block my-3 overflow-x-auto text-center">${html}</div>`);
    return `%%MATH_${tokens.length - 1}%%`;
  });
  result = result.replace(/\\\[([\s\S]+?)\\\]/g, (_, latex) => {
    const html = renderKatex(latex.trim(), true);
    tokens.push(`<div class="katex-block my-3 overflow-x-auto text-center">${html}</div>`);
    return `%%MATH_${tokens.length - 1}%%`;
  });

  // Inline math: $...$ or \(...\)
  result = result.replace(/\$([^\$\n]+?)\$/g, (_, latex) => {
    const html = renderKatex(latex.trim(), false);
    tokens.push(`<span class="katex-inline">${html}</span>`);
    return `%%MATH_${tokens.length - 1}%%`;
  });
  result = result.replace(/\\\((.+?)\\\)/g, (_, latex) => {
    const html = renderKatex(latex.trim(), false);
    tokens.push(`<span class="katex-inline">${html}</span>`);
    return `%%MATH_${tokens.length - 1}%%`;
  });

  // Escape HTML for remaining plain text (but preserve newlines)
  result = result
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Convert line breaks to <br>
  result = result.replace(/\n/g, "<br>");

  // Restore math tokens
  for (let i = 0; i < tokens.length; i++) {
    result = result.replace(`%%MATH_${i}%%`, tokens[i]);
  }

  return result;
}

export default function RenderMessage({ text }: { text: string }) {
  const html = useMemo(() => parseMathToHTML(text), [text]);

  return (
    <span
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
