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
    say: "I'm Luna. Drag across the Earth to turn it and bring another side into view.",
  },
  {
    action: "zoom",
    say: "Hover a continent for a short reading and Explore. Then click the land to move closer.",
  },
  {
    action: "pin",
    say: "Click the land again to place a pin. Press escape if you want the whole globe back.",
  },
  {
    action: "analyze",
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
  const riseRef = useRef(0);
  const earthRef = useRef<HTMLDivElement>(null);
  const talkRef = useRef<HTMLElement>(null);
  const allowZoomRef = useRef(false);
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [tourOn, setTourOn] = useState(false);
  const [greet, setGreet] = useState(false);
  const advanceRef = useRef<(action: TourAction) => void>(() => {});
  const tourDoneRef = useRef(false);
  const zoomAt = TOUR.findIndex((item) => item.action === "zoom");
  allowZoomRef.current = tourOn && step >= zoomAt;

  const advance = (action: TourAction) => {
    setStep((current) => {
      if (current >= TOUR.length || TOUR[current].action !== action) return current;
      const next = current + 1;
      const done = next >= TOUR.length;
      if (done) tourDoneRef.current = true;
      sessionStorage.setItem(TOUR_KEY, done ? "done" : String(next));
      return next;
    });
  };
  advanceRef.current = advance;

  useLayoutEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduceMotion(reduce);
    const saved = savedStep();
    tourDoneRef.current = saved >= TOUR.length;
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
      riseRef.current = rise;
      if (earth) {
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
    const cap = () => window.innerHeight * 0.85;
    const hold = () => {
      if (tourDoneRef.current) return;
      const limit = cap();
      if (window.scrollY > limit) window.scrollTo(0, limit);
    };
    const onWheel = (event: WheelEvent) => {
      if (tourDoneRef.current || event.deltaY <= 0) return;
      if (window.scrollY >= cap() - 1) {
        event.preventDefault();
        window.scrollTo(0, cap());
      }
    };
    let touchY = 0;
    const onTouchStart = (event: TouchEvent) => {
      touchY = event.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (tourDoneRef.current) return;
      const y = event.touches[0]?.clientY ?? touchY;
      const scrollingDown = y < touchY;
      touchY = y;
      if (scrollingDown && window.scrollY >= cap() - 1) event.preventDefault();
    };
    onScroll();
    hold();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scroll", hold);
    window.addEventListener("resize", onScroll);
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", hold);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  const go = (id: string) => {
    const limit = window.innerHeight * 0.85;
    const node = document.getElementById(id);
    if (!tourDoneRef.current && node && node.offsetTop > limit) {
      window.scrollTo({ top: limit, behavior: "smooth" });
      return;
    }
    node?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="relative bg-[#05060f] text-white">
      <div ref={earthRef} className="pointer-events-none fixed inset-0 z-0 origin-center opacity-0">
        <EarthCanvas
          progressRef={progressRef}
          riseRef={riseRef}
          onReady={() => setReady(true)}
          onTour={(action) => advanceRef.current(action)}
          allowZoomRef={allowZoomRef}
        />
      </div>

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
        <div className="pointer-events-none fixed bottom-20 left-1/2 z-30 w-[min(560px,92vw)] -translate-x-1/2 md:bottom-8">
          <div className="relative border border-white/20 bg-[#05060f]/90 px-5 py-4 text-center text-sm leading-snug text-white">
            {TOUR[step].say}
            <img
              src="/luna.png"
              alt=""
              width={40}
              height={40}
              className={`absolute -top-6 h-10 w-10 ${reduceMotion ? "" : "luna-sides"}`}
              style={{
                left: step % 2 === 0 ? 16 : "calc(100% - 56px)",
                transition: reduceMotion ? undefined : "left 0.7s cubic-bezier(.2,.8,.2,1)",
              }}
            />
          </div>
        </div>
      )}

      <main className="pointer-events-none relative z-10">
        <section id="introduction" className="flex min-h-screen flex-col px-6 pb-16 pt-28 md:px-24">
          <h1 className="mt-6 text-center text-6xl font-semibold tracking-tight md:text-8xl">
            g<span className="italic text-[#7dccff]">AI</span>a
          </h1>
          <p className="pointer-events-none mx-auto mt-10 max-w-xl px-8 py-7 text-center text-sm leading-relaxed text-white">
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
