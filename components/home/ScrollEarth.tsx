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
  const veilRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const descRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLParagraphElement>(null);
  const cueRef = useRef<HTMLParagraphElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const seek = useRef({ time: 0, busy: false });

  const scrub = (video: HTMLVideoElement) => {
    if (video.seeking || seek.current.busy) return;
    const next = seek.current.time;
    if (!Number.isFinite(next) || Math.abs(video.currentTime - next) < 0.03) {
      if (!video.paused) video.pause();
      return;
    }
    seek.current.busy = true;
    let settled = false;
    const release = () => {
      if (settled) return;
      settled = true;
      seek.current.busy = false;
      if (!video.seeking && Math.abs(video.currentTime - seek.current.time) > 0.05) scrub(video);
    };
    video.addEventListener("seeked", release, { once: true });
    window.setTimeout(release, 450);
    try {
      video.currentTime = next;
    } catch {
      seek.current.busy = false;
    }
    if (!video.paused) video.pause();
  };

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
          g<span className="text-[#7dccff]">AI</span>a
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
          className="pointer-events-none absolute right-[6vw] top-1/2 z-20 max-w-[200px] -translate-y-1/2 text-[13px] leading-relaxed text-white/85 opacity-0"
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

