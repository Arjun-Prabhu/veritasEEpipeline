import base64
import math
import os
from pathlib import Path
from random import Random
from sqlite3.dbapi2 import Date

import curl_cffi
import ee
import numpy as np
import rasterio
import requests
import trafilatura
from bs4 import BeautifulSoup
from numpy import dtype
from tavily import TavilyClient
from PIL import Image
from rasterio.plot import reshape_as_image

def mask_s2_clouds(image):
  """Masks clouds in a Sentinel-2 image using the QA band.

  Args:
      image (ee.Image): A Sentinel-2 image.

  Returns:
      ee.Image: A cloud-masked Sentinel-2 image.
  """

  # Bits 10 and 11 are clouds and cirrus, respectively.
  cloud_bit_mask = 1 << 10
  cirrus_bit_mask = 1 << 11

  # Both flags should be set to zero, indicating clear conditions.
  mask = (
      image.bitwiseAnd(cloud_bit_mask)
      .eq(0)
      .And(image.bitwiseAnd(cirrus_bit_mask).eq(0))
  )

  return image.updateMask(mask).divide(10000)



def curlRequest(url):
    try :
        cResponse = trafilatura.extract(curl_cffi.get(url=url, impersonate="chrome").text)
        if type(cResponse) is None or len(cResponse) < 80:
            print("response terminated")
            return "FETCH FAILED as a result of countermeasures"
        elif len(cResponse) <500:
            print("response terminated")
            return f"FETCH RETURNED DATA but was most likely PAYWALLED: \n{cResponse}"
        else:
            return f"COMPLETE DATA RECEIVED: {cResponse}"
    except ConnectionError as e:
        print("response terminated")
        return f"Connection error: {e}; Most likely remote connection was closed as a result of bot countermeasures"


def search(query, topic, startTime, endTime):
    try:
        tClient = TavilyClient(api_key="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")
        tResponse = tClient.search(query=query, topic=topic, startTime=startTime, endTime=endTime)
        return tResponse.get("results")
    except Exception as e:
        return f"ERROR: {e}. Make sure your inputs are correct"
def convert_tiff_to_png(inputFile):
    red_idx, green_idx, blue_idx = 3, 2, 1
    gamma1 = 1/2.2
    with rasterio.open(inputFile) as src:
        try:
            path = Path(inputFile)
            output_filename = "./" + str(inputFile[2])+ ".png"
            print(f"File exists: {path.exists()}")
            src_Data = src.read([red_idx, green_idx, blue_idx])
            img = reshape_as_image(src_Data)

            min_vals = src_Data.min(axis=(1, 2), keepdims=True)
            max_vals = src_Data.max(axis=(1, 2), keepdims=True)
            range_vals = np.where(max_vals == min_vals, 1, max_vals - min_vals)
            # img_scaled = ((src_Data - min_vals) / range_vals * 255.0).astype(np.uint8)
            # (np.pow(((src_Data - min_vals) / range_vals), gamma1) * 255.0).astype(np.uint8)
            img_scaled = (np.pow(((src_Data - min_vals) / range_vals), gamma1)*255.0).astype(np.uint8)

            # Convert the image to RGBA mode
            profile = src.profile
            profile.update(
                driver="JPEG",
                count=3,
                dtype=rasterio.uint8,
                height=src.height,
                width=src.width,
                transform=src.transform
            )
            with rasterio.open(output_filename, 'w', **profile) as dest:
                # Reshape back to rasterio format (bands, height, width)
                dest.write(img_scaled)
            if src.width < 600 or src.height < 600:
                conversionFactor = int(600/src.width) if src.width < src.height else int(600/src.height)
                with Image.open(output_filename) as imgs:
                    output_filename = inputFile[:-4] + ".png"#"./" + str(inputFile[2]) + "b.png"
                    imgs.resize((src.width*conversionFactor, src.height*conversionFactor)).save(f"{output_filename}","JPEG")
            print(f"Conversion successful")
            return output_filename
        except Exception as e:
            print(f"Conversion failed: {e}")

def encode_image(image_path: str):
    try:
        with open(image_path, "rb") as file:
            return base64.b64encode(file.read()).decode("utf-8")
    except Exception as e:
        return f"ERROR: {e}"

def createRegions():
    return {"norfolk" : ee.Geometry.Polygon(
              [
                [
                  -76.3359916,
                  36.9321102
                ],
                [
                  -76.3268304,
                  36.9323136
                ],
                [
                  -76.3246928,
                  36.9643245
                ],
                [
                  -76.3342103,
                  36.9650565
                ],
                [
                  -76.3381292,
                  36.9583057
                ],
                [
                  -76.3384346,
                  36.9493172
                ],
                [
                  -76.33874,
                  36.9402871
                ],
                [
                  -76.3359916,
                  36.9321102
                ]
              ]
    )}