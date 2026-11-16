import { NextResponse } from "next/server";
import { imageQualityNote, pointChangeLines, unreliableYears } from "@/lib/cover";
import { interpretWithGemini } from "@/lib/gemini";
import type { MLModelResponse } from "@/services/mlModelService";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  const imagery = body?.imagery as MLModelResponse | undefined;
  if (!prompt || !imagery?.frames?.length) {
    return NextResponse.json({ error: "Imagery has to finish before it can be read." }, { status: 400 });
  }

  try {
    const gemini = await interpretWithGemini(prompt, imagery);
    if (gemini) {
      return NextResponse.json({ analysis: { ...gemini, source: "gemini" } });
    }
  } catch (error) {
    console.error("Gemini interpretation failed", error);
  }

  const badYears = new Set(unreliableYears(imagery.frames));
  const readable = imagery.frames.filter((frame) => !badYears.has(frame.year));
  const first = readable[0] ?? imagery.frames[0];
  const last = readable[readable.length - 1] ?? imagery.frames[imagery.frames.length - 1];
  const quality = [...badYears].map((year) => imageQualityNote(year)).join("\n");
  const built = (last.land_cover.built ?? 0) - (first.land_cover.built ?? 0);
  const trees = (last.land_cover.trees ?? 0) - (first.land_cover.trees ?? 0);
  const grass = (last.land_cover.grass ?? last.land_cover.green_space) - (first.land_cover.grass ?? first.land_cover.green_space);
  const shift = first.classified
    ? `${first.year} to ${last.year}: built land ${built >= 0 ? "rose" : "fell"} ${Math.abs(built).toFixed(1)} points, trees ${trees >= 0 ? "rose" : "fell"} ${Math.abs(trees).toFixed(1)} points, and grass ${grass >= 0 ? "rose" : "fell"} ${Math.abs(grass).toFixed(1)} points.`
    : `${first.year} to ${last.year}: green space ${grass >= 0 ? "rose" : "fell"} ${Math.abs(grass).toFixed(1)} points and built land ${built >= 0 ? "rose" : "fell"} ${Math.abs(built).toFixed(1)} points.`;
  const harmful = built > 0 && (trees < 0 || grass < 0);
  return NextResponse.json({
    analysis: {
      headline: "",
      observed_changes: `${quality ? `${quality}\n` : ""}${readable.length >= 2 ? `${shift}\n` : ""}${pointChangeLines(imagery.frames)}\nAcross ${imagery.location}, that is the measured change from the readable years only.`,
      future_predictions: harmful
        ? "If this pace holds, built land keeps taking space from vegetation. That is a bad direction for the environment."
        : "If this pace holds, the current mix of land cover stays near where it is. That is not a clear harm.",
      root_causes: harmful
        ? `Ask ${imagery.location} to publish what it is doing to slow the loss of vegetation, and push for a public review of new built land.`
        : "",
      mitigation: [],
      source: "local",
    },
  });
}
