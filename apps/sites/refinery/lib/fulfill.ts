/** Server-side core-api admin helpers for refinery fulfillment (MON-005). */

const API = process.env.SYNTH_API_BASE_URL ?? "https://api-production-3dea.up.railway.app";
const ADMIN = process.env.SYNTH_ADMIN_KEY ?? process.env.API_SECRET_KEY ?? "";

async function adminFetch(path: string, init?: RequestInit) {
  if (!ADMIN) throw new Error("SYNTH_ADMIN_KEY not set");
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ADMIN}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`${init?.method ?? "GET"} ${path} -> ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export async function fulfillDatasetOrder(
  orderId: string,
  datasetSlug: string,
  email = "",
): Promise<{ orderId: string; datasetSlug: string; paymentStatus: string }> {
  return adminFetch("/v1/admin/catalog/fulfill", {
    method: "POST",
    body: JSON.stringify({ orderId, datasetSlug, email, paymentStatus: "pending-gate" }),
  });
}

export async function issueDatasetDownload(
  slug: string,
  orderId: string,
): Promise<{ url: string; expiresAt: string; format: string; artifact: string }> {
  const res = await fetch(`${API}/v1/catalog/datasets/${encodeURIComponent(slug)}/download`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ orderId }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`download -> ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export function adminConfigured(): boolean {
  return Boolean(ADMIN);
}
