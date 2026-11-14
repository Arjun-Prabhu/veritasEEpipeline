import cv2
import numpy as np

image = cv2.imread('img.png')
hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
greenLower = np.array([133 / 2, 0.567 * 255, 0.474 * 255])
greenUpper = np.array([137 / 2, 0.607 * 255, 0.514 * 255])
thresh_img = cv2.inRange(hsv, greenLower, greenUpper)
cv2.imshow("Displayed Image: ", thresh_img)
cv2.waitKey(0)
cv2.destroyAllWindows()
