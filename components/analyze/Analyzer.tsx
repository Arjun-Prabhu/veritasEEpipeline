"use client";

import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import CompareStage from "@/components/analyze/CompareStage";
import { caseById } from "@/lib/cases";
import { cx } from "@/lib/format";
import type { Analysis } from "@/lib/narrative";
import type { ParsedQuery } from "@/lib/query";
import { loadReports, saveReport } from "@/lib/storage";
import { coverSummary, pointChangeLines } from "@/lib/cover";
import EarthSpinner from "@/components/EarthSpinner";
import type { MLModelResponse } from "@/services/mlModelService";

type Phase = "idle" | "parsing" | "imaging" | "reading" | "ready" | "error";

const STEPS = [
  { id: "parsing", label: "Reading the question" },
  { id: "imaging", label: "Pulling and classifying the years" },
  { id: "reading", label: "Writing the briefing" },
] as const;

const EXAMPLE = "Analyze the change in New York in the last 5 years";

export default function Analyzer() {
  const [prompt, setPrompt] = useState("");
  const [hint, setHint] = useState("Search for an analysis");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [parsed, setParsed] = useState<ParsedQuery | null>(null);
  const [imagery, setImagery] = useState<MLModelResponse | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (prompt) return;
    let stopped = false;
    let timer = 0;
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timer = window.setTimeout(resolve, ms);
      });
    const play = async () => {
      while (!stopped) {
        setHint("Search for an analysis");
        await wait(1400);
        if (stopped) return;
        setHint("");
        for (let i = 1; i <= EXAMPLE.length; i += 1) {
          if (stopped) return;
          setHint(EXAMPLE.slice(0, i));
          await wait(46);
        }
        await wait(1800);
      }
    };
    void play();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [prompt]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const caseId = params.get("case");
    const query = params.get("q");
    const draft = params.get("draft") === "1";
    if (caseId) {
      const study = caseById(caseId);
      if (study) {
        setPrompt(study.prompt);
        void run(study.prompt);
      }
    } else if (query) {
      const keepEmpty = params.get("blank") === "1";
      if (!keepEmpty) setPrompt(query);
      if (!draft) void run(query, keepEmpty);
    }
    // The opening query should run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "/" && document.activeElement?.tagName !== "INPUT") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function run(nextPrompt: string, keepEmpty = false) {
    const text = nextPrompt.trim();
    if (text.length < 3) {
      setError("Ask about a place, even in a single sentence.");
      setPhase("error");
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    if (!keepEmpty) setPrompt(text);
    setError("");
    setSaved(false);
    setAnalysis(null);
    setImagery(null);
    setParsed(null);
    setPhase("parsing");
    const url = new URL(window.location.href);
    url.searchParams.delete("case");
    url.searchParams.set("q", text);
    window.history.replaceState(null, "", url);

    try {
      const parsedBody = await postJson<{ parsed: ParsedQuery }>("/api/parse", { prompt: text }, controller.signal);
      setParsed(parsedBody.parsed);
      setPhase("imaging");
      const imageryBody = await postJson<{ imagery: MLModelResponse }>(
        "/api/imagery",
        { parsed: parsedBody.parsed },
        controller.signal,
      );
      setImagery(imageryBody.imagery);
      setPhase("reading");
      const slim = imageryBody.imagery;
      const analysisBody = await postJson<{ analysis: Analysis }>(
        "/api/interpret",
        {
          prompt: text,
          imagery: {
            location: slim.location,
            latitude: slim.latitude,
            longitude: slim.longitude,
            start_year: slim.start_year,
            end_year: slim.end_year,
            focus_area: slim.focus_area,
            region: slim.region,
            country: slim.country,
            provider: slim.provider,
            frames: slim.frames.map((frame) => ({ year: frame.year, land_cover: frame.land_cover })),
          },
        },
        controller.signal,
      );
      setAnalysis(analysisBody.analysis);
      setSaved(loadReports().some((item) => item.prompt === text));
      setPhase("ready");
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setPhase("error");
      setError(cause instanceof Error ? cause.message : "The reading failed.");
    }
  }

  function onSave() {
    if (!parsed || !imagery || !analysis) return;
    saveReport({ prompt, parsed, imagery, analysis });
    setSaved(true);
  }

  const busy = phase === "parsing" || phase === "imaging" || phase === "reading";

  return (
    <main className="mx-auto flex min-h-screen max-w-[1440px] flex-col px-4 pb-16 pt-24 lg:px-6">
      <form
        className="shrink-0"
        onSubmit={(event) => {
          event.preventDefault();
          void run(prompt);
        }}
      >
        <label htmlFor="land-query" className="text-[11px] uppercase tracking-[0.22em] text-lime">
          Analyze
        </label>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <div className="prompt-gun h-12 min-w-0 flex-1">
            <input
              id="land-query"
              ref={inputRef}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={prompt ? "" : hint}
              className="absolute inset-[1.5px] z-[1] rounded-full bg-[#05060f] px-5 text-sm text-ink outline-none placeholder:text-ink/35"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="h-12 rounded-full bg-lime px-6 text-sm font-semibold text-[#071018] disabled:opacity-60"
          >
            {busy ? "Reading…" : "Read the land"}
          </button>
        </div>
      </form>

      <div className="mt-4 grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
        <div className="min-h-0">
          {imagery ? (
            <CompareStage imagery={imagery} />
          ) : parsed && phase === "imaging" ? (
            <RetrieveStage place={parsed} />
          ) : (
            <IdleStage phase={phase} error={error} />
          )}
        </div>
        <aside className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
          {busy && <Stepper phase={phase} />}
          {analysis && (
            <div>
            <TypedBriefing
              analysis={analysis}
              location={imagery?.location || parsed?.location || ""}
              years={imagery ? `${imagery.start_year}–${imagery.end_year}` : ""}
              focus={imagery?.focus_area || parsed?.focus_area || ""}
              changes={imagery ? pointChangeLines(imagery.frames) : ""}
              covers={
                imagery?.frames
                  .map((frame) => coverSummary(frame.year, frame.land_cover, Boolean(frame.classified)))
                  .join("\n") || ""
              }
              saved={saved}
              onSave={onSave}
            />
            </div>
          )}
          {!analysis && !busy && phase !== "error" && (
            <div className="flex h-full flex-col justify-center">
              <p className="text-[11px] uppercase tracking-[0.22em] text-ink/40">What comes back</p>
              <ol className="mt-4 space-y-3 text-sm text-ink/75">
                <li>01 Observed changes between the first year and the last.</li>
                <li>02 Root causes that fit this place.</li>
                <li>03 A five-year reading if the pace continues.</li>
                <li>04 Steps to slow the damage, or to protect a recovery.</li>
              </ol>
            </div>
          )}
          {phase === "error" && !imagery && (
            <p className="text-sm text-clay">{error}</p>
          )}
        </aside>
      </div>
    </main>
  );
}

function TypedBriefing({
  analysis,
  location,
  years,
  focus,
  changes,
  covers,
  saved,
  onSave,
}: {
  analysis: Analysis;
  location: string;
  years: string;
  focus: string;
  changes: string;
  covers: string;
  saved: boolean;
  onSave: () => void;
}) {
  const measured = changes.trim();
  const observed = measured && !analysis.observed_changes.includes(measured.split("\n")[0] ?? "\u0000")
    ? `${measured}\n${analysis.observed_changes}`
    : analysis.observed_changes;
  const sections = [
    { title: "Changes", text: observed },
    { title: "Prediction", text: analysis.future_predictions },
    { title: "Solution", text: analysis.root_causes },
  ].filter((section) => section.text.trim());
  const script = sections.map((section) => section.text).join("\n");
  const [count, setCount] = useState(0);
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Array<{ role: "user" | "luna"; text: string }>>([]);
  const [asking, setAsking] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const caretRef = useRef<HTMLSpanElement>(null);
  const followRef = useRef<HTMLSpanElement>(null);
  const iconRef = useRef<HTMLImageElement>(null);
  const arrived = useRef(false);

  useEffect(() => {
    setCount(0);
    arrived.current = false;
    let shown = 0;
    const timer = window.setInterval(() => {
      shown += 1;
      setCount(Math.min(script.length, shown));
      if (shown >= script.length) window.clearInterval(timer);
    }, 12);
    return () => window.clearInterval(timer);
  }, [script]);

  const shown = script.slice(0, count);
  const done = count >= script.length;
  const following = turns.some((turn) => turn.role === "luna");

  useLayoutEffect(() => {
    const box = boxRef.current;
    const icon = iconRef.current;
    const caret = (following ? followRef.current : caretRef.current);
    if (!box || !icon || !caret) return;
    const bounds = box.getBoundingClientRect();
    const spot = caret.getBoundingClientRect();
    icon.style.transition = (asking || (!done && !following)) && arrived.current
      ? "none"
      : "left 0.55s cubic-bezier(.2,.8,.2,1), top 0.55s cubic-bezier(.15,1.4,.3,1), width 0.55s ease, height 0.55s ease";
    arrived.current = asking || (!done && !following);
    icon.style.left = `${spot.left - bounds.left}px`;
    icon.style.top = `${spot.top - bounds.top}px`;
    icon.style.width = "22px";
    icon.style.height = "22px";
  }, [shown, done, following, asking, turns]);

  async function askFollowup(event: FormEvent) {
    event.preventDefault();
    const text = question.trim();
    if (!text || asking) return;
    setQuestion("");
    setAsking(true);
    setTurns((current) => [...current, { role: "user", text }, { role: "luna", text: "" }]);
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          luna: true,
          context: { location, briefing: script, years, focus, covers },
        }),
      });
      const data = (await response.json()) as { reply?: string; error?: string };
      const message = data.reply || data.error || "Luna could not answer that.";
      let index = 0;
      await new Promise<void>((resolve) => {
        const timer = window.setInterval(() => {
          index = Math.min(message.length, index + 1);
          const typed = message.slice(0, index);
          setTurns((current) => {
            const next = [...current];
            next[next.length - 1] = { role: "luna", text: typed };
            return next;
          });
          if (index >= message.length) {
            window.clearInterval(timer);
            resolve();
          }
        }, 12);
      });
    } catch {
      setTurns((current) => {
        const next = [...current];
        next[next.length - 1] = { role: "luna", text: "Luna could not reach the model." };
        return next;
      });
    } finally {
      setAsking(false);
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <img
        ref={iconRef}
        src="/luna.png"
        alt=""
        width={22}
        height={22}
        className={`pointer-events-none absolute left-0 top-0 ${asking || !done ? "luna-roll" : "luna-bob"}`}
      />
      {sections.map((section, index) => {
        const start = sections.slice(0, index).reduce((total, item) => total + item.text.length + 1, 0);
        if (count < start) return null;
        const visible = shown.slice(start, start + section.text.length);
        const typingHere = !following && count < start + section.text.length;
        return (
          <div key={section.title} className={index === 0 ? "" : "mt-6"}>
            <h3 className="text-base font-semibold text-white">{section.title}</h3>
            {visible.split("\n").map((paragraph, paragraphIndex, all) => (
              <p key={`${section.title}-${paragraphIndex}`} className="mt-2 text-sm leading-7 text-white">
                {paragraph}
                {typingHere && paragraphIndex === all.length - 1 && (
                  <span ref={caretRef} className="inline-block h-[22px] w-[22px] align-[-6px]" />
                )}
              </p>
            ))}
          </div>
        );
      })}
      {done && !following && <span ref={caretRef} className="inline-block h-0 w-0" />}
      {turns.map((turn, index) => {
        const last = index === turns.length - 1;
        return (
          <p
            key={`${turn.role}-${index}`}
            className={turn.role === "user" ? "mt-3 text-sm text-white/55" : "mt-3 text-sm leading-7 text-white"}
          >
            {turn.text}
            {last && turn.role === "luna" && (
              <span ref={followRef} className="inline-block h-[22px] w-[22px] align-[-6px]" />
            )}
          </p>
        );
      })}
      {done && (
        <form onSubmit={askFollowup} className="mt-4 flex gap-2">
          <div className="prompt-gun h-10 min-w-0 flex-1">
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask Luna"
              className="absolute inset-[1.5px] z-[1] rounded-full bg-[#05060f] px-3 text-[15px] text-white outline-none placeholder:text-white/40"
            />
          </div>
          <button type="submit" className="h-10 shrink-0 rounded-full bg-lime px-4 text-sm font-semibold text-[#071018]">
            Ask
          </button>
        </form>
      )}
      {done && (
        <button
          type="button"
          onClick={onSave}
          className="mt-4 rounded-full border border-white/15 px-4 py-2 text-sm hover:bg-white/5"
        >
          {saved ? "Saved on this device" : "Save this reading"}
        </button>
      )}
    </div>
  );
}

const RETRIEVE_LINES = ["Almost There", "Retrieving Images", "...", "..."];

function RetrieveStage({ place }: { place: ParsedQuery }) {
  const [shown, setShown] = useState(1);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setShown((count) => (count >= RETRIEVE_LINES.length ? 1 : count + 1));
    }, 700);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <section className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-3xl border border-white/10 bg-[#05060f] px-6 py-10 text-center">
      <h2 className="font-serif text-4xl text-ink md:text-5xl">{place.location}</h2>
      <EarthSpinner className="mt-8 h-28 w-28" />
      <div className="mt-6 space-y-1 text-sm text-white/80">
        {RETRIEVE_LINES.slice(0, shown).map((line, index) => (
          <p key={`${line}-${index}`}>{line}</p>
        ))}
      </div>
    </section>
  );
}

function IdleStage({ phase, error }: { phase: Phase; error: string }) {
  return (
    <section className="flex h-full min-h-[420px] flex-col justify-end rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_30%_20%,rgba(125,204,255,0.16),transparent_34%),linear-gradient(160deg,#10182c,#05060f_58%)] p-6 md:p-10">
      <p className="text-[11px] tracking-[0.28em] text-white">
        g<span className="italic text-[#3e8ec4]">AI</span>a
      </p>
      <h2 className="mt-4 max-w-xl font-serif text-5xl leading-[0.95] text-ink md:text-6xl">
        Name a place. Walk the years it has already lived.
      </h2>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-ink/70">
        A sentence is enough. gAIa pulls a year-by-year record, lays the classes on top, and writes what the change is asking for.
      </p>
      {phase === "error" && <p className="mt-4 text-sm text-clay">{error}</p>}
    </section>
  );
}

function Stepper({ phase }: { phase: Phase }) {
  const order = ["parsing", "imaging", "reading"];
  const current = order.indexOf(phase);
  return (
    <ol className="mb-5 space-y-2">
      {STEPS.map((step, index) => (
        <li key={step.id} className="flex items-center gap-3 text-sm">
          <span
            className={cx(
              "grid h-6 w-6 place-items-center rounded-full text-[11px]",
              index < current
                ? "bg-lime text-[#071018]"
                : index === current
                  ? "border border-lime text-lime"
                  : "border border-white/15 text-ink/40",
            )}
          >
            {index + 1}
          </span>
          <span className={index <= current ? "text-ink" : "text-ink/40"}>{step.label}</span>
        </li>
      ))}
    </ol>
  );
}

async function postJson<T>(url: string, body: unknown, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data as T;
}
