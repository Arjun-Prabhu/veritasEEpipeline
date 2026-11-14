import datetime
import os

import ee
import geemap
from lxml.html.defs import empty_tags

import PoIFormat
import cvtest
from helpers import mask_s2_clouds, convert_tiff_to_png


def auth():
    ee.Authenticate()
    ee.Initialize(project='veritasaihackathon')


def saveImage(image, roi: ee.Geometry, dirName: str, metadata: dict, suffix: str = ""):
    date = image.date().format('YYYY-MM-dd').getInfo()
    name = f"{date}{suffix}"

    # installation = mask_s2_clouds(image).clip(roi)
    installation = image.clip(roi)
    geemap.ee_export_image(
        installation, filename=f"{dirName}/{name}.tif", scale=10, region=roi, file_per_band=False
    )
    metadata[date] = f"{dirName}/{name}.tif"
    convert_tiff_to_png(f"{dirName}/{name}.tif")
    os.remove(f"{dirName}/{name}.tif")


def getImage(roi: ee.Geometry, dirName: str, dateStart: ee.Date, dateEnd: ee.Date):
    dataset = (
        ee.ImageCollection('COPERNICUS/S2_HARMONIZED')
        .filterDate(dateStart, dateEnd)
        .filterBounds(roi)
        .select(['B4', 'B3', 'B2'])
    )
    print(dataset.size())


auth()
roi = ee.Geometry.Rectangle([-77.1198, 38.7916, -76.9094, 38.9955])

getImage(roi=ee.Geometry(roi), dirName="", dateStart=ee.Date('2017-6-24'), dateEnd=ee.Date('2017-6-30'))
