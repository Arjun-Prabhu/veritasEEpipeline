import type { Analysis } from "@/lib/narrative";
import type { ParsedQuery } from "@/lib/query";
import type { MLModelResponse } from "@/services/mlModelService";

const KEY = "gaia.reports.v1";

export type SavedReport = {
  id: string;
  savedAt: string;
  prompt: string;
  parsed: ParsedQuery;
  imagery: MLModelResponse;
  analysis: Analysis;
};

export function loadReports(): SavedReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedReport[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveReport(report: Omit<SavedReport, "id" | "savedAt">) {
  const next: SavedReport = {
    ...report,
    id: `${Date.now()}`,
    savedAt: new Date().toISOString(),
  };
  const prev = loadReports().filter((item) => item.prompt !== report.prompt);
  window.localStorage.setItem(KEY, JSON.stringify([next, ...prev].slice(0, 12)));
  return next;
}

export function deleteReport(id: string) {
  const next = loadReports().filter((item) => item.id !== id);
  window.localStorage.setItem(KEY, JSON.stringify(next));
}
