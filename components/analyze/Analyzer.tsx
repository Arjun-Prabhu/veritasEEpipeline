"use client";

import { useEffect, useRef, useState } from "react";
import CompareStage from "@/components/analyze/CompareStage";
import { PROMPT_CHIPS, caseById } from "@/lib/cases";
import { cx } from "@/lib/format";
import type { Analysis } from "@/lib/narrative";
import type { ParsedQuery } from "@/lib/query";
import { loadReports, saveReport } from "@/lib/storage";
import type { MLModelResponse } from "@/services/mlModelService";

type Phase = "idle" | "parsing" | "imaging" | "reading" | "ready" | "error";

const STEPS = [
  { id: "parsing", label: "Reading the question" },
  { id: "imaging", label: "Pulling the years" },
  { id: "reading", label: "Writing the briefing" },
] as const;

export default function Analyzer() {
  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [parsed, setParsed] = useState<ParsedQuery | null>(null);
  const [imagery, setImagery] = useState<MLModelResponse | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

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
      setPrompt(query);
      if (!draft) void run(query);
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

  async function run(nextPrompt: string) {
    const text = nextPrompt.trim();
    if (text.length < 3) {
      setError("Ask about a place, even in a single sentence.");
      setPhase("error");
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPrompt(text);
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
      const analysisBody = await postJson<{ analysis: Analysis }>(
        "/api/interpret",
        { prompt: text, imagery: imageryBody.imagery },
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
              placeholder="How has the land in New York City changed since 2021?"
              className="absolute inset-[1.5px] z-[1] rounded-full border border-white/10 bg-[#05060f] px-5 text-sm text-ink outline-none placeholder:text-ink/35"
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
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {PROMPT_CHIPS.map((chip) => (
            <button
              key={chip.prompt}
              type="button"
              onClick={() => void run(chip.prompt)}
              className="shrink-0 rounded-full border border-white/15 px-3 py-1.5 text-xs text-ink/80 hover:border-lime/60 hover:text-ink"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </form>

      <div className="mt-4 grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
        <div className="min-h-0">
          {imagery ? (
            <CompareStage imagery={imagery} />
          ) : (
            <IdleStage phase={phase} error={error} />
          )}
        </div>
        <aside className="min-h-0 overflow-auto rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
          {busy && <Stepper phase={phase} />}
          {analysis && <TypedBriefing analysis={analysis} saved={saved} onSave={onSave} />}
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
  saved,
  onSave,
}: {
  analysis: Analysis;
  saved: boolean;
  onSave: () => void;
}) {
  const script = [
    analysis.headline,
    analysis.observed_changes,
    analysis.root_causes,
    analysis.future_predictions,
    ...analysis.mitigation,
  ].join("\n");
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(0);
    let shown = 0;
    const timer = window.setInterval(() => {
      shown += script.length > 700 ? 3 : 2;
      setCount(Math.min(script.length, shown));
      if (shown >= script.length) window.clearInterval(timer);
    }, 14);
    return () => window.clearInterval(timer);
  }, [script]);

  let cursor = count;
  const take = (text: string) => {
    const slice = text.slice(0, cursor);
    cursor = Math.max(0, cursor - text.length - 1);
    return slice;
  };
  const headline = take(analysis.headline);
  const observed = take(analysis.observed_changes);
  const causes = take(analysis.root_causes);
  const future = take(analysis.future_predictions);
  const steps = analysis.mitigation.map((step) => take(step));
  const done = count >= script.length;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-foam">Briefing</p>
        <h2 className="mt-2 font-serif text-3xl leading-tight text-ink">
          {headline}
          {!done && headline.length < analysis.headline.length && <span className="text-lime">▍</span>}
        </h2>
      </div>
      {observed && <Insight index="01" title="Observed changes" body={observed} />}
      {causes && <Insight index="02" title="Root causes" body={causes} />}
      {future && <Insight index="03" title="Future predictions" body={future} />}
      {steps.some(Boolean) && (
        <div className="rounded-2xl border border-white/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-ink/45">04 · Actionable mitigation</p>
          <ol className="mt-3 list-decimal space-y-2 pl-4 text-sm leading-relaxed text-ink/85">
            {steps.map((step, index) =>
              step ? (
                <li key={analysis.mitigation[index]}>
                  {step}
                  {!done && index === steps.findIndex((item, itemIndex) => item.length < analysis.mitigation[itemIndex].length) && (
                    <span className="text-lime">▍</span>
                  )}
                </li>
              ) : null,
            )}
          </ol>
        </div>
      )}
      {done && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onSave}
            className="rounded-full border border-white/15 px-4 py-2 text-sm hover:bg-white/5"
          >
            {saved ? "Saved on this device" : "Save this reading"}
          </button>
          {analysis.source === "local" && (
            <p className="max-w-xs text-xs leading-relaxed text-ink/45">
              Drafted from the land-cover numbers on this machine. Add GEMINI_API_KEY for a model-written reading.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function IdleStage({ phase, error }: { phase: Phase; error: string }) {
  return (
    <section className="flex h-full min-h-[420px] flex-col justify-end rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_30%_20%,rgba(125,204,255,0.16),transparent_34%),linear-gradient(160deg,#10182c,#05060f_58%)] p-6 md:p-10">
      <p className="text-[11px] uppercase tracking-[0.28em] text-white">
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

function Insight({ index, title, body }: { index: string; title: string; body: string }) {
  return (
    <article className="rounded-2xl border border-white/10 p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-ink/45">
        {index} · {title}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-ink/85">{body}</p>
    </article>
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
