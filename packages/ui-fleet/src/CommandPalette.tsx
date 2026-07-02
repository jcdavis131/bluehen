"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface PaletteItem {
  label: string;
  hint?: string;
  href: string;
}

/** ⌘K / Ctrl+K command palette — keyboard-first navigation across the
 * fleet. Filterable listbox; Arrow/Enter/Escape; visible focus; no
 * portal dependencies. */
export function CommandPalette({ items }: { items: PaletteItem[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (it) =>
        it.label.toLowerCase().includes(q) || it.hint?.toLowerCase().includes(q),
    );
  }, [items, query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setCursor(0);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const go = (item: PaletteItem | undefined) => {
    if (!item) return;
    close();
    window.location.assign(item.href);
  };

  return (
    <div
      className="bh-palette__overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="bh-palette" role="dialog" aria-modal="true" aria-label="Command palette">
        <input
          ref={inputRef}
          className="bh-palette__input"
          placeholder="Jump to… (site, page, action)"
          value={query}
          role="combobox"
          aria-expanded="true"
          aria-controls="bh-palette-list"
          aria-activedescendant={filtered[cursor] ? `bh-palette-opt-${cursor}` : undefined}
          onChange={(e) => {
            setQuery(e.target.value);
            setCursor(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setCursor((c) => Math.min(c + 1, filtered.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setCursor((c) => Math.max(c - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              go(filtered[cursor]);
            }
          }}
        />
        <ul id="bh-palette-list" className="bh-palette__list" role="listbox" aria-label="Destinations">
          {filtered.length === 0 && (
            <li className="bh-palette__empty bh-muted">No matches.</li>
          )}
          {filtered.map((it, i) => (
            <li
              key={it.href + it.label}
              id={`bh-palette-opt-${i}`}
              role="option"
              aria-selected={i === cursor}
              className={`bh-palette__item${i === cursor ? " is-active" : ""}`}
              onMouseEnter={() => setCursor(i)}
              onClick={() => go(it)}
            >
              <span>{it.label}</span>
              {it.hint && <span className="bh-palette__hint bh-mono">{it.hint}</span>}
            </li>
          ))}
        </ul>
        <div className="bh-palette__footer bh-muted">
          ↑↓ navigate · Enter open · Esc close
        </div>
      </div>
    </div>
  );
}
