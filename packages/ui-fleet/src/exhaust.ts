/**
 * Funnel exhaust emitter (PMF-003, Spec 0022): fire-and-forget POST to the
 * unified data-exhaust intake so BFF routes can log funnel interactions
 * without ever risking the user-facing request. Server-only — never import
 * from a "use client" component.
 */

export async function emitFunnelEvent(siteId: string, event: string): Promise<void> {
  const apiKey = process.env.SYNTH_API_KEY;
  if (!apiKey) return;
  try {
    const baseUrl = process.env.SYNTH_API_BASE_URL ?? "http://localhost:8000";
    await fetch(`${baseUrl}/v1/exhaust`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        source: siteId,
        kind: "interaction",
        consent: true,
        payload: { event },
      }),
    });
  } catch {
    // Analytics must never break a user request — swallow all errors.
  }
}
