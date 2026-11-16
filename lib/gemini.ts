import { GoogleGenAI, Type } from "@google/genai";
import type { Analysis } from "@/lib/narrative";
import type { ParsedQuery } from "@/lib/query";
import { coverSummary, pointChangeLines } from "@/lib/cover";
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
  const ai = client();
  if (!ai) return null;
  const first = imagery.frames[0];
  const last = imagery.frames[imagery.frames.length - 1];
  const numbers = imagery.frames
    .map((frame) => coverSummary(frame.year, frame.land_cover, Boolean(frame.classified)))
    .join("\n");

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: `Write a land-change briefing from the measured class percentages only. Do not invent numbers.

Changes: one line for each step from one year to the next, naming the classes that moved and the percentage-point change, then one short paragraph for the whole span. Use only the measured point changes.
Prediction: from that trend, say what the next years are likely to bring and whether that is good or bad for the environment. Set outlook to "bad" when the direction harms the environment, otherwise "good".

Place: ${imagery.location}
Question: ${prompt}
Years: ${first?.year ?? imagery.start_year} to ${last?.year ?? imagery.end_year}
Land cover, percent:
${numbers}`,
      config: {
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            year_changes: { type: Type.ARRAY, items: { type: Type.STRING } },
            overall: { type: Type.STRING },
            prediction: { type: Type.STRING },
            outlook: { type: Type.STRING, enum: ["good", "bad"] },
          },
          required: ["year_changes", "overall", "prediction", "outlook"],
        },
      },
    });
    const parsed = readJson<{
      year_changes?: string[];
      overall?: string;
      prediction?: string;
      outlook?: string;
    }>(response.text);
    const years = (parsed?.year_changes ?? []).map((line) => line.trim()).filter(Boolean);
    const overall = parsed?.overall?.trim() ?? "";
    const prediction = parsed?.prediction?.trim() ?? "";
    if (!years.length && !overall && !prediction) return null;
    const outlook = parsed?.outlook === "bad" ? "bad" : "good";
    const solution = outlook === "bad" ? await solutionFor(imagery.location, prediction) : "";
    return {
      headline: "",
      observed_changes: [...years, pointChangeLines(imagery.frames), overall].filter(Boolean).join("\n"),
      root_causes: solution,
      future_predictions: prediction,
      mitigation: [],
    };
  } catch (error) {
    console.error("Gemini interpretation failed", error);
    return null;
  }
}

async function solutionFor(location: string, prediction: string) {
  const ask = `Place: ${location}. The land trend is harmful: ${prediction}
Use web search. In two or three sentences, say what the current government is doing about this, or what people there can do. End with a concrete call to action. Do not invent a program or a statistic.`;
  try {
    return await askGemini(ask, { search: true });
  } catch (error) {
    console.error("Solution search failed", error);
    return `The measured direction is harmful for ${location}. Look up the local land-use plan and ask the city to protect the classes that are shrinking.`;
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

export async function askGemini(prompt: string, options?: { search?: boolean }): Promise<string> {
  const apiKey = readGeminiKey();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set on this server.");
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        temperature: 0.3,
        ...(options?.search ? { tools: [{ googleSearch: {} }] } : {}),
      },
    });
    const text = response.text?.trim();
    if (!text) throw new Error("The model returned an empty reply.");
    return text;
  } catch (error) {
    if (!options?.search) throw error;
    return askGemini(prompt);
  }
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
