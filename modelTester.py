import os

import cv2
from ultralytics import YOLO

import consts


# from ultralytics import YOLO
#
model = YOLO("./runs/segment/runs/train/gaia-5/weights/best.pt")
#
metric = model.val(max_det = 320)

