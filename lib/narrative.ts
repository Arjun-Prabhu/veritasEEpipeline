import type { LandCoverPercentages, MLModelResponse } from "@/services/mlModelService";

export type Analysis = {
  headline: string;
  observed_changes: string;
  root_causes: string;
  future_predictions: string;
  mitigation: string[];
  source: "gemini" | "local";
};

type CoverKey = keyof LandCoverPercentages;

const LABELS: Record<CoverKey, string> = {
  green_space: "green space",
  urban: "urban land",
  water: "water",
  crops: "cropland",
  built: "built land",
};

export function localNarrative(prompt: string, imagery: MLModelResponse): Omit<Analysis, "source"> {
  const first = imagery.frames[0];
  const last = imagery.frames[imagery.frames.length - 1];
  const delta = (key: CoverKey) => last.land_cover[key] - first.land_cover[key];
  const years = Math.max(1, last.year - first.year);
  const place = imagery.location;
  const green = delta("green_space");
  const built = delta("built");
  const water = delta("water");
  const crops = delta("crops");
  const urban = delta("urban");

  const shifts = (Object.keys(LABELS) as CoverKey[])
    .map((key) => `${LABELS[key]} ${signed(delta(key))}`)
    .join(", ");

  const headline =
    green < -8
      ? `${place} is losing the living layer of its map.`
      : water > 6
        ? `Water is redrawing the edge of ${place}.`
        : built > 8 || urban > 8
          ? `${place} is paving over its own margin.`
          : green > 5
            ? `Green cover is finding its way back in ${place}.`
            : `${place} is changing in small, steady increments.`;

  const observed = `From ${first.year} to ${last.year}, the tile over ${place} moved like this: ${shifts}. The strongest swing is ${strongest(delta)}. The original question was “${prompt.trim()}”, read here as a ${imagery.focus_area} story. These percentages are the measured stand-in for what a finished classifier would return for each year.`;

  const root = rootCause(imagery.focus_area, place, { green, built, water, crops, urban });

  const projectedGreen = clamp(last.land_cover.green_space + (green / years) * 5, 0, 100);
  const projectedBuilt = clamp(last.land_cover.built + (built / years) * 5, 0, 100);
  const projectedWater = clamp(last.land_cover.water + (water / years) * 5, 0, 100);
  const future = `If the ${years}-year rate held for another five years, green space would sit near ${projectedGreen.toFixed(1)}%, built land near ${projectedBuilt.toFixed(1)}%, and water near ${projectedWater.toFixed(1)}% by ${last.year + 5}. That is a straight-line reading, not a climate model — it shows the cost of doing nothing more than repeating the recent pace. Places rarely move in a perfect line, but the direction is already visible in the archive.`;

  return {
    headline,
    observed_changes: observed,
    root_causes: root,
    future_predictions: future,
    mitigation: actions(imagery.focus_area, { green, built, water, crops, urban }, place),
  };
}

function rootCause(
  focus: string,
  place: string,
  d: { green: number; built: number; water: number; crops: number; urban: number },
) {
  const topic = focus.toLowerCase();
  if (topic.includes("deforest")) {
    return `In ${place}, a drop in green space alongside rising cropland is the usual signature of forest converted to pasture and farms, then cut by roads that make the next clearing cheaper. Commodity prices, weak tenure, and fire used as a clearing tool all push in the same direction. The tile does not name a single owner — it shows the pattern those pressures leave.`;
  }
  if (topic.includes("wildfire")) {
    return `${place} carries a fire-adapted landscape that recent hotter, longer dry seasons have pushed past its old limits. Ignition, wind, and fuel build-up open a scar quickly; rebuilding on the same lots then lifts the built share before the canopy has fully returned. The mid-record dip and partial green recovery match that sequence.`;
  }
  if (topic.includes("coast") || d.water > 6) {
    return `Along ${place}, higher water on the tile usually means shore retreat, chronic flooding, or both. Sea level, storms, and the loss of reefs, mangroves, or dunes let the sea claim ground that maps still show as land. Hard edges such as seawalls can protect one parcel while speeding erosion next door.`;
  }
  if (topic.includes("agricultur") || d.crops > 5) {
    return `Farming along ${place} intensifies when irrigation, new markets, or a longer growing season make another harvest worth the water and the soil. Green space falls when hedgerows, wetlands, and fallow disappear, and the built edge creeps out when towns follow the fields.`;
  }
  if (d.built > 5 || d.urban > 5 || topic.includes("urban")) {
    return `${place} adds roofs and pavement when housing demand, jobs, and roads outrun the room set aside for them. Infilling a lot is gentler than expanding the fringe, but both replace soil that used to hold rain and cool the street. The rising built and urban shares are that choice, counted.`;
  }
  return `Several ordinary forces can move a landscape at once: climate stress, commodity prices, infrastructure, and local land rules. In ${place} the class shifts are modest but consistent, which usually means a policy and a market pulling the same way rather than a single sudden event.`;
}

function actions(
  focus: string,
  d: { green: number; built: number; water: number; crops: number; urban: number },
  place: string,
) {
  const topic = focus.toLowerCase();
  if (topic.includes("deforest") || d.green < -8) {
    return [
      `Publish the annual clearing map for ${place} and tie farm credit and export permits to zero new deforestation on the parcel.`,
      "Secure tenure for communities that already keep forest standing, so the next road does not become the next frontier.",
      "Restore corridors along the rivers in the tile first — they reconnect habitat and cool the cleared edge.",
      "Fund fire brigades and early-season burns where fire is being used as a cheap substitute for machinery.",
    ];
  }
  if (topic.includes("wildfire")) {
    return [
      `Keep new construction in ${place} out of the highest burn-recurrence zones, and require ember-resistant roofs where rebuilding is allowed.`,
      "Treat the recovering scar as habitat: leave nurse logs, plant local species, and hold off on converting it to lots.",
      "Thin and graze the fuel at the town edge before the next dry season, not after the next evacuation.",
      "Map home-hardening progress street by street so the built share can rise without the risk rising with it.",
    ];
  }
  if (topic.includes("coast") || d.water > 6) {
    return [
      `Stop new permanent building inside the recent high-water line in ${place}, and plan a funded path for the structures already there.`,
      "Restore mangroves, reefs, or dunes in front of the settlements instead of extending the seawall by default.",
      "Raise or relocate roads and wells that the tile shows are now on the wet side of the old shore.",
      "Publish a five-year retreat map so residents can see which streets are being protected and which are being let go.",
    ];
  }
  if (d.built > 5 || d.urban > 5 || topic.includes("urban")) {
    return [
      `Set a canopy target for ${place} and plant it in the hottest, most paved districts first, not only in the parks that already exist.`,
      "Require permeable surfaces and on-site water storage for new roofs so the next storm has somewhere to go.",
      "Steer housing into already-served lots before opening new fringe, and pair that with transit so the built edge does not have to sprawl.",
      "Keep the remaining green space in the tile under a designation that is harder to redraw than a zoning footnote.",
    ];
  }
  return [
    `Watch the same tile every year and publish the five class percentages so a slow shift in ${place} cannot hide.`,
    "Protect the water and the remaining green space with buffers that farming and building both have to respect.",
    "Pay for soil cover and fallow where cropland is expanding fastest, so yield does not depend on stripping the last shade.",
    "Review permits against this record before approving the next road, canal, or subdivision.",
  ];
}

function strongest(delta: (key: CoverKey) => number) {
  const keys = Object.keys(LABELS) as CoverKey[];
  const top = keys.sort((a, b) => Math.abs(delta(b)) - Math.abs(delta(a)))[0];
  return `${LABELS[top]} (${signed(delta(top))})`;
}

function signed(value: number) {
  const points = `${Math.abs(value).toFixed(1)} pts`;
  return value > 0 ? `+${points}` : value < 0 ? `−${points}` : points;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
