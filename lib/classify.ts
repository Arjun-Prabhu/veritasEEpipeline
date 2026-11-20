import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { modelClassKeys, type ModelClass } from "@/lib/cover";
import type { LandCoverPercentages } from "@/services/mlModelService";

const MODEL_KEYS = modelClassKeys();

type Classified<T> = T & {
  land_cover: LandCoverPercentages;
  classified: true;
  mask_url?: string;
  mask_base64?: string;
  mask_mime?: string;
};

export async function classifySatelliteFrame<T extends { year: number; image_url?: string; image_base64?: string }>(
  frame: T,
): Promise<Classified<T>> {
  const imageUrl = process.env.ML_PREDICTION_IMAGE_URL?.trim();
  const dataUrl = process.env.ML_PREDICTION_DATA_URL?.trim();
  if (!imageUrl || !dataUrl) {
    throw new Error("ML_PREDICTION_IMAGE_URL and ML_PREDICTION_DATA_URL must be set.");
  }
  let last: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const png = await readScene(frame);
      const [boxed, cover] = await Promise.all([
        postImage(imageUrl, png, frame.year),
        postData(dataUrl, png, frame.year),
      ]);
      const saved = await storeBoxed(frame.image_url, frame.year, boxed);
      return {
        ...frame,
        land_cover: cover,
        classified: true,
        mask_url: saved.url,
        mask_base64: saved.base64,
        mask_mime: "image/png",
      };
    } catch (error) {
      last = error instanceof Error ? error : new Error(`The land model failed for ${frame.year}.`);
      if (attempt < 2) await delay(1000 * (attempt + 1));
    }
  }
  throw last ?? new Error(`The land model failed for ${frame.year}.`);
}

export async function classifySatelliteFrames<T extends { year: number; image_url?: string; image_base64?: string }>(
  frames: T[],
): Promise<Array<Classified<T>>> {
  const classified: Array<Classified<T>> = [];
  let last: Error | null = null;
  const results = await Promise.allSettled(frames.map((frame) => classifySatelliteFrame(frame)));
  for (const [index, result] of results.entries()) {
    if (result.status === "fulfilled") {
      classified.push(result.value);
      continue;
    }
    const error = result.reason;
    last = error instanceof Error ? error : new Error(`The land model failed for ${frames[index].year}.`);
    console.error(last.message);
  }
  if (!classified.length) {
    throw last ?? new Error("The land model could not read those years.");
  }
  return classified;
}

async function readScene(frame: { year: number; image_url?: string; image_base64?: string }) {
  if (frame.image_base64) return Buffer.from(frame.image_base64, "base64");
  const url = frame.image_url ?? "";
  if (url.startsWith("data:image/")) {
    const encoded = url.split(",")[1] ?? "";
    return Buffer.from(encoded, "base64");
  }
  const parsed = satelliteFile(url);
  if (!parsed) throw new Error(`Year ${frame.year} did not include a satellite image to classify.`);
  return readFile(parsed.file);
}

function satelliteFile(url: string) {
  const query = url.startsWith("/api/satellite?") ? url.slice("/api/satellite?".length) : "";
  if (!query) return null;
  const params = new URLSearchParams(query);
  const id = params.get("id") ?? "";
  const year = params.get("year") ?? "";
  if (!/^[a-f0-9]{12}$/.test(id) || !/^\d{4}$/.test(year)) return null;
  return {
    id,
    year,
    file: path.join(process.cwd(), "EarthEngine", "out", id, `satellite_${year}.png`),
  };
}

async function storeBoxed(imageUrl: string | undefined, year: number, png: Buffer) {
  const parsed = imageUrl ? satelliteFile(imageUrl) : null;
  if (!parsed) return { base64: png.toString("base64") };
  const file = path.join(process.cwd(), "EarthEngine", "out", parsed.id, `class_${year}.png`);
  await writeFile(file, png);
  return { url: `/api/satellite?id=${parsed.id}&year=${year}&view=class` };
}

async function postImage(endpoint: string, png: Buffer, year: number) {
  const response = await postFile(endpoint, png, year);
  const type = response.headers.get("content-type") ?? "";
  const bytes = Buffer.from(await response.arrayBuffer());
  if (type.includes("image/") || type.includes("octet-stream") || looksLikePng(bytes)) return bytes;
  const text = bytes.toString("utf8");
  const embedded = imageFromJson(text);
  if (embedded) return embedded;
  throw new Error(`The model did not return a classified image for ${year}.`);
}

async function postData(endpoint: string, png: Buffer, year: number) {
  const response = await postFile(endpoint, png, year);
  const text = await response.text();
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`The model did not return land-cover data for ${year}.`);
  }
  const percentage = findPercentages(payload);
  if (!percentage) throw new Error(`The model data for ${year} did not include class percentages.`);
  return coverFrom(percentage);
}

async function postFile(endpoint: string, png: Buffer, year: number) {
  const body = new FormData();
  body.append("file", new File([new Uint8Array(png)], `scene_${year}.png`, { type: "image/png" }));
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(120_000),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new Error(`The land model took too long on ${year}.`);
    }
    throw new Error(`Could not reach the land model for ${year}.`);
  }
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 180);
    throw new Error(`The land model failed for ${year} (${response.status}${detail ? `: ${detail}` : ""}).`);
  }
  return response;
}

function looksLikePng(bytes: Buffer) {
  return bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
}

function imageFromJson(text: string) {
  try {
    const parsed = JSON.parse(text) as unknown;
    const found = findString(parsed);
    if (!found) return null;
    const encoded = found.includes(",") ? found.split(",").pop() ?? "" : found;
    const bytes = Buffer.from(encoded, "base64");
    return looksLikePng(bytes) ? bytes : null;
  } catch {
    return null;
  }
}

function findString(value: unknown): string | null {
  if (typeof value === "string" && value.length > 80) return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findString(item);
      if (found) return found;
    }
    return null;
  }
  if (!value || typeof value !== "object") return null;
  for (const key of ["image", "prediction", "file", "data", "png"]) {
    const found = findString((value as Record<string, unknown>)[key]);
    if (found) return found;
  }
  return null;
}

function findPercentages(value: unknown): Record<string, number> | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findPercentages(item);
      if (found) return found;
    }
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const direct = record.percentage;
  if (direct && typeof direct === "object" && !Array.isArray(direct)) {
    return numericRecord(direct as Record<string, unknown>);
  }
  for (const nested of Object.values(record)) {
    const found = findPercentages(nested);
    if (found) return found;
  }
  return null;
}

function numericRecord(record: Record<string, unknown>) {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === "number" && Number.isFinite(value)) out[key] = value;
  }
  return MODEL_KEYS.some((key) => key in out) ? out : null;
}

function coverFrom(percentage: Record<string, number>): LandCoverPercentages {
  const read = (key: ModelClass) => {
    const value = percentage[key];
    return typeof value === "number" && Number.isFinite(value) ? round(value) : 0;
  };
  const trees = read("trees");
  const grass = read("grass");
  const flooded = read("flooded_vegetation");
  const crops = read("crops");
  const shrub = read("shrub_and_scrub");
  return {
    water: read("water"),
    trees,
    grass,
    flooded_vegetation: flooded,
    crops,
    shrub_and_scrub: shrub,
    built: read("built"),
    bare: read("bare"),
    snow_and_ice: read("snow_and_ice"),
    green_space: round(trees + grass + flooded + crops + shrub),
    urban: 0,
  };
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
