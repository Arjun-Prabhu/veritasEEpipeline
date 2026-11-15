"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function SmoothScroll() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/") return;
    let frame = 0;
    let destroy = () => {};
    let alive = true;

    void import("lenis").then(({ default: Lenis }) => {
      if (!alive) return;
      const lenis = new Lenis({
        duration: 1.05,
        smoothWheel: true,
        wheelMultiplier: 0.9,
        touchMultiplier: 1,
      });
      const loop = (time: number) => {
        lenis.raf(time);
        frame = requestAnimationFrame(loop);
      };
      frame = requestAnimationFrame(loop);
      destroy = () => lenis.destroy();
    });

    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      destroy();
    };
  }, [pathname]);

  return null;
}
