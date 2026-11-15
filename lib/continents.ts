export type ContinentId =
  | "north-america"
  | "south-america"
  | "europe"
  | "africa"
  | "asia"
  | "australia"
  | "antarctica";

export type Continent = {
  id: ContinentId;
  name: string;
  blurb: string;
};

export const CONTINENTS: Continent[] = [
  {
    id: "north-america",
    name: "North America",
    blurb: "Cities, forest, and fire scars share one landmass, from the eastern seaboard to the western burn.",
  },
  {
    id: "south-america",
    name: "South America",
    blurb: "Rainforest, river roads, and clearings that keep moving the tree line.",
  },
  {
    id: "europe",
    name: "Europe",
    blurb: "Old cities, farmed plains, and coasts redrawn over centuries.",
  },
  {
    id: "africa",
    name: "Africa",
    blurb: "Desert, river valleys, and farmland pressed against the green edge of the Nile and the Sahel.",
  },
  {
    id: "asia",
    name: "Asia",
    blurb: "Megacities, reclaimed shores, and islands sitting close to the water line.",
  },
  {
    id: "australia",
    name: "Australia",
    blurb: "A dry interior, a farmed rim, and coasts that carry most of the people.",
  },
  {
    id: "antarctica",
    name: "Antarctica",
    blurb: "Ice, with almost none of the land-cover change a city would recognize.",
  },
];

export function continentAt(lat: number, lon: number): Continent | null {
  let id: ContinentId | null = null;
  if (lat < -58) id = "antarctica";
  else if (lat < -10 && lat > -48 && lon > 110 && lon < 180) id = "australia";
  else   if (lat <= 7.5 && lon < -30 && lon > -85) id = "south-america";
  else if (lat > 7.5 && lon <= -52 && lon >= -180) id = "north-america";
  else if (lat > 58 && lon < -10 && lon > -75) id = "north-america";
  else if (lat > 35 && lat < 72 && lon > -25 && lon < 40) id = "europe";
  else if (lat > -36 && lat <= 37 && lon > -20 && lon < 52) id = "africa";
  else if (lat > -10 && lat < 78) id = "asia";
  return CONTINENTS.find((item) => item.id === id) ?? null;
}
