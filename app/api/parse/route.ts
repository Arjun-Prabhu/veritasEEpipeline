import { NextResponse } from "next/server";
import { parseWithGemini } from "@/lib/gemini";
import { parsePromptLocally, sanitizeParsed } from "@/lib/query";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  if (prompt.length < 3) {
    return NextResponse.json({ error: "Enter a place and a question first." }, { status: 400 });
  }

  try {
    const gemini = await parseWithGemini(prompt);
    const parsed = sanitizeParsed(gemini ?? parsePromptLocally(prompt), prompt);
    return NextResponse.json({ parsed, source: gemini ? "gemini" : "local" });
  } catch (error) {
    console.error(error);
    const parsed = sanitizeParsed(parsePromptLocally(prompt), prompt);
    return NextResponse.json({ parsed, source: "local" });
  }
}
