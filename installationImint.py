import datetime
import os

import ee
import geemap
from lxml.html.defs import empty_tags

import PoIFormat
from helpers import mask_s2_clouds, convert_tiff_to_png


# IMINT cadence controls how frequently Sentinel-2 images are sampled across the
# requested window: it is the MINIMUM number of days that must separate two
# consecutive saved images. Higher coverage -> smaller spacing -> more images.
CADENCE_MIN_INTERVAL_DAYS = {
    PoIFormat.IMINTCadence.MAXIMUM_COVERAGE.value: 0,
    PoIFormat.IMINTCadence.MEDIUM_COVERAGE.value: 5,
    PoIFormat.IMINTCadence.MINIMUM_COVERAGE.value: 10,
}


def auth():
    ee.Authenticate()
    ee.Initialize(project='lens-495521')
def saveImage(image, roi: ee.Geometry, dirName: str, metadata:dict, suffix: str = ""):
    date = image.date().format('YYYY-MM-dd').getInfo()
    name = f"{date}{suffix}"

    # installation = mask_s2_clouds(image).clip(roi)
    installation = image.clip(roi)
    geemap.ee_export_image(
        installation , filename=f"{dirName}/{name}.tif", scale=10, region=roi, file_per_band=False
    )
    metadata[date] = f"{dirName}/{name}.tif"
    convert_tiff_to_png(f"{dirName}/{name}.tif")
    os.remove(f"{dirName}/{name}.tif")

def getImage(roi: ee.Geometry, dirName:str, dateStart:str, dateEnd:str, cadence: str = None):
    minIntervalDays = CADENCE_MIN_INTERVAL_DAYS.get(cadence, 0)

    dataset = (
        ee.ImageCollection('COPERNICUS/S2_HARMONIZED')
        .filterDate(dateStart, dateEnd)
        .filterBounds(roi)
        .select(['B4', 'B3', 'B2'])
    )

    dates = (dataset.aggregate_array('system:time_start')
             .map(lambda t: ee.Date(t).format('YYYY-MM-dd'))
             .distinct())

    def daily_mosaic(d):
        d = ee.Date(d)
        day = dataset.filterDate(d, d.advance(1, 'day'))
        return (day.mosaic()
                .set('system:time_start', d.millis())
                .set('date', d.format('YYYY-MM-dd')))

    daily = ee.ImageCollection(dates.map(daily_mosaic))

    def tag_coverage(img):
        cov = (img.select('B4').mask()
               .reduceRegion(reducer=ee.Reducer.mean(),
                             geometry=roi, scale=10, maxPixels=1e9)
               .get('B4'))
        return img.set('coverage', cov)

    full = (daily.map(tag_coverage)
            .filter(ee.Filter.gte('coverage', 0.95))
            .sort('system:time_start'))


    metadata = {}
    images = full.toList(dataset.size())
    length = images.length().getInfo()

    lastSavedDate = None
    for image in range(length):
        file = ee.Image(images.get(image))
        dateStr = ee.Date(file.get('system:time_start').getInfo()).format('YYYY-MM-dd').getInfo()
        imgDate = datetime.datetime.strptime(dateStr, '%Y-%m-%d')
        # enforce the cadence: skip images closer than minIntervalDays to the last saved one
        if lastSavedDate is not None and (imgDate - lastSavedDate).days < minIntervalDays:
            print(f"Skipping {dateStr} (within {minIntervalDays}-day cadence of {lastSavedDate.date()})")
            continue
        lastSavedDate = imgDate
        md = {
            'date': dateStr,
            'spacecraft': file.get('SPACECRAFT_NAME').getInfo(),
            'rel_orbit': file.get('SENSING_ORBIT_NUMBER').getInfo(),
            'mgrs': file.get('MGRS_TILE').getInfo(),
        }
        print(md)
        saveImage(file, roi, dirName, metadata)
    return metadata


def getSarImage(roi: ee.Geometry, dirName: str, dateStart: str, dateEnd: str):
    """Fetch Sentinel-1 SAR (GRD) imagery as a black-and-white radar-intensity image.

    SAR is cloud-penetrating and works day or night, so it complements the optical
    Sentinel-2 imagery produced by getImage(). The grayscale is driven purely by VV
    backscatter intensity. Output PNGs are written alongside the optical ones with a
    '_sar' suffix so the two do not collide.
    """
    dataset = (
        ee.ImageCollection('COPERNICUS/S1_GRD')
        .filterDate(dateStart, dateEnd)
        .filterBounds(roi)
        .filter(ee.Filter.eq('instrumentMode', 'IW'))
        .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
        .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
        .select(['VV', 'VH'])
    )

    dates = (dataset.aggregate_array('system:time_start')
             .map(lambda t: ee.Date(t).format('YYYY-MM-dd'))
             .distinct())

    def daily_mosaic(d):
        d = ee.Date(d)
        day = dataset.filterDate(d, d.advance(1, 'day'))
        first = day.first()
        # focal_median smooths SAR speckle so the PNG stays readable
        mosaic = day.mosaic().focal_median(30, 'circle', 'meters')
        # pure grayscale: replicate VV backscatter intensity into all three bands so
        # convert_tiff_to_png emits a black-and-white image (R == G == B)
        vv = mosaic.select('VV')
        composite = vv.addBands(vv).addBands(vv).rename(['B4', 'B3', 'B2'])
        return (composite
                .set('system:time_start', d.millis())
                .set('date', d.format('YYYY-MM-dd'))
                .set('platform_number', first.get('platform_number'))
                .set('orbitProperties_pass', first.get('orbitProperties_pass'))
                .set('relativeOrbitNumber_start', first.get('relativeOrbitNumber_start')))

    daily = ee.ImageCollection(dates.map(daily_mosaic))

    def tag_coverage(img):
        cov = (img.select('B4').mask()
               .reduceRegion(reducer=ee.Reducer.mean(),
                             geometry=roi, scale=10, maxPixels=1e9)
               .get('B4'))
        return img.set('coverage', cov)

    full = daily.map(tag_coverage).filter(ee.Filter.gte('coverage', 0.95))

    metadata = {}
    images = full.toList(dataset.size())
    length = images.length().getInfo()

    for image in range(length):
        file = ee.Image(images.get(image))
        md = {
            'date': ee.Date(file.get('system:time_start').getInfo()).format('YYYY-MM-dd').getInfo(),
            'platform': file.get('platform_number').getInfo(),
            'orbit_pass': file.get('orbitProperties_pass').getInfo(),
            'rel_orbit': file.get('relativeOrbitNumber_start').getInfo(),
        }
        print(md)
        saveImage(file, roi, dirName, metadata, suffix='_sar')
    return metadata



