import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id") ?? "";
  const year = url.searchParams.get("year") ?? "";
  if (!/^[a-f0-9]{12}$/.test(id) || !/^\d{4}$/.test(year)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const file = path.join(process.cwd(), "EarthEngine", "out", id, `satellite_${year}.png`);
  try {
    const image = await readFile(file);
    return new NextResponse(image, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
}
