import { NextResponse } from "next/server";
import { askGemini, geminiErrorMessage } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return NextResponse.json({ error: "Type something to send." }, { status: 400 });
  }

  try {
    const reply = await askGemini(prompt);
    return NextResponse.json({ reply });
  } catch (error) {
    const message = geminiErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
