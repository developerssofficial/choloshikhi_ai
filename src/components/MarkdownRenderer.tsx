import { useState, useMemo } from "react";

interface MarkdownRendererProps {
  content: string;
}

// Parse inline formatting: bold, italic, code, links, strikethrough
function parseInline(text: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = [];
  // Regex for: **bold**, *italic*, `code`, ~~strike~~, [text](url)
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|~~(.+?)~~|\[(.+?)\]\((.+?)\))/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      // Bold
      parts.push(<strong key={key++} className="font-semibold text-white">{match[2]}</strong>);
    } else if (match[3]) {
      // Italic
      parts.push(<em key={key++} className="italic text-gray-300">{match[3]}</em>);
    } else if (match[4]) {
      // Inline code
      parts.push(
        <code key={key++} className="px-1.5 py-0.5 rounded-md bg-white/[0.08] text-purple-300 text-[13px] font-mono border border-white/[0.06]">
          {match[4]}
        </code>
      );
    } else if (match[5]) {
      // Strikethrough
      parts.push(<del key={key++} className="line-through text-gray-500">{match[5]}</del>);
    } else if (match[6] && match[7]) {
      // Link
      parts.push(
        <a key={key++} href={match[7]} target="_blank" rel="noopener noreferrer"
          className="text-purple-400 hover:text-purple-300 underline underline-offset-2 decoration-purple-400/30 hover:decoration-purple-300/50 transition-colors">
          {match[6]}
        </a>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

// Code block with copy button
function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-white/[0.08] bg-[#0d0d1a]">
      <div className="flex items-center justify-between px-4 py-2 bg-white/[0.03] border-b border-white/[0.06]">
        <span className="text-[11px] text-gray-500 font-mono">{language || "code"}</span>
        <button onClick={handleCopy}
          className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1">
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-[13px] leading-relaxed">
        <code className="text-gray-300 font-mono">{code}</code>
      </pre>
    </div>
  );
}

// Table renderer
function TableRenderer({ rows }: { rows: string[][] }) {
  if (rows.length === 0) return null;
  const header = rows[0];
  const body = rows.slice(2); // Skip separator row

  return (
    <div className="my-3 overflow-x-auto rounded-xl border border-white/[0.08]">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="bg-white/[0.04] border-b border-white/[0.06]">
            {header.map((cell, i) => (
              <th key={i} className="px-4 py-2.5 text-left font-semibold text-gray-300">{cell.trim()}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, i) => (
            <tr key={i} className="border-b border-white/[0.04] last:border-0">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2.5 text-gray-400">{cell.trim()}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const rendered = useMemo(() => {
    try {
      const lines = content.split("\n");
      const elements: JSX.Element[] = [];
      let i = 0;
      let key = 0;

      while (i < lines.length) {
        const line = lines[i];

        // Code block
        if (line.trim().startsWith("```")) {
          const lang = line.trim().slice(3).trim();
          const codeLines: string[] = [];
          i++;
          while (i < lines.length && !lines[i].trim().startsWith("```")) {
            codeLines.push(lines[i]);
            i++;
          }
          i++;
          elements.push(<CodeBlock key={key++} language={lang} code={codeLines.join("\n")} />);
          continue;
        }

        // Table
        if (line.includes("|") && i + 1 < lines.length && lines[i + 1].includes("---")) {
          const tableRows: string[][] = [];
          while (i < lines.length && lines[i].includes("|")) {
            tableRows.push(lines[i].split("|").filter(c => c.trim() !== ""));
            i++;
          }
          elements.push(<TableRenderer key={key++} rows={tableRows} />);
          continue;
        }

        // Headers
        const headerMatch = line.match(/^(#{1,6})\s+(.+)/);
        if (headerMatch) {
          const level = headerMatch[1].length;
          const sizes: Record<number, string> = {
            1: "text-xl font-bold text-white mt-6 mb-3",
            2: "text-lg font-semibold text-white mt-5 mb-2",
            3: "text-base font-semibold text-gray-200 mt-4 mb-2",
            4: "text-sm font-semibold text-gray-300 mt-3 mb-1",
            5: "text-sm font-medium text-gray-400 mt-3 mb-1",
            6: "text-xs font-medium text-gray-500 mt-2 mb-1",
          };
          const Tag = `h${level}` as keyof JSX.IntrinsicElements;
          elements.push(
            <Tag key={key++} className={sizes[level]}>
              {parseInline(headerMatch[2])}
            </Tag>
          );
          i++;
          continue;
        }

        // Blockquote
        if (line.trim().startsWith(">")) {
          const quoteLines: string[] = [];
          while (i < lines.length && lines[i].trim().startsWith(">")) {
            quoteLines.push(lines[i].trim().slice(1).trim());
            i++;
          }
          elements.push(
            <blockquote key={key++} className="my-3 pl-4 border-l-2 border-purple-500/40 text-gray-400 italic">
              {quoteLines.map((ql, qi) => (
                <p key={qi} className="mb-1">{parseInline(ql)}</p>
              ))}
            </blockquote>
          );
          continue;
        }

        // Unordered list
        if (line.match(/^\s*[-*]\s+/)) {
          const listItems: string[] = [];
          while (i < lines.length && lines[i].match(/^\s*[-*]\s+/)) {
            listItems.push(lines[i].replace(/^\s*[-*]\s+/, ""));
            i++;
          }
          elements.push(
            <ul key={key++} className="my-2 space-y-1 pl-1">
              {listItems.map((item, li) => (
                <li key={li} className="flex items-start gap-2 text-[14px] text-gray-300 leading-relaxed">
                  <span className="text-purple-400 mt-1.5 text-[6px]">●</span>
                  <span>{parseInline(item)}</span>
                </li>
              ))}
            </ul>
          );
          continue;
        }

        // Ordered list
        if (line.match(/^\s*\d+\.\s+/)) {
          const listItems: string[] = [];
          while (i < lines.length && lines[i].match(/^\s*\d+\.\s+/)) {
            listItems.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
            i++;
          }
          elements.push(
            <ol key={key++} className="my-2 space-y-1 pl-1">
              {listItems.map((item, li) => (
                <li key={li} className="flex items-start gap-2 text-[14px] text-gray-300 leading-relaxed">
                  <span className="text-purple-400 font-medium text-[13px] min-w-[18px]">{li + 1}.</span>
                  <span>{parseInline(item)}</span>
                </li>
              ))}
            </ol>
          );
          continue;
        }

        // Horizontal rule
        if (line.match(/^[-*_]{3,}$/)) {
          elements.push(<hr key={key++} className="my-4 border-white/[0.06]" />);
          i++;
          continue;
        }

        // Empty line
        if (line.trim() === "") {
          i++;
          continue;
        }

        // Regular paragraph
        const paraLines: string[] = [];
        while (i < lines.length && lines[i].trim() !== "" && !lines[i].trim().startsWith("#") && !lines[i].trim().startsWith("```") && !lines[i].trim().startsWith(">") && !lines[i].match(/^\s*[-*]\s+/) && !lines[i].match(/^\s*\d+\.\s+/) && !lines[i].match(/^[-*_]{3,}$/)) {
          paraLines.push(lines[i]);
          i++;
        }
        if (paraLines.length > 0) {
          elements.push(
            <p key={key++} className="text-[14px] text-gray-300 leading-relaxed mb-2">
              {parseInline(paraLines.join(" "))}
            </p>
          );
        }
      }

      return elements;
    } catch {
      // Fallback: render as plain text
      return <p className="text-[14px] text-gray-300 leading-relaxed whitespace-pre-wrap">{content}</p>;
    }
  }, [content]);

  return <div className="space-y-0">{rendered}</div>;
}
