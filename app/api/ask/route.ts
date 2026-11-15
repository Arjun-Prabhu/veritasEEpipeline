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
  const luna = body?.luna === true;
  const contents = luna
    ? `You are Luna, a small assistant on the gAIa home page. Assume the user's message is about gAIa, satellites, land consumption, land use, or the environment, and answer helpfully in two or three short sentences. Only if the message is completely unrelated to those subjects, say you can't answer that.\n\n${prompt}`
    : prompt;

  try {
    const reply = await askGemini(contents);
    return NextResponse.json({ reply });
  } catch (error) {
    const message = geminiErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
