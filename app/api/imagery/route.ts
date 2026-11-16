import { NextResponse } from "next/server";
import { classifySatelliteFrame, classifySatelliteFrames } from "@/lib/classify";
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
    const wanted = imagery.frames.map((frame) => frame.year);
    const pulled = imagery.frames.flatMap((frame) => {
      const imageUrl = photos[frame.year];
      if (!imageUrl) return [];
      return [asPulled(frame, imageUrl)];
    });
    let frames = await classifySatelliteFrames(pulled);
    const have = () => new Set(frames.map((frame) => frame.year));
    for (const year of wanted) {
      if (have().has(year)) continue;
      if ([...have()].some((found) => Math.abs(found - year) <= 1)) continue;
      const base = imagery.frames.find((frame) => frame.year === year) ?? imagery.frames[0];
      for (const alt of [year - 1, year + 1, year - 2, year + 2]) {
        if (have().has(alt) || alt < 2016 || alt > 2026) continue;
        const extra = await pullSatelliteImages(imagery.latitude, imagery.longitude, [alt]);
        const imageUrl = extra?.[alt];
        if (!imageUrl) continue;
        try {
          frames.push(await classifySatelliteFrame(asPulled({ ...base, year: alt }, imageUrl)));
          break;
        } catch (error) {
          console.error(error instanceof Error ? error.message : `The land model failed for ${alt}.`);
        }
      }
    }
    frames = frames.sort((a, b) => a.year - b.year);
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

function asPulled<T extends { year: number }>(frame: T, imageUrl: string) {
  const dataUrl = imageUrl.startsWith("data:");
  return {
    ...frame,
    image_url: dataUrl ? undefined : imageUrl,
    image_base64: dataUrl ? imageUrl.split(",")[1] : undefined,
    image_mime: dataUrl ? "image/png" : undefined,
    mask_url: undefined,
  };
}
