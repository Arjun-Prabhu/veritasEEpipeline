import { NextRequest } from "next/server";
import { isScene, renderTile } from "@/services/tileArt";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  const scene = request.nextUrl.searchParams.get("scene");
  const t = Number(request.nextUrl.searchParams.get("t") ?? "0");
  const kind = request.nextUrl.searchParams.get("kind") === "mask" ? "mask" : "photo";
  if (!isScene(scene) || Number.isNaN(t)) {
    return new Response("Unknown tile", { status: 400 });
  }
  const svg = renderTile(scene, t, kind);
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
