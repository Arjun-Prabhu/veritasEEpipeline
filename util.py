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

def auto_stretch(img, lo_pct=2, hi_pct=98):
    """Per-channel percentile stretch. Removes haze/colour cast so imagery looks like the training data."""
    out = np.empty_like(img)
    for c in range(3):
        lo, hi = np.percentile(img[..., c], (lo_pct, hi_pct))
        out[..., c] = np.clip((img[..., c].astype(np.float32) - lo) * 255.0 / max(hi - lo, 1), 0, 255)
    return out

def needs_stretch(img):
    # hazy/washed-out: low contrast in every channel
    return img.reshape(-1, 3).std(0).max() < 25