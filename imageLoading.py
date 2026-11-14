import ee
import geemap.core as geemap
import requests

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
orgImgID = s2_col.first().get('system:index')
img = s2_col.first().select(['B4', 'B3', 'B2']).visualize(min=0, max=3000)
print(img.bandNames().getInfo())

print(orgImgID.getInfo())
imgDW = ee.Image(dw_col.filter(ee.Filter.eq('system:index', orgImgID)).first())



url = imgDW.getDownloadURL({
    'bands': ['water', 'trees', 'grass', 'flooded_vegetation', 'crops', 'shrub_and_scrub', 'built', 'bare', 'snow_and_ice'],
    'region': region,
    'scale': 10,
    'format': 'PNG',
})
response = requests.get(url)
with open('new.png', 'wb') as fd:
  fd.write(response.content)