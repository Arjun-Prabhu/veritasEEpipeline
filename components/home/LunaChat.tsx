"use client";

import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { startPageTransition } from "@/lib/transition";

export default function LunaChat() {
  const [text, setText] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const homeRef = useRef<HTMLSpanElement>(null);
  const iconRef = useRef<HTMLImageElement>(null);
  const arrived = useRef(false);
  const router = useRouter();

  useLayoutEffect(() => {
    const form = formRef.current;
    const icon = iconRef.current;
    const target = homeRef.current;
    if (!form || !icon || !target) return;
    const place = () => {
      const box = form.getBoundingClientRect();
      const spot = target.getBoundingClientRect();
      icon.style.left = `${spot.left - box.left}px`;
      icon.style.top = `${spot.top - box.top}px`;
      icon.style.width = "30px";
      icon.style.height = "30px";
    };
    icon.style.transition = arrived.current
      ? "none"
      : "left 0.55s cubic-bezier(.2,.8,.2,1), top 0.55s cubic-bezier(.15,1.4,.3,1), width 0.55s ease, height 0.55s ease";
    arrived.current = true;
    place();
    const onResize = () => place();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function send(event: FormEvent) {
    event.preventDefault();
    const prompt = text.trim();
    if (!prompt) return;
    startPageTransition();
    router.push(`/luna?q=${encodeURIComponent(prompt)}`);
  }

  return (
    <form ref={formRef} onSubmit={send} className="relative mt-5 rounded-2xl border border-white/70 p-4 text-left">
      <p className="flex items-center gap-2 text-[15px] text-white">
        Meet Luna
        <span ref={homeRef} className="inline-block h-[30px] w-[30px] shrink-0" />
      </p>
      <p className="mt-2 min-h-12 text-[15px] leading-relaxed text-white/80">
        Ask about satellites, land use, or how the earth is changing.
      </p>
      <img
        ref={iconRef}
        src="/luna.png"
        alt=""
        className="pointer-events-none absolute left-4 top-4 luna-bob"
        width={30}
        height={30}
      />
      <div className="mt-3 flex gap-2">
        <div className="prompt-gun h-10 min-w-0 flex-1">
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Ask Luna"
            className="absolute inset-[1.5px] z-[1] rounded-full bg-[#05060f] px-3 text-[15px] text-white outline-none placeholder:text-white/40"
          />
        </div>
        <button type="submit" className="h-10 shrink-0 rounded-full bg-lime px-4 text-sm font-semibold text-[#071018]">
          Ask
        </button>
      </div>
    </form>
  );
}
