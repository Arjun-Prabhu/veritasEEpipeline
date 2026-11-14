import ee
import geemap.core as geemap
import requests
import rasterio
from PIL import Image
import numpy as np

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

ee.Authenticate()
ee.Initialize(project="veritasaihackathon")

START = ee.Date('2021-04-02')
END = START.advance(5, 'day')
# region = ee.Geometry.Point(20.6729, 52.4305)
region = ee.Geometry.Rectangle([
    ee.Geometry.Point(coords=[ -77.044850,38.900373]),
    ee.Geometry.Point(coords=[-77.033306,38.909373])]
)
col_filter = ee.Filter.And(
    ee.Filter.bounds(region),
    ee.Filter.date(START, END),
)

dw_col = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
s2_col = ee.ImageCollection('COPERNICUS/S2_HARMONIZED').filter(col_filter)
bands = ['water', 'trees', 'grass', 'flooded_vegetation', 'crops', 'shrub_and_scrub', 'built', 'bare', 'snow_and_ice']
print(type(dw_col))

print(s2_col.size().getInfo())

# Check that Sentinel-2 returned images
if s2_col.size().getInfo() == 0:
    raise ValueError("No Sentinel-2 images found for this region/date.")

# Get the first Sentinel-2 image
s2_img = ee.Image(s2_col.first())

# Get its actual system:index
orgImgID = s2_img.get('system:index').getInfo()
print("Sentinel-2 image ID:", orgImgID)

# Filter Dynamic World to the same region and date
dw_filtered = (
    dw_col
    .filterBounds(region)
    .filterDate(START, END)
    .filter(ee.Filter.eq('system:index', orgImgID))
)

# Verify matching image exists
match_count = dw_filtered.size().getInfo()
print("Dynamic World matches:", match_count)

if match_count == 0:
    raise ValueError("No matching Dynamic World image found.")

imgDW = ee.Image(dw_filtered.first())

# Generate GeoTIFF download URL
url = imgDW.select(bands).getDownloadURL({
    'bands': bands,
    'region': region,
    'scale': 10,
    'format': 'GEO_TIFF',
    'filePerBand': False
})

print("Download URL generated.")

# Download
response = requests.get(url, timeout=120)
response.raise_for_status()

print("HTTP status:", response.status_code)
print("Content type:", response.headers.get('Content-Type'))
print("Downloaded bytes:", len(response.content))

# Check that response is actually a TIFF
if not response.content[:4] in [
    b'II*\x00',
    b'MM\x00*',
    b'II+\x00',
    b'MM\x00+'
]:
    raise ValueError(
        "Earth Engine did not return a valid TIFF. "
        f"Response: {response.text[:500]}"
    )

# Save
with open('new.tif', 'wb') as f:
    f.write(response.content)

print("GeoTIFF saved successfully!")




with rasterio.open('new.tif') as src:
    print("\n--- TIFF VALIDATION ---")
    print("Width:", src.width)
    print("Height:", src.height)
    print("Number of bands:", src.count)
    print("CRS:", src.crs)
    print("Data type:", src.dtypes)

    data = src.read()

    print("Array shape:", data.shape)
    print("Minimum:", np.nanmin(data))
    print("Maximum:", np.nanmax(data))



with rasterio.open('new.tif') as src:
    data = src.read()

# Find the most probable class for each pixel
labels = np.argmax(data, axis=0)

# Convert hex palette into RGB values
colors = np.array([
    tuple(bytes.fromhex(c))
    for c in VIS_PALETTE
], dtype=np.uint8)

# Create RGB image
rgb = colors[labels]

# Save as PNG
Image.fromarray(rgb).save('new.png')

print("PNG successfully created!")
