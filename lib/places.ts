import type { SceneId } from "@/services/tileArt";

export type Place = {
  test: RegExp;
  name: string;
  lat: number;
  lon: number;
  scene: SceneId;
};

export const PLACES: Place[] = [
  { test: /charlotte/i, name: "Charlotte", lat: 35.2271, lon: -80.8431, scene: "urban" },
  { test: /new york|nyc|manhattan|brooklyn/i, name: "New York City", lat: 40.7128, lon: -74.006, scene: "urban" },
  { test: /amazon|manaus|rondonia|rainforest/i, name: "Amazon Basin", lat: -3.4653, lon: -62.2159, scene: "amazon" },
  { test: /maldiv/i, name: "Maldives", lat: 3.2028, lon: 73.2207, scene: "coast" },
  { test: /paradise|butte county/i, name: "Paradise, California", lat: 39.7596, lon: -121.6219, scene: "wildfire" },
  { test: /dubai/i, name: "Dubai", lat: 25.2048, lon: 55.2708, scene: "desert" },
  { test: /nile/i, name: "Nile Valley", lat: 26.82, lon: 30.8, scene: "agriculture" },
  { test: /los angeles/i, name: "Los Angeles", lat: 34.0522, lon: -118.2437, scene: "urban" },
  { test: /tokyo/i, name: "Tokyo", lat: 35.6762, lon: 139.6503, scene: "urban" },
  { test: /london/i, name: "London", lat: 51.5072, lon: -0.1276, scene: "urban" },
  { test: /sahel|sahara/i, name: "Sahel", lat: 14.5, lon: -4.2, scene: "agriculture" },
  { test: /jakarta/i, name: "Jakarta", lat: -6.2088, lon: 106.8456, scene: "coast" },
  { test: /mumbai/i, name: "Mumbai", lat: 19.076, lon: 72.8777, scene: "coast" },
  { test: /lagos/i, name: "Lagos", lat: 6.5244, lon: 3.3792, scene: "urban" },
  { test: /sydney/i, name: "Sydney", lat: -33.8688, lon: 151.2093, scene: "coast" },
  { test: /paris/i, name: "Paris", lat: 48.8566, lon: 2.3522, scene: "urban" },
  { test: /cairo/i, name: "Cairo", lat: 30.0444, lon: 31.2357, scene: "desert" },
];

export function lookupPlace(text: string): Place | undefined {
  return PLACES.find((place) => place.test.test(text));
}

export function inferScene(location: string, focus: string): SceneId {
  const blob = `${location} ${focus}`.toLowerCase();
  if (/dubai|reclamation/.test(blob)) return "desert";
  if (/wildfire|burn scar|burned/.test(blob)) return "wildfire";
  if (/deforest|amazon|rainforest|logging/.test(blob)) return "amazon";
  if (/maldiv|shoreline|coastal|erosion|sea level/.test(blob)) return "coast";
  if (/farm|agricultur|crop|nile|irrigat/.test(blob)) return "agriculture";
  if (/urban|city|sprawl|housing|new york|expansion/.test(blob)) return "urban";
  return lookupPlace(location)?.scene ?? "agriculture";
}

export function fallbackCoordinates(location: string) {
  const known = lookupPlace(location);
  if (known) return { lat: known.lat, lon: known.lon };
  let h = 2166136261;
  for (const char of location) h = Math.imul(h ^ char.charCodeAt(0), 16777619);
  const lat = ((h % 10000) / 100) - 50;
  const lon = ((((h >>> 8) % 32000) / 100) - 160);
  return { lat: Math.round(lat * 100) / 100, lon: Math.round(lon * 100) / 100 };
}
