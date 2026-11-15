"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { saveLunaThread, type LunaTurn } from "@/lib/luna";
import { startPageTransition } from "@/lib/transition";

export default function LunaChat() {
  const [text, setText] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const homeRef = useRef<HTMLSpanElement>(null);
  const caretRef = useRef<HTMLSpanElement>(null);
  const iconRef = useRef<HTMLImageElement>(null);
  const arrived = useRef(false);
  const turns = useRef<LunaTurn[]>([]);
  const [done, setDone] = useState(false);

  useLayoutEffect(() => {
    const form = formRef.current;
    const icon = iconRef.current;
    const target = busy ? caretRef.current : homeRef.current;
    if (!form || !icon || !target) return;
    const place = () => {
      const box = form.getBoundingClientRect();
      const spot = target.getBoundingClientRect();
      icon.style.left = `${spot.left - box.left}px`;
      icon.style.top = `${spot.top - box.top}px`;
      icon.style.width = busy ? "22px" : "30px";
      icon.style.height = busy ? "22px" : "30px";
    };
    icon.style.transition = busy && arrived.current
      ? "none"
      : "left 0.55s cubic-bezier(.2,.8,.2,1), top 0.55s cubic-bezier(.15,1.4,.3,1), width 0.55s ease, height 0.55s ease";
    arrived.current = busy;
    place();
    const onResize = () => place();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [busy, reply]);

  async function send(event: FormEvent) {
    event.preventDefault();
    const prompt = text.trim();
    if (!prompt || busy) return;
    setDone(false);
    setBusy(true);
    setReply("");
    const history = [...turns.current, { role: "user" as const, text: prompt }];
    turns.current = history;
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, luna: true }),
      });
      const data = (await response.json()) as { reply?: string; error?: string };
      const message = data.reply || data.error || "Luna could not answer that.";
      let index = 0;
      await new Promise<void>((resolve) => {
        const timer = window.setInterval(() => {
          index = Math.min(message.length, index + 1);
          setReply(message.slice(0, index));
          if (index >= message.length) {
            window.clearInterval(timer);
            resolve();
          }
        }, 42);
      });
      turns.current = [...history, { role: "luna", text: message }];
      saveLunaThread(turns.current);
      setDone(true);
    } catch {
      setReply("Luna could not reach the model.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={send} className="relative mt-5 rounded-2xl border border-white/70 p-4 text-left">
      <p className="flex items-center gap-2 text-[15px] text-white">
        Meet Luna
        <span ref={homeRef} className="inline-block h-[30px] w-[30px] shrink-0" />
      </p>
      <p className="mt-2 min-h-12 text-[15px] leading-relaxed text-white/80">
        {busy || reply ? reply : "Ask about satellites, land use, or how the earth is changing."}
        <span ref={caretRef} className={busy ? "inline-block h-[22px] w-[22px] align-[-6px]" : "inline-block h-0 w-0"} />
      </p>
      <img
        ref={iconRef}
        src="/luna.png"
        alt=""
        className={`pointer-events-none absolute left-4 top-4 ${busy ? "luna-roll" : "luna-bob"}`}
        width={30}
        height={30}
      />
      {done && !busy && (
        <Link
          href="/luna"
          onClick={() => startPageTransition()}
          className="mt-3 inline-block text-[13px] text-[#7dccff] underline"
        >
          Learn more
        </Link>
      )}
      <input
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Ask Luna"
        className="mt-3 h-10 w-full rounded-full border border-white/20 bg-transparent px-3 text-[15px] text-white outline-none placeholder:text-white/40"
      />
    </form>
  );
}
