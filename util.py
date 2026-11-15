import cv2
import numpy as np


def convert_contours(r):
    contours = []
    assert r is not None
    yolo_contours = r.masks.xy

    # Convert to OpenCV format
    opencv_contours = []

    for contour in yolo_contours:
        contour = np.array(contour, dtype=np.int32)
        contour = contour.reshape((-1, 1, 2))
        opencv_contours.append(contour)
    return opencv_contours