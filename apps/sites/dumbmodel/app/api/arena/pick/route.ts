import { NextResponse } from "next/server";

/** Removed — picks are recorded via POST /api/arena/round (resolve). */
export async function POST() {
  return NextResponse.json(
    { error: "deprecated", use: "/api/arena/round" },
    { status: 410 },
  );
}
