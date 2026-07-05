import { NextResponse } from "next/server";
import { listDecks } from "../../../arena/decks";

/** GET arena decks — cached at the edge (static JSON imports). */
export async function GET() {
  return NextResponse.json(
    { decks: listDecks() },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
