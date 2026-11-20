import argparse
import json
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from io import BytesIO
from pathlib import Path

import ee
import requests
from PIL import Image

ee.Initialize(project="veritasaihackathon")

# 5 km box. Sentinel-2 color is 10 m, so this is about 500 real pixels across.
# Earth Engine is asked for that native grid, then a smooth upscale makes the file
# large without turning each satellite pixel into a hard block.
BOX_METERS = 2500
NATIVE = 500
DISPLAY = 1500


def _best_scene(point, start, end, max_cloud=30):
    col = (
        ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(point)
        .filterDate(start, end)
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", max_cloud))
        .sort("CLOUDY_PIXEL_PERCENTAGE")
    )
    count = col.size().getInfo()
    if count == 0:
        return None, 0
    return ee.Image(col.first()), count


def _download(image, region, out_path):
    rgb = image.select(["B4", "B3", "B2"])
    url = rgb.getThumbURL({
        "region": region,
        "dimensions": NATIVE,
        "min": 0,
        "max": 3000,
        "gamma": 1.3,
        "format": "png",
    })
    response = requests.get(url, timeout=120)
    response.raise_for_status()
    img = Image.open(BytesIO(response.content)).convert("RGB")
    img = img.resize((DISPLAY, DISPLAY), Image.LANCZOS)
    img.save(out_path)


def _pull_year(point, region, year, output_dir):
    start = f"{year}-01-01"
    end = f"{int(year) + 1}-01-01"
    if year >= datetime.now(timezone.utc).year:
        end = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%d")
    image, count = _best_scene(point, start, end)
    print(f"year {year} candidates {count}", file=sys.stderr)
    if image is None:
        return None
    path = output_dir / f"satellite_{year}.png"
    _download(image, region, path)
    return str(path)


def get_satellite_images(lat, lon, years, output_dir):
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    point = ee.Geometry.Point([lon, lat])
    region = point.buffer(BOX_METERS).bounds()
    results = {}
    # Each year is an independent Earth Engine round trip, so pull them together.
    with ThreadPoolExecutor(max_workers=max(1, min(8, len(years)))) as pool:
        futures = {pool.submit(_pull_year, point, region, year, output_dir): year for year in years}
        for future in as_completed(futures):
            year = futures[future]
            try:
                path = future.result()
            except Exception as error:  # one bad year should not sink the rest
                print(f"year {year} failed: {error}", file=sys.stderr)
                continue
            if path:
                results[int(year)] = path
    return dict(sorted(results.items()))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--lat", type=float, required=True)
    parser.add_argument("--lon", type=float, required=True)
    parser.add_argument("--years", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    years = [int(part) for part in args.years.split(",") if part.strip()]
    print(f"lat {args.lat}", file=sys.stderr)
    print(f"lon {args.lon}", file=sys.stderr)
    print("years " + ", ".join(str(year) for year in years), file=sys.stderr)
    images = get_satellite_images(args.lat, args.lon, years, args.out)
    json.dump({str(year): path for year, path in images.items()}, sys.stdout)


if __name__ == "__main__":
    main()
