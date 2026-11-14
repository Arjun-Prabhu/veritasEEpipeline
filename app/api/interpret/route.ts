import { NextResponse } from "next/server";
import { interpretWithGemini } from "@/lib/gemini";
import { localNarrative } from "@/lib/narrative";
import type { MLModelResponse } from "@/services/mlModelService";

export const runtime = "nodejs";
export const maxDuration = 60;

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

  return NextResponse.json({
    analysis: { ...localNarrative(prompt, imagery), source: "local" },
  });
}
