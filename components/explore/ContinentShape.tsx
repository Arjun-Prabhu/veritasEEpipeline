import type { ExploreContinent } from "@/lib/landmarks";

const PATHS: Record<ExploreContinent, string> = {
  "north-america":
    "M62 10c12-2 24 6 28 18 6 12 2 22-6 28 10 4 16 14 10 26-6 12-18 16-26 28-6 8-16 4-20-6-8 8-20 4-24-8-6-14 2-26-2-40-4-12 6-26 18-32 8-4 16-12 22-14z",
  "south-america":
    "M68 12c12 8 18 24 14 40-4 16-10 32-18 48-6 14-16 22-22 12-6-10-2-26-6-42-6-16-2-32 6-46 6-10 16-18 26-12z",
  europe:
    "M28 48c10-16 28-22 44-14 14 6 26 2 32 12 6 10-4 18-16 16 6 12-4 22-18 20-14 8-30 2-38-10-8-12-10-16-4-24z",
  africa:
    "M58 10c14-2 26 8 30 22 6 16 2 34-4 50-6 18-16 36-26 34-12-2-18-18-20-34-4-18-6-36 2-52 6-12 12-20 18-20z",
  asia:
    "M18 52c12-22 36-28 54-22 18-8 40 0 54 14 8 12 2 24-12 26 8 12-6 24-24 20-12 12-32 8-46-4-14-10-22-20-26-34z",
  australia:
    "M36 46c18-16 48-18 70 0 12 12 8 28-10 36-20 10-48 4-64-12-10-10-8-18 4-24z",
};

export default function ContinentShape({ id }: { id: ExploreContinent }) {
  return (
    <svg viewBox="0 0 140 150" className="h-28 w-full text-[#7dccff]" aria-hidden>
      <path d={PATHS[id]} fill="currentColor" />
    </svg>
  );
}
