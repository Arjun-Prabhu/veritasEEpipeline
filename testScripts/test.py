# saveImage(image, roi, name, len(metadata), dirName, metadata)
import datetime
import json
import os
from sqlite3.dbapi2 import Date


import helpers
import installationImint
import newPoIAnalyze
import poiIdentify

#
#
installationImint.auth()
roi = helpers.createRegions()
# metadata = installationImint.getImage(roi.get("norfolk"),  "./pois",'2020-01-01', '2020-01-28')
# print(metadata)
poi = '{       "name": "Yulin Naval Harbor",       "boundingBox": [[109.54453741621529,18.235185006555866],[109.55137158060109,18.234548560612296],[109.5519055,18.2307576],[109.5430572,18.2318578],[109.54453741621529,18.235185006555866]],       "type": "MILITARY_MOVEMENT",       "imint": {         "needed": true,         "cadence": "MEDIUM",         "justification": "PLA naval and air incursions require visual confirmation"       },       "ais": {         "needed": true,         "cadence": "MONTHLY",         "justification": "Track carrier strike group deployments"       },       "adsb": {         "needed": true,         "cadence": "DAILY",         "justification": "Monitor ADIZ violations"       }     }'
poi  = json.loads(poi)
# for (dirp, dirn, files) in os.walk("./pois/taiwanstrait"):
#     print(dirp)
#     print(dirn)
#     print(files)
# print(os.walk("./pois/taiwanstrait")[2])
analysis = newPoIAnalyze.PoIAnalyze()
analysis.prep(poi)
# print(analysis.analyze(poi))
# installationImint.getSarImage(roi.get("norfolk"), "./pois", '2020-01-01', '2020-01-28')