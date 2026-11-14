import type { SceneId } from "@/services/tileArt";

export type CaseStudy = {
  id: string;
  title: string;
  place: string;
  years: string;
  focus: string;
  summary: string;
  prompt: string;
  scene: SceneId;
  t: number;
};

export const CASES: CaseStudy[] = [
  {
    id: "amazon-deforestation",
    title: "Amazon Deforestation",
    place: "Amazon Basin",
    years: "2018–2024",
    focus: "Forest to farm",
    summary: "Clearings open along the river roads, and the canopy stops being the whole story.",
    prompt: "Show deforestation in the Amazon from 2018 to 2024",
    scene: "amazon",
    t: 0.85,
  },
  {
    id: "nyc-expansion",
    title: "NYC Urban Expansion",
    place: "New York City",
    years: "2021–2026",
    focus: "Built land",
    summary: "The grid tightens, the parks hold a smaller share, and the harbor edge gets harder.",
    prompt: "How has the land in New York City changed from 2021 to 2026?",
    scene: "urban",
    t: 0.9,
  },
  {
    id: "maldives-shore",
    title: "Maldives Shoreline",
    place: "Maldives",
    years: "2016–2026",
    focus: "Coastal change",
    summary: "The islands shrink in the frame as water takes the ground the buildings still occupy.",
    prompt: "Are the Maldives losing shoreline between 2016 and 2026?",
    scene: "coast",
    t: 0.8,
  },
  {
    id: "paradise-fire",
    title: "Paradise Fire Scar",
    place: "Paradise, California",
    years: "2018–2025",
    focus: "Wildfire recovery",
    summary: "A burn opens the forest, then a partial green return shares the ground with new roofs.",
    prompt: "How did wildfire reshape the land around Paradise, California from 2018 to 2025?",
    scene: "wildfire",
    t: 0.72,
  },
  {
    id: "dubai-coast",
    title: "Dubai Coastal Growth",
    place: "Dubai",
    years: "2015–2026",
    focus: "Reclamation",
    summary: "Sand becomes street, and a palm of new land reaches into the gulf.",
    prompt: "Track Dubai's coastal growth from 2015 to 2026",
    scene: "desert",
    t: 0.88,
  },
  {
    id: "nile-farms",
    title: "Nile Valley Farms",
    place: "Nile Valley",
    years: "2019–2026",
    focus: "Agriculture",
    summary: "Fields multiply along the river while the uncultivated green and the water both give ground.",
    prompt: "How have farms along the Nile changed since 2019?",
    scene: "agriculture",
    t: 0.7,
  },
];

export const PROMPT_CHIPS = CASES.map((item) => ({
  label: item.place,
  prompt: item.prompt,
}));

export function caseById(id: string) {
  return CASES.find((item) => item.id === id);
}
