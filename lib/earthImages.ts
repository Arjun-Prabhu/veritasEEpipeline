import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

const PYTHON_CANDIDATES = ["/opt/miniconda3/bin/python3", "python3"];

function pythonBin() {
  return PYTHON_CANDIDATES.find((bin) => bin === "python3" || existsSync(bin)) ?? "python3";
}

export function pullSatelliteImages(lat: number, lon: number, years: number[]) {
  const id = createHash("sha1")
    .update(`${lat.toFixed(4)}:${lon.toFixed(4)}:${years.join(",")}`)
    .digest("hex")
    .slice(0, 12);
  const out = path.join(process.cwd(), "EarthEngine", "out", id);
  const script = path.join(process.cwd(), "EarthEngine", "image_puller.py");

  console.log("Earth Engine lat", lat);
  console.log("Earth Engine lon", lon);
  console.log("Earth Engine years", years.join(", "));

  return new Promise<Record<number, string>>((resolve, reject) => {
    const pull = spawn(
      pythonBin(),
      [script, "--lat", String(lat), "--lon", String(lon), "--years", years.join(","), "--out", out],
      { cwd: process.cwd() },
    );
    let stdout = "";
    let stderr = "";
    pull.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    pull.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });
    const timer = setTimeout(() => {
      pull.kill();
      reject(new Error("Earth Engine took too long to return the scenes."));
    }, 240_000);
    pull.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    pull.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        const detail = stderr.trim().split("\n").slice(-4).join(" ");
        reject(new Error(detail || "Earth Engine image pull failed."));
        return;
      }
      try {
        const parsed = JSON.parse(stdout.trim().split("\n").pop() || "{}") as Record<string, string>;
        const urls: Record<number, string> = {};
        for (const year of Object.keys(parsed)) {
          const value = Number(year);
          if (!Number.isFinite(value)) continue;
          urls[value] = `/api/satellite?id=${id}&year=${value}`;
        }
        if (!Object.keys(urls).length) {
          reject(new Error("No clear satellite scenes came back for those years."));
          return;
        }
        resolve(urls);
      } catch {
        const log = ["lat " + lat, "lon " + lon, "years " + years.join(", "), stderr.trim()]
          .filter(Boolean)
          .join("\n");
        reject(new Error(`Earth Engine did not return a usable image list.\n${log}`));
      }
    });
  });
}
