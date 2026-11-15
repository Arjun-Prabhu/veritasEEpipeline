import ee
import math
import os
import random
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, timedelta
from PIL import Image
import numpy as np

import consts

CLASS_NAMES = [
    'water',
    'trees',
    'grass',
    'flooded_vegetation',
    'crops',
    'shrub_and_scrub',
    'built',
    'bare',
    'snow_and_ice',
]

VIS_PALETTE = [
    '419bdf',
    '397d49',
    '88b053',
    '7a87c6',
    'e49635',
    'dfc35a',
    'c4281b',
    'a59b8f',
    'b39fe1',
]

# --- Sampling settings ---
NUM_IMAGES = 15000
WORKERS = 32                  # parallel EE requests (high-volume endpoint allows ~40)
SIZE = 512                    # output is SIZE x SIZE pixels
SCALE = 10                    # meters per pixel (Sentinel-2 / Dynamic World native)
JITTER_DEG = 0.15             # random offset from the location's center (~15 km)
DATE_MIN = date(2017, 4, 1)
DATE_MAX = date(2025, 9, 1)
WINDOW_DAYS = 60              # search window after the random date
MAX_CLOUD = 20                # max Sentinel-2 cloud percentage
VAL_EVERY = 5                 # every 5th image goes to val -> 80/20 train/val split
IMG_DIR = './{split}/images'  # Sentinel-2 RGB
MASK_DIR = './{split}/masks'  # Dynamic World colored labels (input to boundingBoxCreator)

ee.Authenticate()
# High-volume endpoint is built for many parallel computePixels requests
ee.Initialize(project="veritasaihackathon", opt_url='https://earthengine-highvolume.googleapis.com')

s2_col = ee.ImageCollection('COPERNICUS/S2_HARMONIZED')
dw_col = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')

# Palette lookup table: label -> RGB, 255 (no data) -> black
COLORS = np.zeros((256, 3), dtype=np.uint8)
COLORS[:len(VIS_PALETTE)] = [tuple(bytes.fromhex(c)) for c in VIS_PALETTE]

LOCATION_LIST = list(consts.LOCATIONS.values())


def random_sample():
    loc = random.choice(LOCATION_LIST)
    lon = loc['coords'][0] + random.uniform(-JITTER_DEG, JITTER_DEG)
    lat = loc['coords'][1] + random.uniform(-JITTER_DEG, JITTER_DEG)
    start = DATE_MIN + timedelta(days=random.randrange((DATE_MAX - DATE_MIN).days))
    return loc, lon, lat, start


def build_request(lon, lat, start):
    # Pixel grid in Web Mercator, centered on (lon, lat), SCALE meters per pixel on the ground
    x = 6378137.0 * math.radians(lon)
    y = 6378137.0 * math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))
    step = SCALE / math.cos(math.radians(lat))
    half = SIZE * step / 2

    lon_half = math.degrees(half / 6378137.0)
    lat_half = SIZE * SCALE / 2 / 111320.0
    region = ee.Geometry.Rectangle([lon - lon_half, lat - lat_half, lon + lon_half, lat + lat_half])

    # Least cloudy Sentinel-2 scene that fully covers the region in the date window
    s2_img = ee.Image(
        s2_col
        .filterBounds(region)
        .filterDate(start.isoformat(), (start + timedelta(days=WINDOW_DAYS)).isoformat())
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', MAX_CLOUD))
        .filter(ee.Filter.contains(leftField='.geo', rightValue=region))
        .sort('CLOUDY_PIXEL_PERCENTAGE')
        .first()
    )
    # Dynamic World image IDs match the Sentinel-2 system:index; linkCollection joins on it
    linked = s2_img.linkCollection(dw_col, ['label'])

    rgb = s2_img.select(['B4', 'B3', 'B2']).visualize(min=0, max=3000)
    label = linked.select('label').unmask(255).toUint8()
    expression = rgb.addBands(label).set('s2_id', s2_img.get('system:index'))

    return {
        'expression': expression,
        'fileFormat': 'NUMPY_NDARRAY',
        'bandIds': ['vis-red', 'vis-green', 'vis-blue', 'label'],
        'grid': {
            'dimensions': {'width': SIZE, 'height': SIZE},
            'affineTransform': {
                'scaleX': step, 'shearX': 0, 'translateX': x - half,
                'shearY': 0, 'scaleY': -step, 'translateY': y + half,  # negative = north up
            },
            'crsCode': 'EPSG:3857',
        },
    }


def fetch_one(i):
    # Retry with a new random location/date if there is no clear scene with Dynamic World coverage
    for attempt in range(5):
        loc, lon, lat, start = random_sample()
        try:
            data = ee.data.computePixels(build_request(lon, lat, start))
        except ee.EEException:
            continue

        label = data['label']
        if (label == 255).mean() > 0.05:
            continue

        rgb = np.dstack([data['vis-red'], data['vis-green'], data['vis-blue']])
        name = f"{i:05d}_{loc['category']}_{start.isoformat()}_{lat:.4f}_{lon:.4f}"
        split = 'val' if i % VAL_EVERY == 0 else 'train'
        Image.fromarray(rgb).save(f"{IMG_DIR.format(split=split)}/{name}.png", compress_level=1)
        Image.fromarray(COLORS[label]).save(f"{MASK_DIR.format(split=split)}/{name}.png", compress_level=1)
        return name, loc['name']
    return None, None


if __name__ == '__main__':
    for split in ('train', 'val'):
        os.makedirs(IMG_DIR.format(split=split), exist_ok=True)
        os.makedirs(MASK_DIR.format(split=split), exist_ok=True)

    t0 = time.time()
    done = 0
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futures = [pool.submit(fetch_one, i) for i in range(NUM_IMAGES)]
        for f in as_completed(futures):
            name, loc_name = f.result()
            if name is None:
                continue
            done += 1
            elapsed = time.time() - t0
            print(f"[{done}/{NUM_IMAGES}] {elapsed / done:.2f}s/img  {loc_name}  {name}")

    print(f"Saved {done} images in {time.time() - t0:.1f}s")
