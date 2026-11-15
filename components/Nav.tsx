"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { lunaInvited, LUNA_INVITE } from "@/lib/luna";
import { cx } from "@/lib/format";
import { startPageTransition } from "@/lib/transition";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/analyze", label: "Analyze" },
  { href: "/explore", label: "Explore" },
  { href: "/luna", label: "Luna" },
];

export default function Nav() {
  const pathname = usePathname();
  const [invite, setInvite] = useState(false);
  const [label, setLabel] = useState("Placeholder ML");

  useEffect(() => {
    const sync = () => setInvite(lunaInvited());
    sync();
    window.addEventListener(LUNA_INVITE, sync);
    return () => window.removeEventListener(LUNA_INVITE, sync);
  }, []);
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
        g<span className="italic text-[#3e8ec4]">AI</span>a
      </Link>
      <nav className="pointer-events-auto flex items-center gap-4 text-[15px] text-white/70 md:gap-6">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          const marked = link.href === "/luna" && invite;
          const className = cx(
            "group relative py-1 transition duration-500 hover:text-white",
            !marked && "hover:scale-110",
            active && "text-white",
          );
          if (marked) {
            return (
              <span key={link.href} className="prompt-gun inline-flex rounded-full">
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => startPageTransition()}
                  className="relative z-[1] m-[1.5px] rounded-full bg-[#05060f] px-3 py-1 text-[20px] text-white"
                >
                  {link.label}
                </Link>
              </span>
            );
          }
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={className}
            >
              {link.label}
              <span className="absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-white/80 transition-transform duration-500 ease-out group-hover:scale-x-100" />
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
