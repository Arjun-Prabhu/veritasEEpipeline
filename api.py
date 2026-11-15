import cv2
import numpy as np
from fastapi import FastAPI, HTTPException
from ultralytics import YOLO
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import Response
from ultralytics.utils.plotting import Annotator, colors

from fixedMasks import masks_no_blend
from util import convert_contours

Annotator.masks = masks_no_blend   # every r.plot() now uses this

# optional: land-cover colours instead of Ultralytics' default palette (RGB, index = class id)
colors.palette = [(0x41,0x9B,0xDF), (0x39,0x7D,0x49), (0x88,0xB0,0x53), (0x7A,0x87,0xC6),
                  (0xE4,0x96,0x35), (0xDF,0xC3,0x5A), (0xC4,0x28,0x1B), (0xA5,0x9B,0x8F),
                  (0xFF,0xFF,0xFF)]
colors.n = len(colors.palette)
app = FastAPI()
model = YOLO("./runs/segment/runs/train/gaia-5/weights/best.pt")
ids = {
0: "water",
1: "trees",
2: "grass",
3: "flooded_vegetation",
4: "crops",
5: "shrub_and_scrub",
6: "built",
7: "bare",
8: "snow_and_ice"}
@app.post("/predictionData")
def predict(file: UploadFile):
    data = file.file.read()
    if data is None:
        raise HTTPException(status_code=400, detail="No data")
    img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    totalArea = img.shape[0] * img.shape[1]
    results = model(img, conf=0.25, agnostic_nms=True, retina_masks=True)
    classes = results[0].boxes.cls.int().tolist()
    contours = convert_contours(results[0])
    areas = []
    classAreas = {"water" : 0, "trees" : 0, "grass" : 0, "flooded_vegetation" : 0, "crops" : 0, "shrub_and_scrub" : 0, "built" : 0, "bare" : 0, "snow_and_ice" : 0}
    classPercentages = {"water" : 0, "trees" : 0, "grass" : 0, "flooded_vegetation" : 0, "crops" : 0, "shrub_and_scrub" : 0, "built" : 0, "bare" : 0, "snow_and_ice" : 0}
    print(totalArea)
    if results[0].masks is not None:
        for i in range(len(classes)):
            area = results[0].masks.data[i].sum().item()
            classAreas[ids[classes[i]]] += area
            areas.append({
                "class": ids[classes[i]],
                "area": area,
                "percentage" : (area / totalArea) * 100
            })
        for key in classPercentages.keys():
            classPercentages[key] = (classAreas[key] / totalArea) * 100
        return areas, {"total areas" : classAreas, "percentage" : classPercentages}
    else:
        return "No data was received"
@app.post("/predictionImage")
def predict(file: UploadFile):
    data = file.file.read()
    if data is None:
        raise HTTPException(status_code=400, detail="No data")
    img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    results = model(img, conf=0.25)
    annotated = results[0].plot(boxes=False)
    _, buf = cv2.imencode(".png", annotated)
    png_bytes = buf.tobytes()
    return Response(content=png_bytes)