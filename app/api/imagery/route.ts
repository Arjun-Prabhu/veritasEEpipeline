import { NextResponse } from "next/server";
import { pullSatelliteImages } from "@/lib/earthImages";
import type { ParsedQuery } from "@/lib/query";
import { fetchLandImagery, requestFromParsed } from "@/services/mlModelService";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = body?.parsed as ParsedQuery | undefined;
  if (!parsed?.location || !parsed.start_year || !parsed.end_year) {
    return NextResponse.json({ error: "The parsed query was incomplete." }, { status: 400 });
  }

  try {
    const imagery = await fetchLandImagery(requestFromParsed(parsed));
    const photos = await pullSatelliteImages(
      imagery.latitude,
      imagery.longitude,
      imagery.frames.map((frame) => frame.year),
    );
    if (!photos) return NextResponse.json({ imagery });
    const frames = imagery.frames.flatMap((frame) => {
      const imageUrl = photos[frame.year];
      if (!imageUrl) return [];
      return [{ ...frame, image_url: imageUrl, mask_url: undefined }];
    });
    if (!frames.length) {
      throw new Error("No clear satellite scenes came back for those years.");
    }
    imagery.provider = "remote";
    imagery.frames = frames;
    imagery.start_year = frames[0].year;
    imagery.end_year = frames[frames.length - 1].year;
    return NextResponse.json({ imagery });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The imagery request failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
