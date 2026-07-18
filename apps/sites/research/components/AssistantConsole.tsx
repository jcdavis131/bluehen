"use client";
import { useEffect, useRef, useState } from "react";

// Dottie assistant console (spec 15 §5.2). Telemetry-first: it reads the
// published assistant_status.json (capabilities, trust policy, tool catalog,
// telemetry rollup, authentic demo) from the same GitHub-raw pipeline the
// Dottie control plane uses, and offers a chat box wired to /api/assistant
// (live when a tunnel is configured, otherwise the published demo transcript).

const RAW_BASE = "https://raw.githubusercontent.com/jcdavis131/ava-agi-factory-v6-4/main";

type Tool = { name: string; signature?: string; description?: string; sandboxed?: string };
type Step = { thought?: string; action?: string | null; observation?: string | null; gate?: string };
type Status = any;

type Msg = { role: "user" | "assistant"; content: string; steps?: Step[]; mode?: string };

export default function AssistantConsole() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const r = await fetch(`${RAW_BASE}/reports/assistant_status.json`, { cache: "no-store" });
        if (!mounted) return;
        if (r.ok) setStatus(await r.json());
        else setError(`assistant_status.json not published yet (${r.status})`);
      } catch (e: any) {
        if (mounted) setError(e?.message || "unreachable");
      }
    }
    load();
    const id = setInterval(load, 60000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages]);

  const trust = status?.trust || {};
  const tools: Tool[] = status?.tools || [];
  const telemetry = status?.telemetry?.recent || [];
  const curriculum = status?.curriculum || {};

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setBusy(true);
    try {
      const r = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.map((m) => ({ role: m.role, content: m.content })) }),
      });
      const data = await r.json();
      setMessages((m) => [...m, { role: "assistant", content: data.content || data.error || "(no answer)", steps: data.steps, mode: data.mode }]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: "assistant", content: `⚠ ${e?.message || e}` }]);
    }
    setBusy(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Trust & Telemetry */}
      <div className="fleet-card">
        <div className="bh-card__header">
          <div className="bh-card__title">Trust &amp; Telemetry</div>
          <span className="fleet-badge ok">
            {trust.enforcement || "capability-gated"} · auth {trust.auth || "off"}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginTop: 12 }}>
          <div className="bh-metric"><span className="bh-metric__label">Read-only tools</span><span className="bh-metric__value">{trust.read_only_tools ?? "—"}</span></div>
          <div className="bh-metric"><span className="bh-metric__label">Sandboxed</span><span className="bh-metric__value">{trust.sandboxed_tools ?? "—"}</span></div>
          <div className="bh-metric"><span className="bh-metric__label">Telemetry events</span><span className="bh-metric__value">{status?.telemetry?.total_seen ?? 0}</span></div>
          <div className="bh-metric"><span className="bh-metric__label">Engine</span><span className="bh-metric__value" style={{ fontSize: ".72rem" }}>{status?.engine?.available ? "live" : (status?.engine?.reason || "offline")}</span></div>
        </div>
        {error && <div className="bh-alert bh-alert--error" style={{ marginTop: 12 }}>{error}</div>}
        <p style={{ fontSize: ".74rem", opacity: 0.7, marginTop: 10 }}>
          Every tool call is checked against a declared capability boundary before it runs, and every step is written to a local telemetry ledger you own — never phoned home.
        </p>
      </div>

      {/* Tool catalog */}
      <div className="fleet-card">
        <div className="bh-card__title">Tool catalog ({tools.length})</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 8, marginTop: 10 }}>
          {tools.map((t) => (
            <div key={t.name} className="bh-metric" style={{ alignItems: "flex-start" }}>
              <span className="bh-metric__label" style={{ fontFamily: "ui-monospace,monospace" }}>{t.signature || t.name}{t.sandboxed === "True" ? " · sandboxed" : ""}</span>
              <span className="bh-metric__value" style={{ fontSize: ".72rem", fontWeight: 400 }}>{t.description}</span>
            </div>
          ))}
          {!tools.length && <span style={{ opacity: 0.6 }}>catalog not published yet</span>}
        </div>
        {curriculum?.levels && (
          <p style={{ fontSize: ".72rem", opacity: 0.7, marginTop: 10 }}>
            Trained by the tool-use curriculum ({curriculum.status}): {curriculum.levels.map((l: any) => l.id).join(" · ")}.
          </p>
        )}
      </div>

      {/* Chat */}
      <div className="fleet-card">
        <div className="bh-card__header">
          <div className="bh-card__title">Ask Dottie</div>
          {messages.some((m) => m.mode) && (
            <span className="fleet-badge">{messages.find((m) => m.mode)?.mode === "live" ? "live" : "demo transcript"}</span>
          )}
        </div>
        <div ref={logRef} style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
          {messages.map((m, i) => (
            <div key={i}>
              <div style={{ fontSize: ".68rem", textTransform: "uppercase", letterSpacing: ".06em", opacity: 0.6 }}>{m.role === "user" ? "you" : "dottie"}</div>
              <div className="bh-bubble" style={{ whiteSpace: "pre-wrap", padding: "8px 10px", border: "1px solid var(--bh-line,#d4d0c4)", borderRadius: 8, marginTop: 4 }}>{m.content}</div>
              {m.steps && m.steps.length > 0 && (
                <div style={{ borderLeft: "2px solid var(--bh-line,#d4d0c4)", paddingLeft: 10, marginTop: 6 }}>
                  {m.steps.map((s, j) => s.action ? (
                    <div key={j} style={{ fontSize: ".76rem", margin: "3px 0" }}>
                      <strong>{s.action.replace(/^Action:\s*/, "")}</strong>{" "}
                      <span style={{ color: s.gate === "denied" ? "#8b2e2e" : "#2f6b3a", fontWeight: s.gate === "denied" ? 700 : 400 }}>{s.gate === "denied" ? "DENIED" : "ok"}</span>
                      {s.observation && <div style={{ opacity: 0.65, fontFamily: "ui-monospace,monospace" }}>→ {s.observation}</div>}
                    </div>
                  ) : null)}
                </div>
              )}
            </div>
          ))}
          {!messages.length && <span style={{ opacity: 0.55, fontSize: ".82rem" }}>Try “what is 19 + 23?” or “delete all the log files” — watch the trust gate and the grounded/refused step trace.</span>}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            placeholder="Ask Dottie…"
            style={{ flex: 1, padding: "8px 10px", border: "1px solid var(--bh-line,#d4d0c4)", borderRadius: 6 }}
          />
          <button className="fleet-btn" onClick={send} disabled={busy}>{busy ? "…" : "Send"}</button>
        </div>
        {telemetry.length > 0 && (
          <p style={{ fontSize: ".7rem", opacity: 0.6, marginTop: 10 }}>
            recent telemetry: {telemetry.slice(-5).map((e: any) => `${e.action}(${e.status})`).join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}
