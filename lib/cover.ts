import type { LandCoverPercentages } from "@/services/mlModelService";

const MODEL_KEYS = [
  "water",
  "trees",
  "grass",
  "flooded_vegetation",
  "crops",
  "shrub_and_scrub",
  "built",
  "bare",
  "snow_and_ice",
] as const;

export type ModelClass = (typeof MODEL_KEYS)[number];

export function modelClassKeys() {
  return MODEL_KEYS;
}

const LEGACY_KEYS = ["green_space", "urban", "water", "crops", "built"] as const;

export function imageQualityNote(year: number) {
  return `${year}: image quality is too poor to read this year.`;
}

export function unreliableYears(
  frames: Array<{ year: number; land_cover: LandCoverPercentages; classified?: boolean }>,
) {
  return frames.flatMap((frame, index) => (qualityIssue(frames, index) ? [frame.year] : []));
}

function qualityIssue(
  frames: Array<{ year: number; land_cover: LandCoverPercentages; classified?: boolean }>,
  index: number,
) {
  const cover = frames[index]?.land_cover;
  if (!cover) return false;
  const keys = frames[index]?.classified ? MODEL_KEYS : LEGACY_KEYS;
  const top = Math.max(...keys.map((key) => Number(cover[key] ?? 0)));
  if (top <= 90) return false;
  return [frames[index - 1], frames[index + 1]].some((other) => {
    if (!other) return false;
    return keys.some(
      (key) => Math.abs(Number(cover[key] ?? 0) - Number(other.land_cover[key] ?? 0)) >= 40,
    );
  });
}

export function pointChangeLines(
  frames: Array<{ year: number; land_cover: LandCoverPercentages; classified?: boolean }>,
) {
  const bad = new Set(unreliableYears(frames));
  const lines: string[] = [];
  frames.forEach((frame) => {
    if (bad.has(frame.year)) lines.push(imageQualityNote(frame.year));
  });
  for (let index = 1; index < frames.length; index += 1) {
    const before = frames[index - 1];
    const after = frames[index];
    if (bad.has(before.year) || bad.has(after.year)) continue;
    const keys = before.classified || after.classified ? MODEL_KEYS : LEGACY_KEYS;
    const shifts = keys.flatMap((key) => {
      const change = Number(after.land_cover[key] ?? 0) - Number(before.land_cover[key] ?? 0);
      if (Math.abs(change) < 0.05) return [];
      const name = key.replaceAll("_", " ");
      return [`${name} ${change > 0 ? "+" : ""}${change.toFixed(1)} points`];
    });
    lines.push(`${before.year}–${after.year}: ${shifts.join(", ") || "no class moved by 0.1 points"}.`);
  }
  return lines.join("\n");
}

export function coverSummary(year: number, cover: LandCoverPercentages, classified: boolean) {
  if (!classified) {
    return `${year}: green ${cover.green_space}, urban ${cover.urban}, water ${cover.water}, crops ${cover.crops}, built ${cover.built}`;
  }
  const parts = MODEL_KEYS.map((key) => `${key} ${Number(cover[key] ?? 0).toFixed(2)}`);
  return `${year}: ${parts.join(", ")}`;
}
