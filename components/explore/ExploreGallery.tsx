"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CASES } from "@/lib/cases";
import { CONTINENTS, type ContinentId } from "@/lib/continents";
import { deleteReport, loadReports, type SavedReport } from "@/lib/storage";

export default function ExploreGallery() {
  const [saved, setSaved] = useState<SavedReport[]>([]);
  const [continent, setContinent] = useState<(typeof CONTINENTS)[number] | null>(null);

  useEffect(() => {
    setSaved(loadReports());
    const id = new URLSearchParams(window.location.search).get("continent") as ContinentId | null;
    setContinent(CONTINENTS.find((item) => item.id === id) ?? null);
  }, []);

  const studies = continent
    ? [
        ...CASES.filter((item) => item.continent === continent.id),
        ...CASES.filter((item) => item.continent !== continent.id),
      ]
    : CASES;

  return (
    <main className="mx-auto max-w-6xl px-5 pb-24 pt-28">
      <p className="text-[11px] uppercase tracking-[0.28em] text-lime">Case studies</p>
      <h1 className="mt-3 max-w-3xl font-serif text-5xl leading-[0.95] text-ink md:text-6xl">
        Places already in motion.
      </h1>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink/70 md:text-base">
        {continent
          ? continent.blurb
          : "Open a finished example and gAIa will run it. Readings you save in analyze stay on this device."}
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {studies.map((item, index) => (
          <Link
            key={item.id}
            href={`/analyze?case=${item.id}`}
            className={`group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] transition hover:border-lime/40 ${index === 0 ? "md:col-span-2 md:grid md:grid-cols-2" : ""}`}
          >
            <img
              src={`/api/tile?scene=${item.scene}&t=${item.t}&kind=photo`}
              alt=""
              className="h-56 w-full object-cover transition duration-700 group-hover:scale-[1.03] md:h-64"
            />
            <div className="flex flex-col justify-end p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-foam">
                {item.years}
                <span className="mx-2 text-ink/30">/</span>
                {item.focus}
              </p>
              <h2 className="mt-2 font-serif text-3xl text-ink">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink/70">{item.summary}</p>
              <span className="mt-4 text-sm text-lime">Open in analyze</span>
            </div>
          </Link>
        ))}
      </div>

      <section className="mt-16">
        <h2 className="font-serif text-3xl text-ink">Saved on this device</h2>
        {saved.length === 0 ? (
          <p className="mt-3 max-w-lg text-sm text-ink/60">
            Nothing saved yet. Run a reading in analyze and keep it here for the next visit.
          </p>
        ) : (
          <ul className="mt-5 grid gap-3">
            {saved.map((report) => (
              <li
                key={report.id}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-serif text-2xl text-ink">{report.imagery.location}</p>
                  <p className="mt-1 text-sm text-ink/60">
                    {report.imagery.start_year}–{report.imagery.end_year}
                    <span className="mx-2 text-ink/25">/</span>
                    {new Date(report.savedAt).toLocaleDateString()}
                  </p>
                  <p className="mt-2 max-w-2xl text-sm text-ink/75">{report.analysis.headline}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link
                    href={`/analyze?q=${encodeURIComponent(report.prompt)}`}
                    className="rounded-full bg-lime px-4 py-2 text-sm font-semibold text-[#071018]"
                  >
                    Open
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      deleteReport(report.id);
                      setSaved(loadReports());
                    }}
                    className="rounded-full border border-white/15 px-4 py-2 text-sm text-ink/75"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
