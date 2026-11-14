import cv2
import numpy as np
import requests

import helpers
import installationImint

norfolk = [
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
norfolkString = ""
for point in norfolk:
    norfolkString += f"{point[1]} "
    norfolkString += f"{point[0]} "
norfolkString = norfolkString.strip()
# image = cv2.imread("./pois/2020-01-02_sar.png", cv2.IMREAD_GRAYSCALE)
# query = 'nwr["waterway"="dock"]({{bbox}});nwr["waterway"="dock"]({{bbox}});nwr["natural"="water"]["water"="bay"]({{bbox}});nwr["landuse"="industrial"]["industrial"="port"]({{bbox}});nwr["man_made"="pier"]({{bbox}});nwr["man_made"="quay"]({{bbox}})'
# response = api.get(query)
# cv2.waitKey(0)
# for feature in response.features:
#     print(feature)
headers = {
    "User-Agent": "norfolk-sar-script/1.0 (your-email@example.com)",
    "Accept": "*/*",
}
body = f'[out:json][timeout:25];(nwr["waterway"="dock"](poly : "{norfolkString}");nwr["waterway"="dock"](poly : "{norfolkString}");nwr["natural"="water"]["water"="bay"](poly : "{norfolkString}");nwr["landuse"="industrial"]["industrial"="port"](poly : "{norfolkString}");nwr["man_made"="pier"](poly : "{norfolkString}");nwr["man_made"="quay"](poly : "{norfolkString}"););out geom;'
data = requests.request("POST", url = "https://overpass-api.de/api/interpreter", headers=headers, data={"data":body})

print(data.text)