import cv2
from ultralytics import YOLO

model = YOLO("./runs/segment/runs/train/gaia-5/weights/best.pt")
results = model("./data/images/val/00105_city_2024-05-28_-33.8773_151.1097.png", save=True, conf=0.3)
print(results)