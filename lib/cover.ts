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

export function pointChangeLines(
  frames: Array<{ year: number; land_cover: LandCoverPercentages; classified?: boolean }>,
) {
  const lines: string[] = [];
  for (let index = 1; index < frames.length; index += 1) {
    const before = frames[index - 1];
    const after = frames[index];
    const keys = before.classified || after.classified
      ? MODEL_KEYS
      : (["green_space", "urban", "water", "crops", "built"] as const);
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
