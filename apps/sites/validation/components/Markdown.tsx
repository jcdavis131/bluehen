/** Minimal, dependency-free markdown renderer for the org's own trusted
 * documents (headings, tables, lists, blockquotes, bold, inline code,
 * links). Copied from apps/hq/components/Markdown.tsx — apps do not import
 * across app boundaries. Content is repo-authored — not user input — so
 * this renders text, never HTML passthrough. */

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
      // Only relative, http(s), or mailto targets — never javascript:/data:.
      if (m && /^(\/|#|https?:|mailto:)/i.test(m[2].trim())) {
        parts.push(<a key={`${key}-${i}`} href={m[2]}>{m[1]}</a>);
      } else parts.push(tok);
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
      let rowIdx = 0;
      while (i < lines.length && lines[i].startsWith("|")) {
        const cells = lines[i].split("|").slice(1, -1).map((c) => c.trim());
        // Drop only the header separator row (|---|---|), not data rows
        // that happen to be all dashes (e.g. "-" placeholder cells).
        const isSeparator = rowIdx === 1 && cells.every((c) => /^:?-+:?$/.test(c));
        if (!isSeparator) rows.push(cells);
        rowIdx++;
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

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ""));
        i++;
      }
      out.push(
        <ol key={k++} className="bh-card__body">
          {items.map((it, ii) => <li key={ii}>{inline(it, k + ii)}</li>)}
        </ol>,
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

    if (line.startsWith(">")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        const text = lines[i].replace(/^>\s?/, "");
        if (text.trim()) buf.push(text);
        i++;
      }
      out.push(
        <blockquote
          key={k++}
          className="bh-card__body"
          style={{
            margin: 0,
            paddingLeft: "var(--bh-space-3)",
            borderLeft: "2px solid var(--bh-border)",
          }}
        >
          {inline(buf.join(" "), k)}
        </blockquote>,
      );
      continue;
    }

    // paragraph: absorb consecutive non-empty non-structural lines
    const buf: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#|\||[-*]\s|```|>|\s*\d+[.)]\s)/.test(lines[i])
    ) {
      buf.push(lines[i]); i++;
    }
    // Structural-looking line no branch consumed (e.g. "#####" beyond h4, or
    // "#tag" with no space): take it as paragraph text so i always advances.
    if (buf.length === 0) { buf.push(line); i++; }
    out.push(<p key={k++} className="bh-card__body">{inline(buf.join(" "), k)}</p>);
  }

  return <>{out}</>;
}
