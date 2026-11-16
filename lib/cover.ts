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

export function coverSummary(year: number, cover: LandCoverPercentages, classified: boolean) {
  if (!classified) {
    return `${year}: green ${cover.green_space}, urban ${cover.urban}, water ${cover.water}, crops ${cover.crops}, built ${cover.built}`;
  }
  const parts = MODEL_KEYS.map((key) => `${key} ${Number(cover[key] ?? 0).toFixed(2)}`);
  return `${year}: ${parts.join(", ")}`;
}
