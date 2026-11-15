import argparse
import json
import sys

print("WEB APP PYTHON:", sys.executable, file=sys.stderr)

import ee
import requests
from io import BytesIO
from pathlib import Path
from datetime import datetime, timedelta
from PIL import Image

ee.Initialize(project="veritasaihackathon")


def _best_scene(point, start, end, max_cloud=30, newest=False):
    col = (
        ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(point)
        .filterDate(start, end)
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", max_cloud))
    )
    n = col.size().getInfo()
    if n == 0:
        return None, 0
    # newest=True -> most recent clear scene; otherwise least cloudy
    col = col.sort("system:time_start", False) if newest else col.sort("CLOUDY_PIXEL_PERCENTAGE")
    return ee.Image(col.first()), n


def _download(image, region, out_path, upscale=8):
    rgb = image.select(["B4", "B3", "B2"])

    # Request NATIVE resolution: 2 km / 10 m = ~200 px
    url = rgb.getThumbURL({
        "region": region,
        "dimensions": 200,
        "min": 0,
        "max": 3000,
        "gamma": 1.3,
        "format": "png",
    })
    r = requests.get(url, timeout=60)
    r.raise_for_status()

    img = Image.open(BytesIO(r.content)).convert("RGB")
    # Smooth upscale locally instead of in Earth Engine
    img = img.resize((img.width * upscale, img.height * upscale), Image.LANCZOS)
    img.save(out_path)


def get_satellite_images(lat, lon, years, output_dir="images", latest=True):
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    point = ee.Geometry.Point([lon, lat])
    region = point.buffer(1000).bounds()
    results = {}

    # Most recent usable scene (last 30 days)
    if latest:
        now = datetime.utcnow()
        start = (now - timedelta(days=30)).strftime("%Y-%m-%d")
        end = (now + timedelta(days=1)).strftime("%Y-%m-%d")
        image, n = _best_scene(point, start, end, newest=True)
        if image is None:
            print("No recent scene under 30% cloud; try raising max_cloud or the window", file=sys.stderr)
        else:
            date = ee.Date(image.get("system:time_start")).format("YYYY-MM-dd").getInfo()
            path = output_dir / f"satellite_latest_{date}.png"
            _download(image, region, path)
            results["latest"] = str(path)
            print(f"Latest ({date}, {n} candidates): {path}", file=sys.stderr)

    # Historical: least-cloudy single scene per year
    for year in years:
        print(f"year {year}", file=sys.stderr)
        start = f"{year}-01-01"
        end = f"{year + 1}-01-01"
        image, n = _best_scene(point, start, end)
        if image is None:
            print(f"No images found for {year}", file=sys.stderr)
            continue
        path = output_dir / f"satellite_{year}.png"
        _download(image, region, path)
        results[year] = str(path)
        print(f"Downloaded {year} ({n} candidates): {path}", file=sys.stderr)

    return results


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--lat", type=float, required=True)
    parser.add_argument("--lon", type=float, required=True)
    parser.add_argument("--years", type=str, required=True)
    parser.add_argument("--out", type=str, required=True)
    args = parser.parse_args()
    years = [int(year) for year in args.years.split(",") if year.strip()]
    print(f"lat {args.lat}", file=sys.stderr)
    print(f"lon {args.lon}", file=sys.stderr)
    print(f"years {years}", file=sys.stderr)
    images = get_satellite_images(args.lat, args.lon, years, output_dir=args.out, latest=False)
    print(json.dumps({str(year): path for year, path in images.items()}))


if __name__ == "__main__":
    main()
