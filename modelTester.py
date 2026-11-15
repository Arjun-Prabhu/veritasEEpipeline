import cv2
from ultralytics import YOLO

model = YOLO("./runs/segment/runs/train/gaia-5/weights/best.pt")
results = model("./PNG image.png", save=True, conf=0.3)
