"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import EarthCanvas, { type TourAction } from "@/components/home/EarthCanvas";
import LunaChat from "@/components/home/LunaChat";

const SECTIONS = [
  { id: "introduction", label: "Introduction", note: "What gAIa is", color: "#7dccff" },
  { id: "planet", label: "Our Planet", note: "The Earth you can turn", color: "#3d9a62" },
  { id: "explore", label: "Geographic Exploration", note: "Continents and case studies", color: "#e2c14a" },
  { id: "analyze", label: "Analyze", note: "A place, across years", color: "#d4553a" },
  { id: "works", label: "How It Works", note: "From a question to a briefing", color: "#b9e4ff" },
  { id: "luna", label: "Luna AI", note: "What Luna can help with", color: "#c4b5fd" },
  { id: "talk", label: "Talk to Luna", note: "Ask at the end of the journey", color: "#f0b4a0" },
] as const;

const TOUR_KEY = "gaia-luna-tour-2";
const CONTINUE_KEY = "gaia-luna-continue-2";

const TOUR = [
  {
    action: "drag",
    x: "16%",
    y: "62%",
    flip: false,
    say: "I'm Luna. Drag across the Earth to turn it and bring another side into view.",
  },
  {
    action: "zoom",
    x: "14%",
    y: "38%",
    flip: false,
    say: "Hover a continent for a short reading and Explore. Then click the land to move closer.",
  },
  {
    action: "pin",
    x: "60%",
    y: "30%",
    flip: true,
    say: "Click the land again to place a pin. Press escape if you want the whole globe back.",
  },
  {
    action: "analyze",
    x: "58%",
    y: "56%",
    flip: true,
    say: "Press Analyze. That opens the years for the place you just pinned.",
  },
] as const;

function savedStep() {
  if (typeof window === "undefined") return 0;
  const saved = sessionStorage.getItem(TOUR_KEY);
  if (saved === "done") return TOUR.length;
  const step = Number(saved);
  return Number.isInteger(step) && step >= 0 && step <= TOUR.length ? step : 0;
}

export default function HomeJourney() {
  const progressRef = useRef(0.36);
  const earthRef = useRef<HTMLDivElement>(null);
  const talkRef = useRef<HTMLElement>(null);
  const allowZoomRef = useRef(false);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(0);
  const [hopping, setHopping] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [tourOn, setTourOn] = useState(false);
  const [greet, setGreet] = useState(false);
  const advanceRef = useRef<(action: TourAction) => void>(() => {});
  const zoomAt = TOUR.findIndex((item) => item.action === "zoom");
  allowZoomRef.current = tourOn && step >= zoomAt;

  const advance = (action: TourAction) => {
    setStep((current) => {
      if (current >= TOUR.length || TOUR[current].action !== action) return current;
      const next = current + 1;
      sessionStorage.setItem(TOUR_KEY, next >= TOUR.length ? "done" : String(next));
      return next;
    });
  };
  advanceRef.current = advance;

  useLayoutEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduceMotion(reduce);
    const saved = savedStep();
    setStep(saved);
    if (saved < TOUR.length) {
      sessionStorage.setItem(TOUR_KEY, String(saved));
      if (reduce) setTourOn(true);
      return;
    }
    if (sessionStorage.getItem(CONTINUE_KEY) === "1") return;
    sessionStorage.setItem(CONTINUE_KEY, "1");
    setGreet(true);
    document.getElementById("talk")?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    setHopping(true);
    const timer = window.setTimeout(() => setHopping(false), 700);
    return () => window.clearTimeout(timer);
  }, [step, reduceMotion]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nodes = SECTIONS.map((section) => document.getElementById(section.id)).filter(Boolean) as HTMLElement[];
    const onScroll = () => {
      const height = window.innerHeight;
      const talking = talkRef.current;
      const y = window.scrollY;
      const rise = reduce ? 1 : Math.min(1, y / (height * 0.85));
      const fade = talking
        ? Math.min(1, Math.max(0, (height * 0.85 - talking.getBoundingClientRect().top) / (height * 0.55)))
        : 0;
      if (talking) talking.style.opacity = String(reduce ? 1 : fade);
      const earth = earthRef.current;
      if (earth) {
        const drop = (1 - rise) * 68;
        earth.style.transform = `translateY(${drop}%)`;
        earth.style.opacity = String(1 - (reduce ? 0 : fade));
        const settled = rise >= 0.62;
        earth.style.pointerEvents = settled && fade < 0.55 ? "auto" : "none";
        if (settled) setTourOn(true);
      }
      let next = 0;
      nodes.forEach((node, index) => {
        if (node.getBoundingClientRect().top < height * 0.45) next = index;
      });
      setActive(next);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const go = (id: string) => {
    setOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="relative bg-[#05060f] text-white">
      <div ref={earthRef} className="pointer-events-none fixed inset-0 z-0 origin-center opacity-0">
        <EarthCanvas
          progressRef={progressRef}
          onReady={() => setReady(true)}
          onTour={(action) => advanceRef.current(action)}
          allowZoomRef={allowZoomRef}
        />
      </div>

      <nav aria-label="Page sections" className="fixed left-3 top-1/2 z-40 hidden -translate-y-1/2 md:block">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="mb-3 text-[10px] uppercase tracking-[0.2em] text-white/50"
        >
          {open ? "Close" : "Index"}
        </button>
        <ol className="flex flex-col">
          {SECTIONS.map((section, index) => (
            <li key={section.id}>
              <button
                type="button"
                aria-current={active === index ? "true" : undefined}
                onClick={() => go(section.id)}
                className="group flex items-center gap-3 py-1 text-left"
              >
                <span
                  className="block w-1.5 transition-all"
                  style={{
                    background: section.color,
                    height: active === index ? 36 : 18,
                    opacity: active === index ? 1 : 0.35,
                  }}
                />
                <span className="pointer-events-none absolute left-8 hidden whitespace-nowrap text-[11px] text-white/80 group-hover:block group-focus:block">
                  {section.label}
                </span>
              </button>
            </li>
          ))}
        </ol>
        {open && (
          <ul className="absolute left-8 top-8 w-64 border border-white/15 bg-[#05060f]/95 p-3">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <button type="button" onClick={() => go(section.id)} className="block w-full py-2 text-left">
                  <span className="block text-sm" style={{ color: section.color }}>{section.label}</span>
                  <span className="block text-[12px] text-white/55">{section.note}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </nav>

      <nav aria-label="Page sections" className="fixed bottom-3 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 md:hidden">
        <span className="text-[11px] text-white/70">{SECTIONS[active].label}</span>
        {SECTIONS.map((section, index) => (
          <button
            key={section.id}
            type="button"
            aria-label={section.label}
            aria-current={active === index ? "true" : undefined}
            onClick={() => go(section.id)}
            className="h-2 w-6"
            style={{ background: section.color, opacity: active === index ? 1 : 0.35 }}
          />
        ))}
      </nav>

      {ready && tourOn && step < TOUR.length && (
        <div
          className="pointer-events-none fixed z-30 flex max-w-[340px] items-start gap-3"
          style={{
            left: reduceMotion ? TOUR[0].x : TOUR[step].x,
            top: reduceMotion ? TOUR[0].y : TOUR[step].y,
            flexDirection: TOUR[step].flip && !reduceMotion ? "row-reverse" : "row",
            transition: reduceMotion ? undefined : "left 0.85s cubic-bezier(.2,.8,.2,1), top 0.85s cubic-bezier(.2,.8,.2,1)",
          }}
        >
          <img
            src="/luna.png"
            alt=""
            width={40}
            height={40}
            className={`h-10 w-10 ${hopping ? "luna-hop" : "luna-bob"}`}
          />
          <span className="border border-white/20 bg-[#05060f]/85 px-3 py-2 text-sm leading-snug text-white">
            {TOUR[step].say}
          </span>
        </div>
      )}

      <main className="pointer-events-none relative z-10">
        <section id="introduction" className="flex min-h-screen flex-col px-6 pb-16 pt-28 md:px-24">
          <h1 className="mt-6 text-center text-6xl font-semibold tracking-tight md:text-8xl">
            g<span className="italic text-[#7dccff]">AI</span>a
          </h1>
          <p className="pointer-events-none mx-auto mt-10 max-w-xl border border-white/20 bg-[#05060f]/55 px-8 py-7 text-center text-sm leading-relaxed text-white/85">
            gAIa transforms satellite imagery into an understanding of our changing planet. Explore how cities,
            landscapes, and ecosystems evolve over time through Earth observation, geospatial analysis, and
            artificial intelligence.
          </p>
          {!ready && <p className="mt-auto text-center text-[11px] tracking-[0.28em] text-white/50">LOADING</p>}
        </section>

        <section id="planet" className="min-h-screen" />
        <section id="explore" className="min-h-[40vh]" />
        <section id="analyze" className="min-h-[40vh]" />
        <section id="works" className="min-h-[40vh]" />
        <section id="luna" className="min-h-[30vh]" />

        <section id="talk" ref={talkRef} className="relative bg-[#05060f] px-6 pb-28 pt-24 opacity-0 md:px-28">
          <h2 className="text-4xl">Talk to Luna</h2>
          {greet && (
            <p className="mt-6 flex items-center gap-3 text-sm text-white">
              Continue talking to Luna.
              <img src="/luna.png" alt="" width={40} height={40} className="luna-bob h-10 w-10" />
            </p>
          )}
          <div className="pointer-events-auto mt-8 max-w-xl">
            <LunaChat />
          </div>
        </section>
      </main>
    </div>
  );
}
