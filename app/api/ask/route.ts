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
  const context = body?.context as
    | { location?: string; briefing?: string; years?: string; focus?: string; covers?: string }
    | undefined;
  const place = [context?.location, context?.years, context?.focus].filter(Boolean).join(", ");
  const contents = luna
    ? `You are Luna on gAIa. Use web search for real events, policies, climate, and local history. Stay on gAIa, satellites, land use, land consumption, the environment, or the place being discussed. If the message is completely unrelated to those subjects, say you can't answer that. Answer in two or three short sentences. When explaining why land changed, name real-world causes. Do not invent statistics.
${place ? `\nPlace: ${place}` : ""}
${context?.briefing ? `Briefing: ${context.briefing}` : ""}
${context?.covers ? `Measured land cover, percent:\n${context.covers}` : ""}

${prompt}`
    : prompt;

  try {
    const reply = await askGemini(contents, { search: luna });
    return NextResponse.json({ reply });
  } catch (error) {
    const message = geminiErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
