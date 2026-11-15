"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef } from "react";

const EarthCanvas = dynamic(() => import("./EarthCanvas"), { ssr: false });

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

function easeOutQuint(t: number) {
  return 1 - (1 - t) ** 5;
}

function bounceOut(t: number) {
  const n = 7.5625;
  const d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
}

function shaped(raw: number) {
  const pauseIn = 0.2;
  const pauseOut = 0.34;
  const held = 0.36;
  if (raw <= pauseIn) return (raw / pauseIn) * held;
  if (raw <= pauseOut) return held;
  return held + ((raw - pauseOut) / (1 - pauseOut)) * (1 - held);
}

export default function ScrollEarth() {
  const progressRef = useRef(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLDivElement>(null);
  const geoRef = useRef<HTMLSpanElement>(null);
  const anaRef = useRef<HTMLSpanElement>(null);
  const aiRef = useRef<HTMLSpanElement>(null);
  const slotRef = useRef<HTMLSpanElement>(null);
  const rowRef = useRef<HTMLSpanElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const descRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLParagraphElement>(null);
  const cueRef = useRef<HTMLParagraphElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const seek = useRef({ time: 0, busy: false });

  const scrub = (video: HTMLVideoElement) => {
    const next = seek.current.time;
    if (!Number.isFinite(next)) return;
    if (!video.paused) video.pause();
    if (Math.abs(video.currentTime - next) < 0.03) return;
    if (video.seeking || seek.current.busy) return;
    seek.current.busy = true;
    const finish = () => {
      seek.current.busy = false;
      if (Math.abs(video.currentTime - seek.current.time) > 0.04) scrub(video);
    };
    video.addEventListener("seeked", finish, { once: true });
    window.setTimeout(() => {
      if (!seek.current.busy) return;
      seek.current.busy = false;
      if (!video.seeking) scrub(video);
    }, 280);
    try {
      video.currentTime = next;
    } catch {
      seek.current.busy = false;
    }
  };

  useLayoutEffect(() => {
    const geo = geoRef.current;
    const ana = anaRef.current;
    const ai = aiRef.current;
    const slot = slotRef.current;
    const row = rowRef.current;
    if (!geo || !ana || !ai || !slot || !row) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finish = () => {
      geo.textContent = "g";
      ana.textContent = "a";
      geo.style.transform = "";
      ana.style.transform = "";
      ai.style.transform = "";
      ai.style.opacity = "1";
      ai.style.position = "static";
      ai.style.left = "";
      ai.style.top = "";
      ai.style.bottom = "";
      slot.style.width = "auto";
      row.style.fontSize = "";
    };
    if (reduce) {
      finish();
      return;
    }
    let phraseSize = Math.min(window.innerWidth * 0.064, 62);
    const big = Math.min(window.innerWidth * 0.16, 168);
    row.style.fontSize = `${phraseSize}px`;
    phraseSize *= Math.min(1, (window.innerWidth * 0.92) / Math.max(row.getBoundingClientRect().width, 1));
    row.style.fontSize = `${phraseSize}px`;
    const smallAi = ai.getBoundingClientRect().width || 48;
    const phraseGeo = geo.textContent;
    const phraseAna = ana.textContent;
    geo.textContent = "g";
    ana.textContent = "a";
    row.style.fontSize = `${big}px`;
    const bigAi = ai.getBoundingClientRect().width || smallAi * (big / phraseSize);
    geo.textContent = phraseGeo;
    ana.textContent = phraseAna;
    row.style.fontSize = `${phraseSize}px`;
    const lineBaseline = (el: HTMLElement) => {
      const marker = document.createElement("span");
      marker.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
      el.appendChild(marker);
      const y = marker.getBoundingClientRect().bottom;
      marker.remove();
      return y;
    };
    const aiBaselineFromBottom = ai.getBoundingClientRect().bottom - lineBaseline(ai);
    const anaBaseline = lineBaseline(ana);
    slot.style.width = "0px";
    ai.style.position = "absolute";
    ai.style.left = "50%";
    ai.style.top = "auto";
    ai.style.bottom = "0px";
    const bottomPx = slot.getBoundingClientRect().bottom - anaBaseline - aiBaselineFromBottom;
    ai.style.bottom = `${bottomPx / phraseSize}em`;
    ai.style.transform = "translate(-50%, 0px)";
    const miss = lineBaseline(ai) - lineBaseline(ana);
    ai.style.bottom = `${(bottomPx + miss) / phraseSize}em`;
    ai.style.opacity = "0";
    ai.style.transform = `translate(-50%, ${-window.innerHeight * 0.22}px)`;
    let frame = 0;
    let swapped = false;
    const started = performance.now();
    const tick = (now: number) => {
      const t = (now - started - 2000) / 1000;
      if (t < 0) {
        frame = requestAnimationFrame(tick);
        return;
      }
      const drop = bounceOut(clamp(t / 0.72));
      const fall = Math.min(0, lerp(-window.innerHeight * 0.22, 0, drop));
      ai.style.transform = `translate(-50%, ${fall}px)`;
      ai.style.opacity = String(clamp(t / 0.16));
      const open = smoothstep(0.28, 0.74, t);
      const settle = clamp((t - 1.05) / 1.15);
      if (settle > 0 && !swapped) {
        geo.textContent = "g";
        ana.textContent = "a";
        swapped = true;
      }
      const sprung = settle === 0 ? 0 : easeOutQuint(settle);
      const spread = open * (1 - sprung);
      const gap = spread * Math.min(window.innerWidth * 0.16, 150);
      geo.style.transform = `translateX(${-gap}px)`;
      ana.style.transform = `translateX(${gap}px)`;
      const size = lerp(phraseSize, big, sprung);
      row.style.fontSize = `${size}px`;
      slot.style.width = `${lerp(smallAi, bigAi, sprung) * sprung}px`;
      if (settle < 1) frame = requestAnimationFrame(tick);
      else {
        slot.style.width = `${ai.getBoundingClientRect().width}px`;
        geo.style.transform = "translateX(0px)";
        ana.style.transform = "translateX(0px)";
        frame = requestAnimationFrame(() => finish());
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  useLayoutEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
  }, []);

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
        mark.style.opacity = String(1 - smoothstep(0.48, 0.56, progress));
      }

      const film = smoothstep(0.64, 0.86, progress);
      const filmIn = smoothstep(0.58, 0.66, progress);
      const filmOut = 1 - smoothstep(0.86, 0.94, progress);
      const briefing = smoothstep(0.92, 0.99, progress);

      if (veilRef.current) {
        const globeFade = smoothstep(0.58, 0.76, progress);
        veilRef.current.style.opacity = String(globeFade * 0.94);
      }
      const video = videoRef.current;
      if (video) {
        const visible = filmIn * filmOut;
        video.style.opacity = String(visible);
        const duration = video.duration;
        if (Number.isFinite(duration) && duration > 0) {
          seek.current.time = Math.min(Math.max(duration - 0.05, 0), film * duration);
          scrub(video);
        } else if (video.networkState === HTMLMediaElement.NETWORK_EMPTY) {
          video.load();
        }
      }
      if (copyRef.current) {
        copyRef.current.style.opacity = (filmIn * filmOut).toFixed(3);
      }
      if (descRef.current) {
        descRef.current.style.opacity = briefing.toFixed(3);
        descRef.current.style.transform = `translate(-50%, ${lerp(36, 0, briefing)}px)`;
        descRef.current.style.pointerEvents = briefing > 0.55 ? "auto" : "none";
      }
      if (cueRef.current) cueRef.current.style.opacity = String(1 - smoothstep(0.02, 0.1, progress));
      if (hintRef.current) {
        const show = smoothstep(0.31, 0.36, progress) * (1 - smoothstep(0.5, 0.6, progress));
        hintRef.current.style.opacity = String(show);
      }
    };

    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    const video = videoRef.current;
    if (video) {
      seek.current.time = 0;
      seek.current.busy = false;
      video.pause();
      try {
        video.currentTime = 0;
      } catch {
        /* Metadata may still be loading. */
      }
    }
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

      const lenis = new Lenis({ duration: 1.7, smoothWheel: true, wheelMultiplier: 0.65, touchMultiplier: 0.9 });
      lenis.on("scroll", ScrollTrigger.update);
      const tick = (time: number) => {
        lenis.raf(time * 1000);
      };
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
      lenis.scrollTo(0, { immediate: true });

      const trigger = ScrollTrigger.create({
        id: "gaia-home",
        trigger: wrapRef.current,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          const progress = shaped(self.progress);
          progressRef.current = progress;
          apply(progress);
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
    <div ref={wrapRef} className="relative h-[860vh] bg-[#05060f]">
      <div className="sticky top-0 h-screen overflow-hidden bg-[#05060f]">
        <EarthCanvas progressRef={progressRef} />
        <div ref={veilRef} className="pointer-events-none absolute inset-0 z-[5] bg-[#05060f] opacity-0" />

        <div
          ref={markRef}
          className="pointer-events-none absolute left-1/2 top-[24%] z-20 font-semibold leading-none tracking-tight text-white"
          style={{ translate: "-50% -50%" }}
        >
          <span ref={rowRef} className="inline-flex items-baseline whitespace-nowrap">
            <span ref={geoRef} className="inline-block">
              geographical
            </span>
            <span ref={slotRef} className="relative inline-block overflow-visible">
              <span ref={aiRef} className="italic text-[#7dccff]">
                AI
              </span>
            </span>
            <span ref={anaRef} className="inline-block">
              {" "}
              analysis
            </span>
          </span>
        </div>

        <video
          ref={videoRef}
          src="/video/charlotte.mp4"
          muted
          playsInline
          preload="auto"
          onLoadedMetadata={(event) => scrub(event.currentTarget)}
          onPlay={(event) => event.currentTarget.pause()}
          className="pointer-events-none absolute left-1/2 top-1/2 z-10 aspect-square w-[min(52vw,68vh)] -translate-x-1/2 -translate-y-1/2 rounded-2xl object-cover opacity-0"
        />
        <p
          ref={copyRef}
          className="pointer-events-none absolute top-1/2 z-20 w-[min(240px,24vw)] -translate-y-1/2 text-left text-[14px] leading-relaxed text-white/90 opacity-0"
          style={{ left: "calc(50% + min(26vw, 34vh) + 28px)" }}
        >
          A prompt names a place and a span of years. gAIa parses it, asks the land model for one
          satellite tile per year, and writes what changed, why, and what to do if the trend holds.
        </p>
        <div
          ref={descRef}
          className="absolute bottom-[10vh] left-1/2 z-20 w-[min(560px,88vw)] text-center text-[14px] leading-relaxed text-white/90 opacity-0"
        >
          <p className="text-white/60">Charlotte, 2021–2025, is the sample on this page.</p>
          <Link href={`/analyze?q=${encodeURIComponent(CHARLOTTE_QUERY)}`} className="mt-5 inline-block text-white underline">
            Read Charlotte
          </Link>
        </div>

        <p
          ref={hintRef}
          className="pointer-events-none absolute right-[6vw] top-1/2 z-[4] max-w-[200px] -translate-y-1/2 text-[13px] leading-relaxed text-white/85 opacity-0"
        >
          Click anywhere on the globe to analyze
        </p>

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

