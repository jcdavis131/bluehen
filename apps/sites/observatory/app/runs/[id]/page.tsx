import { RunDetail } from "../../../components/RunDetail";

type Params = { params: Promise<{ id: string }> };

/** Dynamic route segments arrive percent-encoded (run cards link with
 * encodeURIComponent); decode defensively so raw ids still resolve. */
function decodeRunId(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function generateMetadata({ params }: Params) {
  const { id } = await params;
  return { title: `Run ${decodeRunId(id)}` };
}

export default async function RunDetailPage({ params }: Params) {
  const { id } = await params;
  return <RunDetail runId={decodeRunId(id)} />;
}
