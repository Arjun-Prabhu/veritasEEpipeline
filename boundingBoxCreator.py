import os

import cv2
from concurrent.futures import ThreadPoolExecutor

import consts


def createContours(img:str):
    segmentations = []
    for key, val in consts.DW_CLASSES.items():
        analyzeContours(img, val["hsv"][0], val["hsv"][1], val["id"], segmentations)
    return segmentations

def analyzeContours(img:str, threshLower, threshUpper, id, seg):
    assert img is not None
    image = cv2.imread(img)
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    thresh_img = cv2.inRange(hsv, threshLower, threshUpper)
    annotatedImg = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)

    contours, _ = cv2.findContours(thresh_img, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    for cnt in contours:
        perimeter = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.0007 * perimeter, True)
        cv2.drawContours(annotatedImg, [approx], -1, (0, 255, 0), 2)
        area = cv2.contourArea(cnt)
        if area < 100:
            continue
        coords = [id]
        for point in approx:
            x, y = point[0]
            cv2.circle(annotatedImg, (x, y), 5, (0, 0, 255), -1)
            coords.append(int(x) / 512)
            coords.append(int(y) / 512)
        seg.append(coords)
        # print(f"{coords}")
def convertImage(img:str, dir:str):
    segmentations = createContours(dir + img)
    print(segmentations)
    with open(f"data/val/labels/{img[0:-4]}.txt", "w", encoding="utf-8") as fileF:
        for i in segmentations:
            for j in i:
                # print(type(str(j)))
                if not (str(j) == "[" or str(j) == "]"):
                    fileF.write(str(j) + " ")
            fileF.write("\n")
    print("Finished image")


dir = os.fsencode("data/val/masks/")
assigned = []
with ThreadPoolExecutor(max_workers=32) as executor:
    for file in os.listdir(dir):
        name = file.decode("utf-8")
        if not (name in assigned):
            try: executor.submit(convertImage, name, "./val/masks/")
            except Exception as e:
                print(e)
            assigned.append(name)
        else:
            print("Race condition occurred but was caught")
        print("Total Threads Assigned: " + str(len(assigned)))
