/** Server-side catalog client. The catalog API is public and cached;
 * the submit/lead routes use the workspace key server-side only. */

const API = process.env.SYNTH_API_BASE_URL ?? "http://localhost:8000";

export interface DatasetSummary {
  id: string;
  slug: string;
  name: string;
  docCount: number;
  chunkCount: number;
  tokenEstimate: number;
  tags: string[];
  createdAt: string;
}

export interface DatasetDetail extends DatasetSummary {
  cardMd: string | null;
  provenance: Record<string, unknown> | null;
  sourceId: string | null;
  sampleAvailable: boolean;
}

async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const getStats = () =>
  get<{ datasets: number; docs: number; chunks: number; lastSyncAt: string | null }>(
    "/v1/catalog/stats",
  );

export const listDatasets = (cursor?: string, tag?: string, q?: string) => {
  const p = new URLSearchParams({ limit: "20" });
  if (cursor) p.set("cursor", cursor);
  if (tag) p.set("tag", tag);
  if (q) p.set("q", q);
  return get<{ items: DatasetSummary[]; nextCursor: string | null }>(
    `/v1/catalog/datasets?${p}`,
  );
};

export const getDataset = (slug: string) =>
  get<DatasetDetail>(`/v1/catalog/datasets/${encodeURIComponent(slug)}`);

export const getSample = (slug: string) =>
  get<{ slug: string; chunks: { text: string; docId: string | null }[] }>(
    `/v1/catalog/datasets/${encodeURIComponent(slug)}/sample`,
  );
