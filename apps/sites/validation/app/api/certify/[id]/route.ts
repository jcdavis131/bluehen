import { GET_certifyStatus } from "@synthaembed/ui-fleet/routes";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  return GET_certifyStatus(id);
}
