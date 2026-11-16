"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { cx, formatCoord, frameSrc } from "@/lib/format";
import type { LandCoverPercentages, MLModelResponse } from "@/services/mlModelService";

const MiniGlobe = dynamic(() => import("./MiniGlobe"), { ssr: false });

const LEGACY: Array<{ key: keyof LandCoverPercentages; label: string; swatch: string }> = [
  { key: "green_space", label: "Green space", swatch: "bg-[#1f8a4c]" },
  { key: "crops", label: "Crops", swatch: "bg-[#e2c14a]" },
  { key: "urban", label: "Urban", swatch: "bg-[#d4553a]" },
  { key: "built", label: "Built", swatch: "bg-[#e23b3b]" },
  { key: "water", label: "Water", swatch: "bg-[#2f7edb]" },
];

const MODEL: Array<{ key: keyof LandCoverPercentages; label: string; swatch: string }> = [
  { key: "built", label: "Built", swatch: "bg-[#e23b3b]" },
  { key: "trees", label: "Trees", swatch: "bg-[#1f8a4c]" },
  { key: "grass", label: "Grass", swatch: "bg-[#7dcc6a]" },
  { key: "shrub_and_scrub", label: "Shrub", swatch: "bg-[#8a9a4a]" },
  { key: "crops", label: "Crops", swatch: "bg-[#e2c14a]" },
  { key: "bare", label: "Bare", swatch: "bg-[#c4a574]" },
  { key: "water", label: "Water", swatch: "bg-[#2f7edb]" },
  { key: "flooded_vegetation", label: "Flooded", swatch: "bg-[#3d9a8a]" },
  { key: "snow_and_ice", label: "Snow", swatch: "bg-[#d7e6f5]" },
];

export default function CompareStage({ imagery }: { imagery: MLModelResponse }) {
  const frames = imagery.frames;
  const [index, setIndex] = useState(frames.length - 1);
  const [position, setPosition] = useState(56);
  const [maskOn, setMaskOn] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setIndex(frames.length - 1);
    setPosition(56);
    setPlaying(false);
  }, [imagery, frames.length]);

  useEffect(() => {
    if (!playing || frames.length < 2) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current >= frames.length - 1 ? 1 : current + 1));
    }, 900);
    return () => window.clearInterval(timer);
  }, [playing, frames.length]);

  const before = frames[0];
  const after = frames[Math.max(frames.length > 1 ? 1 : 0, index)];
  const beforePhoto = frameSrc(before, "photo");
  const afterPhoto = frameSrc(after, "photo");
  const beforeMask = frameSrc(before, "mask");
  const afterMask = frameSrc(after, "mask");
  const single = frames.length < 2;
  const measured = frames.some((item) => item.classified);
  const palette = measured ? MODEL : LEGACY;
  const suspect = new Set(
    frames.flatMap((frame, frameIndex) => (qualityIssue(frames, frameIndex, palette) ? [frame.year] : [])),
  );
  const classes = palette.filter((item) => {
    const earlier = Number(before.land_cover[item.key] ?? 0);
    const later = Number(after.land_cover[item.key] ?? 0);
    return earlier > 0.05 || later > 0.05;
  });
  const beforeShown = maskOn && beforeMask ? beforeMask : beforePhoto;
  const afterShown = maskOn && afterMask ? afterMask : afterPhoto;
  const frame = usePictureFrame(afterPhoto || beforePhoto);

  return (
    <section className="flex min-h-0 flex-col gap-4 overflow-auto rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-lime">{imagery.focus_area}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-3">
            <h2 className="font-serif text-3xl text-ink md:text-4xl">{imagery.location}</h2>
            <span className="prompt-gun inline-flex rounded-full">
              <button
                type="button"
                aria-pressed={maskOn}
                onClick={() => setMaskOn((value) => !value)}
                className={cx(
                  "class-toggle relative z-[1] m-[1.5px] rounded-full px-6 py-3 text-base",
                  maskOn ? "bg-lime text-[#071018]" : "bg-[#05060f] text-ink",
                )}
              >
                <span className="class-toggle-label">
                  Classification
                  <span className="class-toggle-extra">{maskOn ? " on" : " view"}</span>
                </span>
              </button>
            </span>
          </div>
          <p className="mt-1 text-sm text-ink/65">
            {imagery.start_year}–{imagery.end_year}
            <span className="mx-2 text-ink/30">/</span>
            {formatCoord(imagery.latitude, imagery.longitude)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 self-start">
          {[imagery.region, imagery.country].filter(Boolean).length > 0 && (
            <p className="text-right text-[11px] tracking-wide text-ink/50">
              {[imagery.region, imagery.country].filter(Boolean).join(", ")}
            </p>
          )}
          <div className="flex items-center gap-2">
          {frames.length > 2 && (
            <button
              type="button"
              onClick={() => setPlaying((value) => !value)}
              className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-ink/80 hover:bg-white/5"
            >
              {playing ? "Pause years" : "Play years"}
            </button>
          )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_148px]">
        <div>
          <div
            className="relative w-full overflow-hidden rounded-2xl bg-black"
            style={{ aspectRatio: frame.aspect }}
          >
            {single ? (
              <FrameImage src={beforeShown} alt={`${before.year} satellite tile`} frame={frame} />
            ) : (
              <>
                <FrameImage src={afterShown} alt={`${after.year} satellite tile`} frame={frame} />
                <div
                  className="absolute inset-0"
                  style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
                >
                  <FrameImage src={beforeShown} alt={`${before.year} satellite tile`} frame={frame} />
                </div>
                <div
                  className="pointer-events-none absolute inset-y-0 z-10 w-px bg-white"
                  style={{ left: `${position}%` }}
                >
                  <div className="absolute left-1/2 top-1/2 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-lime text-[11px] font-semibold text-[#071018]">
                    ↔
                  </div>
                </div>
                <label className="sr-only" htmlFor="compare-range">
                  Drag to compare {before.year} and {after.year}
                </label>
                <input
                  id="compare-range"
                  type="range"
                  min={0}
                  max={100}
                  value={position}
                  onChange={(event) => setPosition(Number(event.target.value))}
                  className="absolute inset-0 z-20 cursor-ew-resize opacity-0"
                />
                <span className="absolute bottom-3 left-3 rounded-full bg-black/55 px-2.5 py-1 text-xs text-white">
                  {before.year}
                </span>
                <span className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-xs text-white">
                  {after.year}
                </span>
              </>
            )}
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {frames.map((frame, frameIndex) => {
              const active = frame.year === after.year || (single && frameIndex === 0);
              return (
                <button
                  key={frame.year}
                  type="button"
                  onClick={() => {
                    setPlaying(false);
                    setIndex(frameIndex);
                  }}
                  className={cx(
                    "shrink-0 rounded-full border px-3 py-1 text-xs",
                    active ? "border-lime bg-lime text-[#071018]" : "border-white/15 text-ink/75 hover:bg-white/5",
                  )}
                >
                  {frame.year}
                  {suspect.has(frame.year) ? " · image quality issue" : ""}
                </button>
              );
            })}
          </div>
          {imagery.provider === "mock" && (
            <p className="mt-2 text-xs leading-relaxed text-ink/50">
              Placeholder tiles for this focus. Your model’s images replace them without a change to this screen.
            </p>
          )}
        </div>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/20">
          <div className="h-36 w-36">
            <MiniGlobe lat={imagery.latitude} lon={imagery.longitude} />
          </div>
          <p className="px-3 pb-3 text-center text-[11px] tracking-wide text-ink/60">
            {formatCoord(imagery.latitude, imagery.longitude)}
          </p>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.16em] text-ink/50">
          <span>{before.year}</span>
          <span>Land cover</span>
          <span>{after.year}</span>
        </div>
        {suspect.has(before.year) || suspect.has(after.year) ? (
          <p className="text-sm text-clay">
            Image quality issue
            {[before, after]
              .filter((frame) => suspect.has(frame.year))
              .map((frame) => ` for ${frame.year}`)
              .join(",")}
            . That year is not shown as a change.
          </p>
        ) : (
          <>
        <Stack cover={before.land_cover} classes={classes} />
        {!single && (
          <div className="mt-2">
            <Stack cover={after.land_cover} classes={classes} />
          </div>
        )}
        <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-ink/75 sm:grid-cols-3">
          {classes.map((item) => {
            const current = Number(after.land_cover[item.key] ?? 0);
            const change = current - Number(before.land_cover[item.key] ?? 0);
            return (
              <li key={item.key} className="flex items-center gap-1.5">
                <span className={cx("h-2 w-2 rounded-full", item.swatch)} />
                <span>{item.label}</span>
                <span>{current.toFixed(1)}%</span>
                {!single && (
                  <span className={change < 0 ? "text-clay" : "text-foam"}>
                    {change > 0 ? "+" : change < 0 ? "−" : ""}
                    {Math.abs(change).toFixed(1)}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
          </>
        )}
      </div>
    </section>
  );
}

function qualityIssue(
  frames: MLModelResponse["frames"],
  index: number,
  palette: Array<{ key: keyof LandCoverPercentages }>,
) {
  const cover = frames[index]?.land_cover;
  if (!cover) return false;
  const top = Math.max(...palette.map((item) => Number(cover[item.key] ?? 0)));
  if (top <= 90) return false;
  return [frames[index - 1], frames[index + 1]].some((other) => {
    if (!other) return false;
    return palette.some(
      (item) => Math.abs(Number(cover[item.key] ?? 0) - Number(other.land_cover[item.key] ?? 0)) >= 40,
    );
  });
}

function usePictureFrame(src: string | null) {
  const [frame, setFrame] = useState({ aspect: 1, x: 0, y: 0, w: 1, h: 1 });
  useEffect(() => {
    if (!src) return;
    let ignore = false;
    const img = new Image();
    img.onload = () => {
      if (ignore) return;
      setFrame(contentFrame(img));
    };
    img.src = src;
    return () => {
      ignore = true;
    };
  }, [src]);
  return frame;
}

function contentFrame(img: HTMLImageElement) {
  const sample = 180;
  const width = Math.min(img.naturalWidth, sample);
  const height = Math.min(img.naturalHeight, sample);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context || !width || !height) return { aspect: 1, x: 0, y: 0, w: 1, h: 1 };
  context.drawImage(img, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      if (pixels[index] + pixels[index + 1] + pixels[index + 2] < 28) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX <= minX || maxY <= minY) return { aspect: img.naturalWidth / img.naturalHeight || 1, x: 0, y: 0, w: 1, h: 1 };
  const x = minX / width;
  const y = minY / height;
  const w = (maxX - minX + 1) / width;
  const h = (maxY - minY + 1) / height;
  const aspect = (w * img.naturalWidth) / (h * img.naturalHeight);
  return { aspect, x, y, w, h };
}

function FrameImage({
  src,
  alt,
  frame,
}: {
  src: string | null;
  alt: string;
  frame: { x: number; y: number; w: number; h: number };
}) {
  if (!src) return null;
  const style = {
    width: `${100 / frame.w}%`,
    height: `${100 / frame.h}%`,
    maxWidth: "none",
    marginLeft: `${(-frame.x / frame.w) * 100}%`,
    marginTop: `${(-frame.y / frame.h) * 100}%`,
  };
  return (
    <div className="absolute inset-0 overflow-hidden">
      <img src={src} alt={alt} style={style} />
    </div>
  );
}

function Stack({
  cover,
  classes,
}: {
  cover: LandCoverPercentages;
  classes: Array<{ key: keyof LandCoverPercentages; label: string; swatch: string }>;
}) {
  return (
    <div className="flex h-3 overflow-hidden rounded-full bg-white/5">
      {classes.map((item) => (
        <div
          key={item.key}
          className={item.swatch}
          style={{ width: `${Number(cover[item.key] ?? 0)}%` }}
          title={`${item.label} ${Number(cover[item.key] ?? 0)}%`}
        />
      ))}
    </div>
  );
}
