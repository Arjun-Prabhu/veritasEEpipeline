"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";

const EarthCanvas = dynamic(() => import("./EarthCanvas"), { ssr: false });

const PIXELS = [
  { year: 2021, t: 0.08 },
  { year: 2022, t: 0.3 },
  { year: 2023, t: 0.52 },
  { year: 2024, t: 0.74 },
  { year: 2025, t: 0.96 },
];

const CHARLOTTE_QUERY = "How has the land in Charlotte changed from 2021 to 2025?";

function clamp(n: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, n));
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export default function ScrollEarth() {
  const progressRef = useRef(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLDivElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const clipRef = useRef<HTMLDivElement>(null);
  const firstTileRef = useRef<HTMLElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLParagraphElement>(null);
  const descRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let disposed = false;
    let teardown = () => {};

    const apply = (progress: number) => {
      const lift = smoothstep(0.1, 0.3, progress);
      const mark = markRef.current;
      if (mark) {
        const size = lerp(
          Math.min(window.innerWidth * 0.16, 168),
          Math.min(window.innerWidth * 0.072, 68),
          lift,
        );
        mark.style.translate = "-50% -50%";
        mark.style.top = `${lerp(window.innerHeight * 0.24, window.innerHeight * 0.12, lift)}px`;
        mark.style.fontSize = `${size}px`;
      }

      const emerge = smoothstep(0.54, 0.68, progress);
      const intro = smoothstep(0.72, 0.86, progress);
      const travel = smoothstep(0.86, 0.96, progress);
      const reveal = smoothstep(0.92, 0.99, progress);

      if (veilRef.current) {
        veilRef.current.style.opacity = String(smoothstep(0.72, 0.86, progress) * 0.92);
      }
      if (stageRef.current) {
        stageRef.current.style.top = `${window.innerHeight / 2 - 140}px`;
        stageRef.current.style.opacity = emerge < 0.01 ? "0" : "1";
        stageRef.current.style.visibility = emerge < 0.01 ? "hidden" : "visible";
        stageRef.current.style.transform = "none";
      }
      if (clipRef.current) clipRef.current.style.overflow = "hidden";
      if (stripRef.current) {
        const desc = descRef.current;
        const descBox = desc?.getBoundingClientRect();
        const beside =
          descBox &&
          descBox.width > 40 &&
          getComputedStyle(desc).position === "absolute";
        const stopAt = beside ? Math.max(280, descBox.left - 36) : window.innerWidth;
        const shift = Math.max(0, stripRef.current.scrollWidth - stopAt);
        const centeredX = window.innerWidth / 2 - 140;
        const x = lerp(lerp(centeredX, 0, intro), -shift, travel);
        stripRef.current.style.transform = `translateX(${x}px)`;

        const tiles = stripRef.current.querySelectorAll("article");
        tiles.forEach((tile, index) => {
          if (index === 0) return;
          tile.style.opacity = String(intro);
        });
      }
      const first = firstTileRef.current;
      if (first) {
        first.style.transformOrigin = "center center";
        first.style.zIndex = "2";
        first.style.transform = emerge >= 0.995 ? "none" : `scale(${lerp(0.14, 1, emerge)})`;
      }
      if (noteRef.current) noteRef.current.style.opacity = String(intro * (1 - reveal));
      if (probeRef.current) probeRef.current.style.opacity = String(intro);
      if (descRef.current) {
        descRef.current.style.opacity = reveal.toFixed(3);
        descRef.current.style.pointerEvents = reveal > 0.45 ? "auto" : "none";
      }
      if (cueRef.current) cueRef.current.style.opacity = String(1 - smoothstep(0.02, 0.1, progress));
    };

    if (reduce && wrapRef.current) wrapRef.current.style.height = "100vh";
    apply(reduce ? 1 : 0);
    progressRef.current = reduce ? 1 : 0;
    if (reduce) return;

    void (async () => {
      const [{ default: Lenis }, gsapModule, scrollModule] = await Promise.all([
        import("lenis"),
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (disposed || !wrapRef.current) return;
      const gsap = gsapModule.default;
      const { ScrollTrigger } = scrollModule;
      gsap.registerPlugin(ScrollTrigger);

      const lenis = new Lenis({ duration: 1.15, smoothWheel: true, touchMultiplier: 1.05 });
      lenis.on("scroll", ScrollTrigger.update);
      const tick = (time: number) => {
        lenis.raf(time * 1000);
      };
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);

      const trigger = ScrollTrigger.create({
        id: "gaia-home",
        trigger: wrapRef.current,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          progressRef.current = self.progress;
          apply(self.progress);
        },
      });
      ScrollTrigger.refresh();
      const onResize = () => apply(progressRef.current);
      window.addEventListener("resize", onResize);
      teardown = () => {
        window.removeEventListener("resize", onResize);
        trigger.kill();
        gsap.ticker.remove(tick);
        lenis.destroy();
      };
    })();

    return () => {
      disposed = true;
      teardown();
    };
  }, []);

  return (
    <div ref={wrapRef} className="relative h-[640vh] bg-[#05060f]">
      <div className="sticky top-0 h-screen overflow-hidden bg-[#05060f]">
        <EarthCanvas progressRef={progressRef} />
        <div ref={veilRef} className="pointer-events-none absolute inset-0 z-[5] bg-[#05060f] opacity-0" />

        <div
          ref={markRef}
          className="pointer-events-none absolute left-1/2 top-[24%] z-20 font-semibold leading-none tracking-tight text-white"
          style={{ translate: "-50% -50%" }}
        >
          g<span className="text-[#7dccff]">AI</span>a
        </div>

        <div
          ref={stageRef}
          className="absolute inset-x-0 top-[22vh] z-20 opacity-0"
        >
          <div ref={clipRef}>
            <div ref={stripRef} className="flex w-max gap-5 md:gap-8">
              {PIXELS.map((pixel, index) => (
                <article
                  key={pixel.year}
                  ref={index === 0 ? firstTileRef : undefined}
                  className="w-[280px] shrink-0"
                >
                  <div className="relative aspect-square overflow-hidden bg-[#0c1440]">
                    <img
                      src={`/api/tile?scene=urban&t=${pixel.t}&kind=photo`}
                      alt=""
                      className="h-full w-full object-cover opacity-80"
                    />
                    <div className="absolute inset-0 bg-[#071033]/55" />
                    <p className="absolute inset-0 grid place-items-center px-5 text-center text-[13px] leading-snug text-white">
                      Satellite Pixel of Charlotte {pixel.year}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
          <p ref={noteRef} className="px-6 pt-5 text-center text-[12px] text-white/70 md:px-16 md:text-left">
            Five tiles of the same ground. Scroll moves through the years.
          </p>
          <div ref={probeRef} className="opacity-0">
            <KeyProbe />
          </div>
          <div
            ref={descRef}
            className="mx-auto mt-8 max-w-md px-6 text-[13px] leading-relaxed text-white/90 opacity-0 md:absolute md:right-10 md:top-0 md:mx-0 md:mt-0 md:w-[260px] md:max-w-[260px] md:px-0"
          >
            <p>
              A prompt names a place and a span of years. gAIa parses it, asks the land model for one
              satellite tile per year, and writes what changed, why, and what to do if the trend holds.
            </p>
            <p className="mt-4 text-white/60">Charlotte, 2021–2025, is the sample on this page.</p>
            <Link href={`/analyze?q=${encodeURIComponent(CHARLOTTE_QUERY)}`} className="mt-5 inline-block text-white underline">
              Read Charlotte
            </Link>
          </div>
        </div>

        <p
          ref={cueRef}
          className="pointer-events-none absolute bottom-8 left-1/2 z-20 -translate-x-1/2 text-[11px] tracking-[0.28em] text-white/70"
        >
          SCROLL
        </p>
      </div>
    </div>
  );
}

function KeyProbe() {
  const [prompt, setPrompt] = useState("Is the Gemini key working?");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const text = prompt.trim();
    if (!text || pending) return;
    setPending(true);
    setResult(null);
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });
      const data = (await response.json().catch(() => null)) as { reply?: string; error?: string } | null;
      if (response.ok && data?.reply) {
        setResult({ ok: true, text: data.reply });
      } else {
        setResult({ ok: false, text: data?.error || "The key did not work." });
      }
    } catch {
      setResult({ ok: false, text: "The request never reached the server." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto mt-4 w-full max-w-xl px-6">
      <label htmlFor="key-probe" className="text-[11px] tracking-[0.18em] text-[#7dccff]">
        Test the API key
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="key-probe"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          className="min-w-0 flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[13px] text-white outline-none placeholder:text-white/40 focus:border-[#7dccff]"
          placeholder="Ask something"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-full bg-[#7dccff] px-4 py-2 text-[13px] text-[#071018] disabled:opacity-60"
        >
          {pending ? "Sending" : "Send"}
        </button>
      </div>
      {result && (
        <p className={`mt-3 max-h-24 overflow-auto text-[12px] leading-relaxed ${result.ok ? "text-white/85" : "text-[#f0b4a0]"}`}>
          {result.ok ? "Key works. " : "Key did not work. "}
          {result.text}
        </p>
      )}
    </form>
  );
}
