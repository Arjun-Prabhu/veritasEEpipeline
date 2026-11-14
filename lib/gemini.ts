import { GoogleGenAI, Type } from "@google/genai";
import sharp from "sharp";
import type { Analysis } from "@/lib/narrative";
import type { ParsedQuery } from "@/lib/query";
import type { MLModelResponse, YearImagery } from "@/services/mlModelService";
import { renderTileFromUrl } from "@/services/tileArt";

const MODEL = "models/gemini-3.8-flash";

export function geminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export async function parseWithGemini(prompt: string): Promise<Partial<ParsedQuery> | null> {
  const ai = client();
  if (!ai) return null;
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: `Extract a geospatial land-change query from the user. The present year is 2026. If they give no timeframe, set start_year to 2021 and end_year to 2026. If they give one year with "since" or "from", use it as start_year and 2026 as end_year. location is a place name, not the whole sentence. focus_area is a short phrase such as "deforestation", "urban development", "coastal change", "agriculture", "wildfire recovery", or "general land use". latitude and longitude are the approximate WGS84 center of that place.

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
        },
        required: ["location", "start_year", "end_year", "focus_area", "latitude", "longitude"],
      },
    },
  });
  return readJson<Partial<ParsedQuery>>(response.text);
}

export async function interpretWithGemini(
  prompt: string,
  imagery: MLModelResponse,
): Promise<Omit<Analysis, "source"> | null> {
  const ai = client();
  if (!ai) return null;

  const samples = pickFrames(imagery.frames);
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    {
      text: `You are gAIa, an earth-observation analyst writing for a curious non-expert.

The user asked: "${prompt}"
Place: ${imagery.location}
Focus: ${imagery.focus_area}
Coordinates: ${imagery.latitude}, ${imagery.longitude}

Land-cover percentages for every returned year (these numbers are authoritative):
${imagery.frames
  .map(
    (frame) =>
      `${frame.year}: green ${frame.land_cover.green_space}, urban ${frame.land_cover.urban}, water ${frame.land_cover.water}, crops ${frame.land_cover.crops}, built ${frame.land_cover.built}`,
  )
  .join("\n")}

Images follow for selected years. They may be simulated previews or real model output. Do not invent counts of people, hectares, or statutes. Use what you know about this specific place to explain plausible causes. If the change is harmful, mitigation steps must be concrete and local. If the change is a recovery, the steps should protect that recovery. Write in plain prose. headline is one sentence.`,
    },
  ];

  for (const frame of samples) {
    const image = await inlineImage(frame);
    parts.push({ text: `Imagery for ${frame.year}.` });
    if (image) parts.push({ inlineData: image });
  }

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts }],
    config: {
      temperature: 0.4,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          headline: { type: Type.STRING },
          observed_changes: { type: Type.STRING },
          root_causes: { type: Type.STRING },
          future_predictions: { type: Type.STRING },
          mitigation: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: [
          "headline",
          "observed_changes",
          "root_causes",
          "future_predictions",
          "mitigation",
        ],
      },
    },
  });

  const parsed = readJson<Omit<Analysis, "source">>(response.text);
  if (!parsed?.observed_changes || !parsed.root_causes || !parsed.future_predictions) return null;
  return {
    headline: parsed.headline || `${imagery.location} is changing.`,
    observed_changes: parsed.observed_changes,
    root_causes: parsed.root_causes,
    future_predictions: parsed.future_predictions,
    mitigation: Array.isArray(parsed.mitigation) ? parsed.mitigation.filter(Boolean) : [],
  };
}

export async function askGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set.");
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
  const raw = error instanceof Error ? error.message : "The key did not work.";
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string } };
    if (parsed.error?.message) return parsed.error.message;
  } catch {
    /* The SDK sometimes returns plain text. */
  }
  return raw;
}

function client() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

function pickFrames(frames: YearImagery[]) {
  if (frames.length <= 3) return frames;
  const middle = frames[Math.floor((frames.length - 1) / 2)];
  return [frames[0], middle, frames[frames.length - 1]];
}

async function inlineImage(frame: YearImagery) {
  try {
    const input = await loadImage(frame);
    if (!input) return null;
    const png = await sharp(input, { density: 110, limitInputPixels: false })
      .resize(768, 768, { fit: "inside" })
      .png()
      .toBuffer();
    return { mimeType: "image/png", data: png.toString("base64") };
  } catch (error) {
    console.error(`Could not prepare imagery for ${frame.year}`, error);
    return null;
  }
}

async function loadImage(frame: YearImagery): Promise<Buffer | null> {
  if (frame.image_base64) return Buffer.from(frame.image_base64, "base64");
  const url = frame.image_url;
  if (!url) return null;
  if (url.startsWith("/api/tile")) {
    const svg = renderTileFromUrl(url);
    return svg ? Buffer.from(svg) : null;
  }
  if (url.startsWith("data:")) {
    const match = url.match(/^data:[^;]+;base64,(.+)$/);
    return match ? Buffer.from(match[1], "base64") : null;
  }
  if (url.startsWith("/")) {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    return readFile(join(process.cwd(), "public", url));
  }
  if (url.startsWith("http://") || url.startsWith("https://")) {
    const response = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    if (!response.ok) return null;
    return Buffer.from(await response.arrayBuffer());
  }
  return null;
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
