/**
 * Plug-and-play land-imagery adapter.
 *
 * The rest of gAIa only calls `fetchLandImagery`. Switch implementations with
 * USE_MOCK_MODEL — the request and response shapes stay the same.
 *
 * MLModelRequest is the JSON body your finished model must accept (POST).
 * MLModelResponse is the JSON body it must return.
 */

import { fallbackCoordinates } from "@/lib/places";
import type { ParsedQuery } from "@/lib/query";
import { inferScene } from "@/lib/places";
import { tileUrl, type SceneId } from "@/services/tileArt";

export interface MLModelRequest {
  location: string;
  start_year: number;
  end_year: number;
  focus_area: string;
  /** Optional WGS84 center. The mock uses it for the map pin. */
  latitude?: number;
  longitude?: number;
  region?: string;
  country?: string;
}

/** Percent of the analyzed tile. Values are 0–100 and should sum to ~100. */
export interface LandCoverPercentages {
  green_space: number;
  urban: number;
  water: number;
  crops: number;
  built: number;
  trees?: number;
  grass?: number;
  flooded_vegetation?: number;
  shrub_and_scrub?: number;
  bare?: number;
  snow_and_ice?: number;
}

export interface YearImagery {
  year: number;
  /** Site-relative or absolute URL. Omit when sending image_base64. */
  image_url?: string;
  /** Raw base64, without a data: prefix. Omit when sending image_url. */
  image_base64?: string;
  /** Defaults to image/jpeg when image_base64 is set. */
  image_mime?: string;
  mask_url?: string;
  mask_base64?: string;
  mask_mime?: string;
  land_cover: LandCoverPercentages;
  /** True when this frame was measured by the land model. */
  classified?: boolean;
}

export interface MLModelResponse {
  location: string;
  latitude: number;
  longitude: number;
  start_year: number;
  end_year: number;
  focus_area: string;
  region?: string;
  country?: string;
  /** Provider label so the UI can say whether tiles are simulated. */
  provider: "mock" | "remote";
  frames: YearImagery[];
}

const COVER_KEYS = ["green_space", "urban", "water", "crops", "built"] as const;

type Cover = LandCoverPercentages;

const PROFILES: Record<
  SceneId,
  { start: Cover; end: Cover; mid?: Cover; midAt?: number }
> = {
  amazon: {
    start: { green_space: 74, crops: 11, urban: 4, built: 3, water: 8 },
    end: { green_space: 49, crops: 26, urban: 9, built: 7, water: 9 },
  },
  urban: {
    start: { green_space: 24, crops: 6, urban: 34, built: 22, water: 14 },
    end: { green_space: 15, crops: 3, urban: 40, built: 32, water: 10 },
  },
  coast: {
    start: { green_space: 20, crops: 8, urban: 12, built: 14, water: 46 },
    end: { green_space: 12, crops: 4, urban: 11, built: 12, water: 61 },
  },
  agriculture: {
    start: { green_space: 30, crops: 38, urban: 10, built: 8, water: 14 },
    end: { green_space: 18, crops: 46, urban: 16, built: 12, water: 8 },
  },
  wildfire: {
    start: { green_space: 66, crops: 10, urban: 8, built: 8, water: 8 },
    mid: { green_space: 30, crops: 8, urban: 24, built: 22, water: 16 },
    midAt: 0.4,
    end: { green_space: 47, crops: 11, urban: 16, built: 16, water: 10 },
  },
  desert: {
    start: { green_space: 6, crops: 4, urban: 14, built: 16, water: 60 },
    end: { green_space: 5, crops: 2, urban: 22, built: 41, water: 30 },
  },
};

export function modelMode(): "mock" | "live" {
  return process.env.USE_MOCK_MODEL === "false" ? "live" : "mock";
}

export async function fetchLandImagery(params: MLModelRequest): Promise<MLModelResponse> {
  if (modelMode() === "live") return fetchRemoteModel(params);
  await delay(2000);
  return buildMock(params);
}

export function assertMLModelResponse(data: unknown): MLModelResponse {
  if (!data || typeof data !== "object") {
    throw new Error("ML model returned a non-object payload.");
  }
  const record = data as Partial<MLModelResponse>;
  if (!Array.isArray(record.frames) || record.frames.length === 0) {
    throw new Error("ML model response is missing a non-empty frames array.");
  }
  const frames = record.frames.map((frame, index) => {
    if (!frame || typeof frame !== "object") {
      throw new Error(`Frame ${index} is not an object.`);
    }
    if (typeof frame.year !== "number") {
      throw new Error(`Frame ${index} is missing a numeric year.`);
    }
    if (!frame.image_url && !frame.image_base64) {
      throw new Error(`Frame ${frame.year} needs image_url or image_base64.`);
    }
    const cover = frame.land_cover;
    if (!cover) throw new Error(`Frame ${frame.year} is missing land_cover.`);
    for (const key of COVER_KEYS) {
      if (typeof cover[key] !== "number" || Number.isNaN(cover[key])) {
        throw new Error(`Frame ${frame.year} is missing land_cover.${key}.`);
      }
    }
    return frame;
  });

  return {
    location: String(record.location ?? "Unknown location"),
    latitude: numberOr(record.latitude, 0),
    longitude: numberOr(record.longitude, 0),
    start_year: numberOr(record.start_year, frames[0].year),
    end_year: numberOr(record.end_year, frames[frames.length - 1].year),
    focus_area: String(record.focus_area ?? "general land use"),
    region: typeof record.region === "string" ? record.region : "",
    country: typeof record.country === "string" ? record.country : "",
    provider: record.provider === "mock" ? "mock" : "remote",
    frames,
  };
}

export function requestFromParsed(parsed: ParsedQuery): MLModelRequest {
  return {
    location: parsed.location,
    start_year: parsed.start_year,
    end_year: parsed.end_year,
    focus_area: parsed.focus_area,
    latitude: parsed.latitude,
    longitude: parsed.longitude,
    region: parsed.region,
    country: parsed.country,
  };
}

async function fetchRemoteModel(request: MLModelRequest): Promise<MLModelResponse> {
  const endpoint = process.env.ML_MODEL_ENDPOINT_URL?.trim();
  if (!endpoint) {
    throw new Error("ML_MODEL_ENDPOINT_URL is empty. Set it before turning off mock mode.");
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const apiKey = process.env.ML_MODEL_API_KEY?.trim();
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(45_000),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new Error("The ML model did not respond within 45 seconds.");
    }
    throw new Error(
      `Could not reach the ML model at ${endpoint}. ${error instanceof Error ? error.message : "Request failed."}`,
    );
  }

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 280);
    throw new Error(`ML model responded ${response.status}${detail ? `: ${detail}` : "."}`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("ML model response was not valid JSON.");
  }
  return assertMLModelResponse(payload);
}

function buildMock(request: MLModelRequest): MLModelResponse {
  const scene = inferScene(request.location, request.focus_area);
  const profile = PROFILES[scene];
  const years = sampleYears(request.start_year, request.end_year);
  const span = years[years.length - 1] - years[0] || 1;
  const coords = coordinates(request);
  const frames: YearImagery[] = years.map((year) => {
    const t = (year - years[0]) / span;
    const land_cover = coverAt(profile, t);
    return {
      year,
      image_url: tileUrl(scene, t, "photo"),
      mask_url: tileUrl(scene, t, "mask"),
      land_cover,
    };
  });

  return {
    location: request.location,
    latitude: coords.lat,
    longitude: coords.lon,
    start_year: years[0],
    end_year: years[years.length - 1],
    focus_area: request.focus_area,
    region: request.region,
    country: request.country,
    provider: "mock",
    frames,
  };
}

function coverAt(profile: (typeof PROFILES)[SceneId], t: number): Cover {
  if (profile.mid && profile.midAt) {
    if (t <= profile.midAt) {
      return normalize(lerpCover(profile.start, profile.mid, t / profile.midAt));
    }
    return normalize(
      lerpCover(profile.mid, profile.end, (t - profile.midAt) / (1 - profile.midAt)),
    );
  }
  return normalize(lerpCover(profile.start, profile.end, t));
}

function lerpCover(a: Cover, b: Cover, t: number): Cover {
  return {
    green_space: a.green_space + (b.green_space - a.green_space) * t,
    urban: a.urban + (b.urban - a.urban) * t,
    water: a.water + (b.water - a.water) * t,
    crops: a.crops + (b.crops - a.crops) * t,
    built: a.built + (b.built - a.built) * t,
  };
}

function normalize(cover: Cover): Cover {
  const sum = COVER_KEYS.reduce((total, key) => total + cover[key], 0) || 1;
  const scaled = COVER_KEYS.map((key) => Math.round((cover[key] / sum) * 1000) / 10);
  const drift = Math.round((100 - scaled.reduce((total, value) => total + value, 0)) * 10) / 10;
  scaled[0] = Math.round((scaled[0] + drift) * 10) / 10;
  return {
    green_space: scaled[0],
    urban: scaled[1],
    water: scaled[2],
    crops: scaled[3],
    built: scaled[4],
  };
}

function sampleYears(start: number, end: number) {
  const first = Math.min(start, end);
  const last = Math.max(start, end);
  const span = last - first;
  if (span <= 8) {
    return Array.from({ length: span + 1 }, (_, index) => first + index);
  }
  const years = new Set<number>([first, last]);
  for (let step = 1; step < 7; step++) {
    years.add(Math.round(first + (span * step) / 7));
  }
  return [...years].sort((a, b) => a - b);
}

function coordinates(request: MLModelRequest) {
  const lat = request.latitude;
  const lon = request.longitude;
  if (
    typeof lat === "number" &&
    typeof lon === "number" &&
    Math.abs(lat) <= 90 &&
    Math.abs(lon) <= 180 &&
    !(lat === 0 && lon === 0)
  ) {
    return { lat, lon };
  }
  return fallbackCoordinates(request.location);
}

function numberOr(value: unknown, fallback: number) {
  return typeof value === "number" && !Number.isNaN(value) ? value : fallback;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
