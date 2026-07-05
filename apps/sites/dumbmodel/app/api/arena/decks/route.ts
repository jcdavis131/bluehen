import { NextResponse } from "next/server";
import { listDecks } from "../../../arena/decks";

/** GET the three arena decks (checked into content/arena/decks/*.json,
 * statically imported — no network round trip, no key required). */
export async function GET() {
  return NextResponse.json({ decks: listDecks() });
}
