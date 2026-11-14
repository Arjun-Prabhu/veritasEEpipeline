"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { cx, formatCoord, frameSrc } from "@/lib/format";
import type { LandCoverPercentages, MLModelResponse } from "@/services/mlModelService";

const MiniGlobe = dynamic(() => import("./MiniGlobe"), { ssr: false });

const CLASSES: Array<{ key: keyof LandCoverPercentages; label: string; swatch: string }> = [
  { key: "green_space", label: "Green space", swatch: "bg-[#1f8a4c]" },
  { key: "crops", label: "Crops", swatch: "bg-[#e2c14a]" },
  { key: "urban", label: "Urban", swatch: "bg-[#d4553a]" },
  { key: "built", label: "Built", swatch: "bg-[#d9d4cc]" },
  { key: "water", label: "Water", swatch: "bg-[#2f7ea8]" },
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

  return (
    <section className="flex min-h-0 flex-col gap-4 overflow-auto rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-lime">{imagery.focus_area}</p>
          <h2 className="mt-1 font-serif text-3xl text-ink md:text-4xl">{imagery.location}</h2>
          <p className="mt-1 text-sm text-ink/65">
            {imagery.start_year}–{imagery.end_year}
            <span className="mx-2 text-ink/30">/</span>
            {formatCoord(imagery.latitude, imagery.longitude)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-pressed={maskOn}
            onClick={() => setMaskOn((value) => !value)}
            className={cx(
              "rounded-full border px-3 py-1.5 text-xs",
              maskOn ? "border-lime bg-lime text-[#071018]" : "border-white/15 text-ink/80 hover:bg-white/5",
            )}
          >
            Classification
          </button>
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

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_148px]">
        <div>
          <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-black">
            {single ? (
              <FrameImage src={beforePhoto} mask={maskOn ? beforeMask : null} alt={`${before.year} satellite tile`} />
            ) : (
              <>
                <FrameImage src={afterPhoto} mask={maskOn ? afterMask : null} alt={`${after.year} satellite tile`} />
                <div
                  className="absolute inset-0"
                  style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
                >
                  <FrameImage src={beforePhoto} mask={maskOn ? beforeMask : null} alt={`${before.year} satellite tile`} />
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
        <Stack cover={before.land_cover} />
        {!single && (
          <div className="mt-2">
            <Stack cover={after.land_cover} />
          </div>
        )}
        <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-ink/75 sm:grid-cols-5">
          {CLASSES.map((item) => {
            const change = after.land_cover[item.key] - before.land_cover[item.key];
            return (
              <li key={item.key} className="flex items-center gap-1.5">
                <span className={cx("h-2 w-2 rounded-full", item.swatch)} />
                <span>{item.label}</span>
                <span className={change < 0 ? "text-clay" : "text-foam"}>
                  {change > 0 ? "+" : change < 0 ? "−" : ""}
                  {Math.abs(change).toFixed(1)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function FrameImage({ src, mask, alt }: { src: string | null; mask: string | null; alt: string }) {
  if (!src) return null;
  return (
    <div className="absolute inset-0">
      <img src={src} alt={alt} className="h-full w-full object-cover" />
      {mask && (
        <img src={mask} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
      )}
    </div>
  );
}

function Stack({ cover }: { cover: LandCoverPercentages }) {
  return (
    <div className="flex h-3 overflow-hidden rounded-full bg-white/5">
      {CLASSES.map((item) => (
        <div
          key={item.key}
          className={item.swatch}
          style={{ width: `${cover[item.key]}%` }}
          title={`${item.label} ${cover[item.key]}%`}
        />
      ))}
    </div>
  );
}
