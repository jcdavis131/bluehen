/** Minimal, dependency-free markdown renderer for the org's own trusted
 * documents (headings, tables, lists, bold, inline code, links). Content
 * is repo-authored — not user input — so this renders text, never HTML
 * passthrough. */

import React from "react";

function inline(text: string, key: number): React.ReactNode {
  const parts: React.ReactNode[] = [];
  // order: code, bold, link
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
  tokens.forEach((tok, i) => {
    if (!tok) return;
    if (tok.startsWith("`") && tok.endsWith("`")) {
      parts.push(<code key={`${key}-${i}`}>{tok.slice(1, -1)}</code>);
    } else if (tok.startsWith("**") && tok.endsWith("**")) {
      parts.push(<strong key={`${key}-${i}`}>{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith("[")) {
      const m = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (m) parts.push(<a key={`${key}-${i}`} href={m[2]}>{m[1]}</a>);
      else parts.push(tok);
    } else {
      parts.push(tok);
    }
  });
  return parts;
}

export function Markdown({ source }: { source: string }) {
  const lines = source.split(/\r?\n/);
  const out: React.ReactNode[] = [];
  let i = 0;
  let k = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (/^\s*$/.test(line)) { i++; continue; }

    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const Tag = (`h${Math.min(level + 2, 6)}`) as keyof React.JSX.IntrinsicElements;
      out.push(<Tag key={k++} className="bh-card__title">{inline(h[2], k)}</Tag>);
      i++; continue;
    }

    if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        const cells = lines[i].split("|").slice(1, -1).map((c) => c.trim());
        if (!cells.every((c) => /^:?-+:?$/.test(c))) rows.push(cells);
        i++;
      }
      out.push(
        <div key={k++} className="bh-table-wrap">
          <table className="bh-table">
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>
                  {r.map((c, ci) =>
                    ri === 0 ? <th key={ci}>{inline(c, k)}</th> : <td key={ci}>{inline(c, k)}</td>,
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      out.push(
        <ul key={k++} className="bh-card__body">
          {items.map((it, ii) => <li key={ii}>{inline(it, k + ii)}</li>)}
        </ul>,
      );
      continue;
    }

    if (line.startsWith("```")) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) { buf.push(lines[i]); i++; }
      i++;
      out.push(<pre key={k++} className="bh-pre-result" style={{ overflowX: "auto" }}>{buf.join("\n")}</pre>);
      continue;
    }

    if (line.startsWith(">")) { i++; continue; } // skip blockquote chrome

    // paragraph: absorb consecutive non-empty non-structural lines
    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#|\||[-*]\s|```|>)/.test(lines[i])) {
      buf.push(lines[i]); i++;
    }
    out.push(<p key={k++} className="bh-card__body">{inline(buf.join(" "), k)}</p>);
  }

  return <>{out}</>;
}
