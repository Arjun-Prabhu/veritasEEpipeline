"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cx } from "@/lib/format";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/analyze", label: "Analyzer" },
  { href: "/explore", label: "Explore" },
];

export default function Nav() {
  const pathname = usePathname();
  const [label, setLabel] = useState("Placeholder ML");
  const [live, setLive] = useState(false);

  useEffect(() => {
    let ignore = false;
    fetch("/api/status")
      .then((response) => response.json())
      .then((data: { label?: string; mode?: string }) => {
        if (ignore) return;
        setLabel(data.mode === "live" ? "Live ML" : "Placeholder ML");
        setLive(data.mode === "live");
      })
      .catch(() => {
        if (!ignore) setLabel("Placeholder ML");
      });
    return () => {
      ignore = true;
    };
  }, [pathname]);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex items-center justify-between px-4 py-4 md:px-6">
      <Link href="/" className="pointer-events-auto text-[12px] tracking-[0.18em] text-white/80">
        g<span className="text-[#7dccff]">AI</span>a
      </Link>
      <nav className="pointer-events-auto flex items-center gap-3 text-[12px] text-white/70 md:gap-5">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cx("transition hover:text-white", active && "text-white")}
            >
              {link.label}
            </Link>
          );
        })}
        <span className="hidden items-center gap-1.5 text-[11px] text-white/50 md:inline-flex">
          <span className={cx("h-1.5 w-1.5 rounded-full", live ? "bg-foam" : "bg-white/70")} />
          {label}
        </span>
      </nav>
    </header>
  );
}
