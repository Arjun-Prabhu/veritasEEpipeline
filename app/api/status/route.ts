import { NextResponse } from "next/server";
import { geminiConfigured } from "@/lib/gemini";
import { modelMode } from "@/services/mlModelService";

export const runtime = "nodejs";

export function GET() {
  const mode = modelMode();
  return NextResponse.json({
    mode,
    label: mode === "live" ? "Live ML endpoint" : "Placeholder ML Mode",
    gemini: geminiConfigured(),
  });
}
