import { NextRequest } from "next/server";
import { POST_certify } from "@synthaembed/ui-fleet/routes";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return POST_certify(req);
}
