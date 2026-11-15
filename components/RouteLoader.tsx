"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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
      <div className="relative h-28 w-28">
        <div className="absolute inset-[14px] rounded-full bg-[radial-gradient(circle_at_32%_30%,#d7fff0_0%,#3d9a62_18%,#1a6ea8_46%,#0a1c33_72%,#05060f_100%)] shadow-[0_0_28px_rgba(125,204,255,0.28)]" />
        <div className="absolute inset-0 animate-[spin_2.4s_linear_infinite]">
          <span className="absolute left-1/2 top-0 h-2.5 w-7 -translate-x-1/2 rounded-sm bg-[#e7eef5] shadow-[9px_0_0_#1a3e78,-9px_0_0_#1a3e78]" />
        </div>
      </div>
    </div>
  );
}
