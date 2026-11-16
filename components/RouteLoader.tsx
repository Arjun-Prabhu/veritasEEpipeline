"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import EarthSpinner from "@/components/EarthSpinner";

const MIN_MS = 700;

export default function RouteLoader() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const started = useRef(0);
  const shownFor = useRef(pathname);

  useEffect(() => {
    const arm = () => {
      started.current = performance.now();
      setVisible(true);
    };
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || anchor.getAttribute("target") === "_blank") return;
      const next = new URL(href, window.location.href);
      if (next.origin !== window.location.origin) return;
      if (next.pathname === window.location.pathname && next.search === window.location.search) return;
      arm();
    };
    window.addEventListener("gaia-transition", arm);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("gaia-transition", arm);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  useEffect(() => {
    if (!visible || pathname === shownFor.current) return;
    shownFor.current = pathname;
    const wait = Math.max(0, MIN_MS - (performance.now() - started.current));
    const timer = window.setTimeout(() => setVisible(false), wait);
    return () => window.clearTimeout(timer);
  }, [pathname, visible]);

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => setVisible(false), 2500);
    return () => window.clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-[#05060f]">
      <EarthSpinner />
    </div>
  );
}
