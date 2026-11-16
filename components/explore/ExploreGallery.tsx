"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import ContinentShape from "@/components/explore/ContinentShape";
import { CONTINENTS, type ContinentId } from "@/lib/continents";
import { landmarkImage, landmarkPrompt, landmarksFor, type ExploreContinent } from "@/lib/landmarks";
import { deleteReport, loadReports, type SavedReport } from "@/lib/storage";
import { startPageTransition } from "@/lib/transition";

const FOLDERS = CONTINENTS.filter((item) => item.id !== "antarctica");

export default function ExploreGallery() {
  const [saved, setSaved] = useState<SavedReport[]>([]);
  const params = useSearchParams();
  const requested = params.get("continent") as ContinentId | null;
  const continent = FOLDERS.find((item) => item.id === requested) ?? null;
  const landmarks = continent ? landmarksFor(continent.id as ExploreContinent) : [];

  useEffect(() => {
    setSaved(loadReports());
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-5 pb-24 pt-28">
      <p className="text-[11px] uppercase tracking-[0.28em] text-lime">Explore</p>
      <h1 className="mt-3 max-w-3xl font-serif text-5xl leading-[0.95] text-ink md:text-6xl">
        {continent ? continent.name : "Six continents."}
      </h1>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink/70 md:text-base">
        {continent
          ? continent.blurb
          : "Open a continent, then a landmark. Analyze runs that place from its coordinates."}
      </p>
      {continent && (
        <Link href="/explore" className="mt-6 inline-block text-sm text-[#7dccff]">
          All continents
        </Link>
      )}

      {continent ? (
        <div className="mt-8">
          <div className="mb-8 max-w-[180px]">
            <ContinentShape id={continent.id as ExploreContinent} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {landmarks.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
                <img src={landmarkImage(item)} alt="" className="h-40 w-full object-cover" />
                <div className="p-4">
                  <h2 className="font-serif text-2xl text-ink">{item.name}</h2>
                  <p className="mt-1 text-xs text-ink/50">
                    {item.lat.toFixed(2)}, {item.lon.toFixed(2)}
                  </p>
                  <Link
                    href={`/analyze?blank=1&q=${encodeURIComponent(landmarkPrompt(item))}`}
                    onClick={() => startPageTransition()}
                    className="mt-4 inline-block rounded-full bg-lime px-4 py-2 text-sm font-semibold text-[#071018]"
                  >
                    Analyze
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FOLDERS.map((item) => (
            <Link
              key={item.id}
              href={`/explore?continent=${item.id}`}
              className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-[#7dccff]/50"
            >
              <ContinentShape id={item.id as ExploreContinent} />
              <h2 className="mt-3 font-serif text-3xl text-ink">{item.name}</h2>
              <p className="mt-2 text-sm text-ink/60">{landmarksFor(item.id as ExploreContinent).length} landmarks</p>
            </Link>
          ))}
        </div>
      )}

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
