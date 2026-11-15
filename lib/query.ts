import { fallbackCoordinates, lookupPlace } from "@/lib/places";

export type ParsedQuery = {
  location: string;
  start_year: number;
  end_year: number;
  focus_area: string;
  latitude: number;
  longitude: number;
};

const CURRENT_YEAR = 2026;

export function parsePromptLocally(prompt: string): ParsedQuery {
  const years = [...prompt.matchAll(/\b(19[7-9]\d|20[0-2]\d)\b/g)].map((match) =>
    Number(match[1]),
  );
  let start = 2021;
  let end = CURRENT_YEAR;
  if (years.length === 1) {
    start = years[0];
    end = /since|from|after/i.test(prompt) ? CURRENT_YEAR : Math.min(CURRENT_YEAR, start + 5);
  } else if (years.length >= 2) {
    start = Math.min(...years);
    end = Math.max(...years);
  }
  if (end < start) [start, end] = [end, start];
  start = clampYear(start);
  end = clampYear(end);

  const known = lookupPlace(prompt);
  let location = known?.name ?? "the selected region";
  if (!known) {
    const named = prompt.match(
      /\b(?:in|around|across|along|near|of)\s+(?:the\s+)?([A-Za-z][A-Za-z.'-]+(?:\s+[A-Za-z][A-Za-z.'-]+){0,3})/,
    );
    if (named) {
      location = named[1].replace(/\b(from|between|over|since|during)\b.*$/i, "").trim();
    }
  }

  const focus = detectFocus(prompt);
  const explicit = explicitCoordinates(prompt);
  const coords = explicit
    ? explicit
    : known
      ? { lat: known.lat, lon: known.lon }
      : fallbackCoordinates(location);
  if (explicit) location = `${explicit.lat.toFixed(2)}, ${explicit.lon.toFixed(2)}`;

  return {
    location,
    start_year: start,
    end_year: end,
    focus_area: focus,
    latitude: coords.lat,
    longitude: coords.lon,
  };
}

export function sanitizeParsed(raw: Partial<ParsedQuery>, prompt: string): ParsedQuery {
  const local = parsePromptLocally(prompt);
  const start = Number(raw.start_year);
  const end = Number(raw.end_year);
  const lat = Number(raw.latitude);
  const lon = Number(raw.longitude);
  let startYear = Number.isFinite(start) ? clampYear(Math.round(start)) : local.start_year;
  let endYear = Number.isFinite(end) ? clampYear(Math.round(end)) : local.end_year;
  if (endYear < startYear) [startYear, endYear] = [endYear, startYear];
  const explicit = explicitCoordinates(prompt);
  const named = (raw.location || "").trim();
  const namedPlace = named && !looksLikeCoordinates(named) ? named : "";
  const location = namedPlace || local.location;
  const coords = explicit
    ? explicit
    : Number.isFinite(lat) &&
        Number.isFinite(lon) &&
        Math.abs(lat) <= 90 &&
        Math.abs(lon) <= 180 &&
        !(lat === 0 && lon === 0)
      ? { lat, lon }
      : fallbackCoordinates(location);

  return {
    location,
    start_year: startYear,
    end_year: endYear,
    focus_area: (raw.focus_area || local.focus_area).trim() || local.focus_area,
    latitude: coords.lat,
    longitude: coords.lon,
  };
}

function looksLikeCoordinates(value: string) {
  return /^-?\d+(?:\.\d+)?\s*,\s*-?\d+/.test(value.trim());
}

function explicitCoordinates(prompt: string) {
  const match = prompt.match(/latitude\s+(-?\d+(?:\.\d+)?)\s*,\s*longitude\s+(-?\d+(?:\.\d+)?)/i);
  if (!match) return null;
  const lat = Number(match[1]);
  const lon = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
}

function detectFocus(prompt: string) {
  const text = prompt.toLowerCase();
  if (/deforest|logging|forest loss/.test(text)) return "deforestation";
  if (/wildfire|burn/.test(text)) return "wildfire recovery";
  if (/shore|coast|erosion|sea level|island/.test(text)) return "coastal change";
  if (/farm|crop|agricultur|irrigat/.test(text)) return "agriculture";
  if (/urban|city|sprawl|built|expansion|growth/.test(text)) return "urban development";
  return "general land use";
}

function clampYear(year: number) {
  return Math.min(CURRENT_YEAR, Math.max(1972, year));
}
