"use client";

import { useEffect, useRef, useState } from "react";
import { BOARD_EMPTY_LINE, BOARD_TITLE, WIKI_BASE_URL, type CabinetLink } from "./engine/content";

export type WikiPageSummary = {
  slug: string;
  kind: string;
  title: string;
  description: string | null;
};

export type WikiPageDetail = WikiPageSummary & { bodyMd: string };

export type DialogView =
  | { kind: "intro"; body: string }
  | { kind: "text"; title: string; body: string }
  | { kind: "cabinet"; data: CabinetLink }
  | { kind: "courthouse" }
  | { kind: "board"; loading: boolean; error: string | null; lines: string[] }
  | { kind: "wiki-list"; loading: boolean; error: string | null; pages: WikiPageSummary[] }
  | { kind: "wiki-page"; loading: boolean; error: string | null; page: WikiPageDetail | null };

const TYPE_SPEED_MS = 16;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Typewriter reveal for a single body string. Instant under
 * prefers-reduced-motion; otherwise reveals a character at a time and
 * can be skipped by calling `complete()` (e.g. on the next action press). */
function useTypewriter(text: string): { shown: string; done: boolean; complete: () => void } {
  const [shown, setShown] = useState("");
  const doneRef = useRef(false);
  const [, force] = useState(0);

  useEffect(() => {
    doneRef.current = false;
    if (prefersReducedMotion() || text.length === 0) {
      setShown(text);
      doneRef.current = true;
      return;
    }
    setShown("");
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) {
        doneRef.current = true;
        clearInterval(id);
      }
    }, TYPE_SPEED_MS);
    return () => clearInterval(id);
  }, [text]);

  return {
    shown,
    done: doneRef.current,
    complete: () => {
      setShown(text);
      doneRef.current = true;
      force((n) => n + 1);
    },
  };
}

function TypedBody({ text }: { text: string }) {
  const { shown } = useTypewriter(text);
  return <p className="ow-dialog-body">{shown}</p>;
}

export function DialogBox({
  view,
  onClose,
  onSelectWikiPage,
  onBackToWikiList,
}: {
  view: DialogView;
  onClose: () => void;
  onSelectWikiPage: (slug: string) => void;
  onBackToWikiList: () => void;
}) {
  return (
    <div className="ow-dialog" role="dialog" aria-live="polite">
      {view.kind === "intro" && (
        <>
          <span className="ow-dialog-title">The Overworld</span>
          <TypedBody text={view.body} />
          <DialogFooter onClose={onClose} label="Begin →" />
        </>
      )}

      {view.kind === "text" && (
        <>
          <span className="ow-dialog-title">{view.title}</span>
          <TypedBody text={view.body} />
          <DialogFooter onClose={onClose} />
        </>
      )}

      {view.kind === "cabinet" && (
        <>
          <span className="ow-dialog-title">{view.data.title}</span>
          <TypedBody text={view.data.body} />
          <div className="ow-dialog-actions">
            <a className="bh-btn bh-btn--primary bh-btn--sm" href={view.data.href} target="_blank" rel="noreferrer">
              {view.data.label}
            </a>
            <button type="button" className="bh-btn bh-btn--ghost bh-btn--sm" onClick={onClose}>
              Never mind
            </button>
          </div>
        </>
      )}

      {view.kind === "courthouse" && (
        <>
          <span className="ow-dialog-title">The Courthouse</span>
          <TypedBody text="Order in the lab. Step inside to judge a real retrieval pair yourself." />
          <div className="ow-dialog-actions">
            <a className="bh-btn bh-btn--primary bh-btn--sm" href="/verdict">
              Enter the Courthouse →
            </a>
            <button type="button" className="bh-btn bh-btn--ghost bh-btn--sm" onClick={onClose}>
              Not yet
            </button>
          </div>
        </>
      )}

      {view.kind === "board" && (
        <>
          <span className="ow-dialog-title">{BOARD_TITLE}</span>
          {view.loading && <p className="ow-dialog-body">Reading the board…</p>}
          {!view.loading && view.error && <p className="ow-dialog-body">{BOARD_EMPTY_LINE}</p>}
          {!view.loading && !view.error && view.lines.length === 0 && (
            <p className="ow-dialog-body">{BOARD_EMPTY_LINE}</p>
          )}
          {!view.loading && !view.error && view.lines.length > 0 && (
            <ul className="ow-dialog-list">
              {view.lines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          )}
          <DialogFooter onClose={onClose} />
        </>
      )}

      {view.kind === "wiki-list" && (
        <>
          <span className="ow-dialog-title">Worldbook Terminal</span>
          {view.loading && <p className="ow-dialog-body">Connecting to the worldbook…</p>}
          {!view.loading && view.error && <p className="ow-dialog-body">The terminal is offline right now.</p>}
          {!view.loading && !view.error && view.pages.length === 0 && (
            <p className="ow-dialog-body">No pages on record yet.</p>
          )}
          {!view.loading && !view.error && view.pages.length > 0 && (
            <div className="ow-dialog-list ow-dialog-list--buttons">
              {view.pages.slice(0, 8).map((p) => (
                <button
                  key={p.slug}
                  type="button"
                  className="bh-btn bh-btn--chip"
                  onClick={() => onSelectWikiPage(p.slug)}
                >
                  {p.title}
                </button>
              ))}
            </div>
          )}
          <DialogFooter onClose={onClose} />
        </>
      )}

      {view.kind === "wiki-page" && (
        <>
          <span className="ow-dialog-title">{view.page?.title ?? "Worldbook page"}</span>
          {view.loading && <p className="ow-dialog-body">Loading page…</p>}
          {!view.loading && view.error && <p className="ow-dialog-body">Couldn't load that page.</p>}
          {!view.loading && !view.error && view.page && (
            <>
              <TypedBody text={view.page.description ?? "No description on record."} />
              <div className="ow-dialog-actions">
                <a
                  className="bh-btn bh-btn--primary bh-btn--sm"
                  href={`${WIKI_BASE_URL}/${view.page.slug}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Read the full page →
                </a>
                <button type="button" className="bh-btn bh-btn--ghost bh-btn--sm" onClick={onBackToWikiList}>
                  ← Back
                </button>
              </div>
            </>
          )}
          {!view.loading && (
            <button type="button" className="ow-dialog-close" onClick={onClose}>
              Close (Space)
            </button>
          )}
        </>
      )}
    </div>
  );
}

function DialogFooter({ onClose, label = "Close (Space)" }: { onClose: () => void; label?: string }) {
  return (
    <button type="button" className="ow-dialog-close" onClick={onClose}>
      {label}
    </button>
  );
}
