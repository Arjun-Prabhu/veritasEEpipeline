export type SceneId = "amazon" | "urban" | "coast" | "agriculture" | "wildfire" | "desert";

const W = 1200;
const H = 900;

const SCENES = new Set<SceneId>([
  "amazon",
  "urban",
  "coast",
  "agriculture",
  "wildfire",
  "desert",
]);

export function isScene(value: string | null): value is SceneId {
  return !!value && SCENES.has(value as SceneId);
}

export function tileUrl(scene: SceneId, t: number, kind: "photo" | "mask") {
  const params = new URLSearchParams({
    scene,
    t: clamp01(t).toFixed(3),
    kind,
  });
  return `/api/tile?${params.toString()}`;
}

export function renderTileFromUrl(url: string): string | null {
  const params = new URL(url, "http://gaia.local").searchParams;
  const scene = params.get("scene");
  const t = Number(params.get("t"));
  if (!isScene(scene) || Number.isNaN(t)) return null;
  const kind = params.get("kind") === "mask" ? "mask" : "photo";
  return renderTile(scene, t, kind);
}

export function renderTile(scene: SceneId, t: number, kind: "photo" | "mask") {
  const mask = kind === "mask";
  const progress = clamp01(t);
  const body =
    scene === "amazon"
      ? amazon(progress, mask)
      : scene === "urban"
        ? urban(progress, mask)
        : scene === "coast"
          ? coast(progress, mask)
          : scene === "wildfire"
            ? wildfire(progress, mask)
            : scene === "desert"
              ? desert(progress, mask)
              : agriculture(progress, mask);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" seed="7" stitchTiles="stitch"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.45  0 0 0 0 0.45  0 0 0 0.28 0"/>
    </filter>
    <filter id="canopy" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="5" seed="3" stitchTiles="stitch"/>
      <feColorMatrix type="matrix" values="0.15 0 0 0 0.04  0.05 0.4 0 0 0.16  0 0.02 0.08 0 0.05  0 0 0 0.55 0"/>
    </filter>
    <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0e4c5c"/>
      <stop offset="1" stop-color="#1f8ea0"/>
    </linearGradient>
    <linearGradient id="gulf" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1a6d86"/>
      <stop offset="1" stop-color="#0d3e52"/>
    </linearGradient>
  </defs>
  ${body}
  ${mask ? "" : `<rect width="${W}" height="${H}" filter="url(#grain)"/>`}
</svg>`;
}

function amazon(t: number, mask: boolean) {
  const rand = rng(11);
  const plots: string[] = [];
  const count = Math.round(4 + t * 30);
  for (let i = 0; i < count; i++) {
    const x = 60 + rand() * 1080;
    const y = 50 + rand() * 800;
    const w = 40 + rand() * 110;
    const h = 26 + rand() * 64;
    const rot = (rand() * 36 - 18).toFixed(1);
    const field = rand() > 0.42;
    const fill = mask
      ? field
        ? "#e2c14a"
        : "#d4553a"
      : field
        ? "#c6a15a"
        : "#7d5a34";
    plots.push(
      `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="${fill}" opacity="${mask ? 0.9 : 0.96}" transform="rotate(${rot} ${(x + w / 2).toFixed(1)} ${(y + h / 2).toFixed(1)})"/>`,
    );
  }
  const water = mask ? "#2f7ea8" : "#24596a";
  const bank = mask ? "#2f7ea8" : "#c4a36a";
  const ground = mask
    ? `<rect width="${W}" height="${H}" fill="#1f8a4c" opacity="0.78"/>`
    : `<rect width="${W}" height="${H}" fill="#17492c"/><rect width="${W}" height="${H}" filter="url(#canopy)"/>`;
  const road =
    t > 0.22
      ? `<path d="M120 860 C 340 640, 520 560, 690 470 S 980 210, 1140 70" fill="none" stroke="${mask ? "#d9d4cc" : "#efe6d4"}" stroke-width="${(1.5 + t * 2.4).toFixed(2)}" stroke-linecap="round" opacity="${(0.35 + t * 0.55).toFixed(2)}"/>`
      : "";
  return `${ground}
    <path d="M-30 610 C 190 590, 250 390, 450 450 S 700 780, 880 540 S 1120 250, 1240 300" fill="none" stroke="${bank}" stroke-width="78" stroke-linecap="round"/>
    <path d="M-30 610 C 190 590, 250 390, 450 450 S 700 780, 880 540 S 1120 250, 1240 300" fill="none" stroke="${water}" stroke-width="28" stroke-linecap="round"/>
    ${plots.join("")}
    ${road}`;
}

function urban(t: number, mask: boolean) {
  const cells: string[] = [];
  const originX = 210;
  const cols = 18;
  const rows = 14;
  const size = 48;
  const gap = 8;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const roll = hash(x, y);
      const px = originX + x * (size + gap);
      const py = 48 + y * (size + gap);
      const park =
        px > 560 && px < 760 && py > 250 && py < 620 && roll > 0.25 - t * 0.18;
      const present = roll < 0.42 + t * 0.55 || park;
      if (!present) continue;
      const newer = roll > 0.62 && t > 0.35;
      let fill: string;
      if (park) fill = mask ? "#1f8a4c" : "#2f7a45";
      else if (mask) fill = newer ? "#d9d4cc" : "#d4553a";
      else fill = newer ? "#ece7df" : "#4a5160";
      cells.push(
        `<rect x="${px}" y="${py}" width="${size - 2}" height="${size - 6}" rx="2" fill="${fill}"/>`,
      );
    }
  }
  const water = mask ? "#2f7ea8" : "#1d4e66";
  const ground = mask ? "#1f8a4c" : "#1e3a2c";
  return `<rect width="${W}" height="${H}" fill="${ground}" opacity="${mask ? 0.75 : 1}"/>
    <path d="M0 0 H250 C 180 180, 280 320, 160 480 C 80 620, 240 740, 140 900 H0 Z" fill="${water}"/>
    <path d="M860 900 C 980 760, 900 640, 1040 520 C 1160 410, 1080 220, 1200 140 V900 Z" fill="${water}" opacity="0.95"/>
    ${cells.join("")}`;
}

function coast(t: number, mask: boolean) {
  const shrink = 1 - t * 0.34;
  const sand = mask ? "#e2c14a" : "#e7d3a4";
  const veg = mask ? "#1f8a4c" : "#2d7a49";
  const built = mask ? "#d9d4cc" : "#f4f1ea";
  const urban = mask ? "#d4553a" : "#c46a58";
  const buildings: string[] = [];
  const count = Math.round(6 + t * 16);
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const radius = (28 + (i % 4) * 22) * shrink;
    const x = 430 + Math.cos(angle) * radius - 6;
    const y = 600 + Math.sin(angle) * radius * 0.5 - 4;
    buildings.push(
      `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="12" height="8" rx="1" fill="${i % 2 ? built : urban}"/>`,
    );
  }
  return `<rect width="${W}" height="${H}" fill="${mask ? "#2f7ea8" : "url(#sea)"}"/>
    <ellipse cx="430" cy="620" rx="${260 * shrink}" ry="${150 * shrink}" fill="${sand}" opacity="0.95"/>
    <ellipse cx="760" cy="250" rx="${180 * (1 - t * 0.42)}" ry="${70 * (1 - t * 0.42)}" fill="${sand}"/>
    <ellipse cx="430" cy="600" rx="${150 * shrink}" ry="${78 * shrink}" fill="${veg}"/>
    <ellipse cx="760" cy="242" rx="${90 * (1 - t * 0.42)}" ry="${28 * (1 - t * 0.42)}" fill="${veg}"/>
    ${buildings.join("")}
    <path d="M80 200 C 220 240, 180 420, 90 560" fill="none" stroke="${mask ? "#d9d4cc" : "#dff4f6"}" stroke-width="6" opacity="0.7"/>`;
}

function agriculture(t: number, mask: boolean) {
  const rand = rng(19);
  const fields: string[] = [];
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 8; x++) {
      const px = 40 + x * 140 + (y % 2) * 12;
      const py = 30 + y * 96;
      const roll = rand();
      const developed = x > 5 && roll < t * 0.9;
      const crop = roll > 0.28 - t * 0.1;
      const fill = mask
        ? developed
          ? "#d4553a"
          : crop
            ? "#e2c14a"
            : "#1f8a4c"
        : developed
          ? "#b9b4ac"
          : crop
            ? roll > 0.7
              ? "#d2b15a"
              : "#7ea84a"
            : "#2f6d3e";
      fields.push(
        `<rect x="${px}" y="${py}" width="128" height="84" rx="2" fill="${fill}" stroke="${mask ? "none" : "rgba(0,0,0,0.18)"}" stroke-width="2"/>`,
      );
    }
  }
  const pivots: string[] = [];
  const pivotCount = Math.round(2 + t * 4);
  for (let i = 0; i < pivotCount; i++) {
    const cx = 160 + i * 150;
    const cy = 180 + (i % 3) * 200;
    pivots.push(
      `<circle cx="${cx}" cy="${cy}" r="46" fill="none" stroke="${mask ? "#1f8a4c" : "#356b38"}" stroke-width="14" opacity="0.85"/>`,
    );
  }
  const water = mask ? "#2f7ea8" : "#3d7f92";
  return `<rect width="${W}" height="${H}" fill="${mask ? "#1f8a4c" : "#234a30"}"/>
    ${fields.join("")}
    ${pivots.join("")}
    <path d="M-10 120 C 200 180, 260 80, 480 150 S 820 300, 1220 80" fill="none" stroke="${water}" stroke-width="34" stroke-linecap="round"/>`;
}

function wildfire(t: number, mask: boolean) {
  const burn = Math.min(1, t / 0.42);
  const heal = clamp01((t - 0.42) / 0.58);
  const scarRx = 80 + burn * 340;
  const scarRy = 50 + burn * 210;
  const ground = mask
    ? `<rect width="${W}" height="${H}" fill="#1f8a4c" opacity="0.8"/>`
    : `<rect width="${W}" height="${H}" fill="#1a4328"/><rect width="${W}" height="${H}" filter="url(#canopy)"/>`;
  const scarFill = mask ? "#d4553a" : "#6a4634";
  const regrowth: string[] = [];
  if (heal > 0) {
    const rand = rng(27);
    const dots = Math.round(heal * 40);
    for (let i = 0; i < dots; i++) {
      const x = 360 + rand() * 520;
      const y = 220 + rand() * 420;
      regrowth.push(
        `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(6 + rand() * 10).toFixed(1)}" fill="${mask ? "#1f8a4c" : "#3e8f4e"}" opacity="${(0.45 + heal * 0.5).toFixed(2)}"/>`,
      );
    }
  }
  const roofs: string[] = [];
  const roofCount = Math.round(3 + t * 8);
  for (let i = 0; i < roofCount; i++) {
    roofs.push(
      `<rect x="${80 + (i % 5) * 22}" y="${640 + Math.floor(i / 5) * 16}" width="16" height="11" fill="${mask ? "#d9d4cc" : "#efeae2"}"/>`,
    );
  }
  return `${ground}
    <ellipse cx="620" cy="430" rx="${scarRx}" ry="${scarRy}" fill="${scarFill}" opacity="${mask ? 0.82 : 0.92}" transform="rotate(-18 620 430)"/>
    ${regrowth.join("")}
    <path d="M0 700 H260 V900 H0 Z" fill="${mask ? "#2f7ea8" : "#24566a"}"/>
    ${roofs.join("")}`;
}

function desert(t: number, mask: boolean) {
  const blocks: string[] = [];
  const cols = 16;
  const rows = 10;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const roll = hash(x + 3, y + 5);
      if (roll > 0.25 + t * 0.7) continue;
      const px = 430 + x * 42;
      const py = 80 + y * 42;
      const tower = roll > 0.55 && t > 0.45;
      const fill = mask
        ? tower
          ? "#d9d4cc"
          : "#d4553a"
        : tower
          ? "#f7f4ee"
          : "#8d929c";
      blocks.push(
        `<rect x="${px}" y="${py}" width="${tower ? 16 : 30}" height="${tower ? 28 : 30}" fill="${fill}"/>`,
      );
    }
  }
  const palm = clamp01(t * 1.25);
  const fronds = Array.from({ length: 10 }, (_, i) => {
    const angle = (i / 10) * 360;
    return `<rect x="22" y="-5" width="48" height="10" rx="5" fill="${mask ? "#1f8a4c" : "#2f7a45"}" transform="rotate(${angle})"/>`;
  }).join("");
  const sand = mask ? "#e2c14a" : "#c6a56b";
  const water = mask ? "#2f7ea8" : "url(#gulf)";
  return `<rect width="${W}" height="${H}" fill="${sand}"/>
    <path d="M0 0 H520 C 390 160, 560 300, 420 470 C 300 640, 520 760, 390 900 H0 Z" fill="${water}"/>
    ${blocks.join("")}
    <g transform="translate(250 ${640 - t * 30}) scale(${(0.35 + palm * 0.85).toFixed(3)})" opacity="${palm.toFixed(2)}">
      <circle r="34" fill="${sand}"/>
      ${fronds}
      <circle r="10" fill="${mask ? "#d9d4cc" : "#f4efe4"}"/>
    </g>`;
}

function hash(x: number, y: number) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}
