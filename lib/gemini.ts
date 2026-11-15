import { GoogleGenAI, Type } from "@google/genai";
import type { Analysis } from "@/lib/narrative";
import type { ParsedQuery } from "@/lib/query";
import type { MLModelResponse } from "@/services/mlModelService";

const MODEL = "models/gemini-3.5-flash-lite";

export function geminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export async function parseWithGemini(prompt: string): Promise<Partial<ParsedQuery> | null> {
  const ai = client();
  if (!ai) return null;
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: `Extract a geospatial land-change query from the user. The present year is 2026. If they give no timeframe, set start_year to 2021 and end_year to 2026. If they give one year with "since" or "from", use it as start_year and 2026 as end_year. location is the city or town, not the whole sentence. Convert that city or town into latitude and longitude. If the prompt already includes latitude and longitude, copy those numbers exactly. Do not round them and do not move them to a nearby city. Set location to the city or town that actually contains that point. Never put the raw numbers in location. region is the state, province, or equivalent administrative area, such as Michigan. country is the country, such as United States. If the place has no state or province, leave region empty. focus_area is a short phrase such as "deforestation", "urban development", "coastal change", "agriculture", "wildfire recovery", or "general land use".

User prompt:
${prompt}`,
    config: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          location: { type: Type.STRING },
          start_year: { type: Type.INTEGER },
          end_year: { type: Type.INTEGER },
          focus_area: { type: Type.STRING },
          latitude: { type: Type.NUMBER },
          longitude: { type: Type.NUMBER },
          region: { type: Type.STRING },
          country: { type: Type.STRING },
        },
        required: ["location", "start_year", "end_year", "focus_area", "latitude", "longitude", "region", "country"],
      },
    },
  });
  return readJson<Partial<ParsedQuery>>(response.text);
}

export async function interpretWithGemini(
  prompt: string,
  imagery: MLModelResponse,
): Promise<Omit<Analysis, "source"> | null> {
  const numbers = imagery.frames
    .map(
      (frame) =>
        `${frame.year}: green ${frame.land_cover.green_space}, urban ${frame.land_cover.urban}, water ${frame.land_cover.water}, crops ${frame.land_cover.crops}, built ${frame.land_cover.built}`,
    )
    .join("\n");
  const request = `You are Luna, writing a land-change briefing for a curious non-expert.

The user asked: "${prompt}"
Place: ${imagery.location}
Region: ${imagery.region || ""}
Country: ${imagery.country || ""}
Focus: ${imagery.focus_area}

Use the place name in the headline and the prose. Do not mention raw latitude or longitude.

Land-cover percentages for every year (these numbers are authoritative):
${numbers}

Do not invent counts of people, hectares, or statutes. Use what you know about this specific place to explain plausible causes. If the change is harmful, mitigation steps must be concrete and local. If the change is a recovery, the steps should protect that recovery. headline is one sentence.

Reply with only JSON using these keys: headline, observed_changes, root_causes, future_predictions, mitigation. mitigation is an array of short strings.`;

  try {
    const text = await askGemini(request);
    const parsed = readJson<Omit<Analysis, "source">>(text);
    if (parsed?.observed_changes && parsed.root_causes && parsed.future_predictions) {
      return {
        headline: parsed.headline || `${imagery.location} is changing.`,
        observed_changes: parsed.observed_changes,
        root_causes: parsed.root_causes,
        future_predictions: parsed.future_predictions,
        mitigation: Array.isArray(parsed.mitigation)
          ? parsed.mitigation.filter((step) => typeof step === "string" && step.trim())
          : [],
      };
    }
    return {
      headline: `${imagery.location} is changing.`,
      observed_changes: text,
      root_causes: "The reading did not separate a cause from the observation.",
      future_predictions: "The next years depend on whether this pace continues.",
      mitigation: [],
    };
  } catch (error) {
    console.error("Gemini interpretation failed", error);
    return null;
  }
}

function readGeminiKey() {
  let key = process.env.GEMINI_API_KEY?.trim() ?? "";
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }
  return key;
}

export async function askGemini(prompt: string): Promise<string> {
  const apiKey = readGeminiKey();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set on this server.");
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: { temperature: 0.3 },
  });
  const text = response.text?.trim();
  if (!text) throw new Error("The model returned an empty reply.");
  return text;
}

export function geminiErrorMessage(error: unknown) {
  const raw = readError(error);
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string }; message?: string };
    if (parsed.error?.message) return parsed.error.message;
    if (parsed.message) return parsed.message;
  } catch {
    /* The SDK sometimes returns plain text. */
  }
  return raw;
}

function readError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object") {
    const record = error as { message?: unknown; error?: { message?: unknown } };
    if (typeof record.error?.message === "string") return record.error.message;
    if (typeof record.message === "string") return record.message;
    try {
      return JSON.stringify(error);
    } catch {
      return "The key did not work.";
    }
  }
  return "The key did not work.";
}

function client() {
  const apiKey = readGeminiKey();
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

function readJson<T>(text: string | undefined): T | null {
  if (!text) return null;
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}
