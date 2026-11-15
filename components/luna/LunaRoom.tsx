"use client";

import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { loadLunaThread, saveLunaThread, type LunaTurn } from "@/lib/luna";

export default function LunaRoom() {
  const [turns, setTurns] = useState<LunaTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const roomRef = useRef<HTMLDivElement>(null);
  const homeRef = useRef<HTMLSpanElement>(null);
  const caretRef = useRef<HTMLSpanElement>(null);
  const iconRef = useRef<HTMLImageElement>(null);
  const arrived = useRef(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = loadLunaThread();
    setTurns(saved);
    setReady(true);
  }, []);

  useLayoutEffect(() => {
    const room = roomRef.current;
    const icon = iconRef.current;
    const target = busy ? caretRef.current : homeRef.current;
    if (!room || !icon || !target) return;
    const place = () => {
      const box = room.getBoundingClientRect();
      const spot = target.getBoundingClientRect();
      icon.style.left = `${spot.left - box.left}px`;
      icon.style.top = `${spot.top - box.top}px`;
      icon.style.width = busy ? "22px" : "34px";
      icon.style.height = busy ? "22px" : "34px";
    };
    icon.style.transition = busy && arrived.current
      ? "none"
      : "left 0.55s cubic-bezier(.2,.8,.2,1), top 0.55s cubic-bezier(.15,1.4,.3,1), width 0.55s ease, height 0.55s ease";
    arrived.current = busy;
    place();
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
    const follow = () => place();
    window.addEventListener("resize", follow);
    scroller.current?.addEventListener("scroll", follow);
    return () => {
      window.removeEventListener("resize", follow);
      scroller.current?.removeEventListener("scroll", follow);
    };
  }, [busy, turns, ready]);

  async function send(event: FormEvent) {
    event.preventDefault();
    const prompt = draft.trim();
    if (!prompt || busy) return;
    const next = [...turns, { role: "user" as const, text: prompt }];
    setTurns(next);
    setDraft("");
    setBusy(true);
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
          const typed = message.slice(0, index);
          setTurns([...next, { role: "luna", text: typed }]);
          if (index >= message.length) {
            window.clearInterval(timer);
            saveLunaThread([...next, { role: "luna", text: message }]);
            resolve();
          }
        }, 42);
      });
    } catch {
      const failed = [...next, { role: "luna" as const, text: "Luna could not reach the model." }];
      setTurns(failed);
      saveLunaThread(failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={roomRef} className="relative mx-auto flex min-h-screen w-full max-w-2xl flex-col px-5 pb-8 pt-24">
      <h1 className="flex items-center gap-3 text-2xl text-white">
        <span ref={homeRef} className="inline-block h-[34px] w-[34px] shrink-0" />
        Luna
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70">
        Ask about gAIa, satellites, how land is used, or the environment. Luna keeps the thread you started on the home page.
      </p>
      <div ref={scroller} className="mt-8 flex min-h-0 flex-1 flex-col gap-4 overflow-auto">
        {ready && turns.length === 0 && (
          <p className="text-sm text-white/50">Ask Luna something to begin.</p>
        )}
        {turns.map((turn, index) => {
          const last = index === turns.length - 1;
          return (
            <p key={`${turn.role}-${index}`} className={turn.role === "user" ? "text-sm text-white/55" : "text-[15px] leading-relaxed text-white/90"}>
              {turn.text}
              {last && turn.role === "luna" && (
                <span ref={caretRef} className={busy ? "inline-block h-[22px] w-[22px] align-[-6px]" : "inline-block h-0 w-0"} />
              )}
            </p>
          );
        })}
        {busy && turns.at(-1)?.role !== "luna" && <span ref={caretRef} className="inline-block h-[22px] w-[22px]" />}
      </div>
      <img
        ref={iconRef}
        src="/luna.png"
        alt=""
        width={34}
        height={34}
        className={`pointer-events-none absolute z-10 left-5 top-24 ${busy ? "luna-roll" : "luna-bob"}`}
      />
      <form onSubmit={send} className="prompt-gun mt-6 h-12">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask Luna"
          className="absolute inset-[1.5px] z-[1] rounded-full border border-white/10 bg-[#05060f] px-4 text-[15px] text-white outline-none placeholder:text-white/40"
        />
      </form>
    </div>
  );
}
