import { NextResponse } from "next/server";
import type { ParsedQuery } from "@/lib/query";
import { fetchLandImagery, requestFromParsed } from "@/services/mlModelService";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = body?.parsed as ParsedQuery | undefined;
  if (!parsed?.location || !parsed.start_year || !parsed.end_year) {
    return NextResponse.json({ error: "The parsed query was incomplete." }, { status: 400 });
  }

  try {
    const imagery = await fetchLandImagery(requestFromParsed(parsed));
    return NextResponse.json({ imagery });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The imagery request failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
