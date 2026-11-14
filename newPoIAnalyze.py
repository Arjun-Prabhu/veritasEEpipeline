import datetime
import json
import os.path

import ee
import openai

import helpers
import installationImint
from consts import tools
from helpers import search, curlRequest
import PoIFormat


class PoIAnalyze():
    def __init__(self):
        lensURL = "http://localhost:8080/v1"

        sysPrompt = ""

        with open("./sys.txt") as f:
            for line in f:
                sysPrompt += line
        self.client = openai.Client(
            base_url=lensURL,
            api_key="sk-no-key-required"
        )
        self.messages = [
            {"role": "developer", "content": sysPrompt},
        ]

    def prep(self, poi: dict):
        name: str = poi.get("name")
        boundingBox: list = poi.get("boundingBox")
        date = str(datetime.datetime.today()).split()[0]
        dirName = name.strip().replace(" ", "").lower()
        if len(boundingBox) > 2:
            bound = ee.Geometry.Polygon(boundingBox)
        else:
            bound = ee.Geometry.Rectangle(boundingBox)

        if poi.get("imint", {}).get("needed"):
            cadence = poi.get("imint", {}).get("cadence")
            if not os.path.isdir(os.getcwd() + f"/pois/{dirName}"):
                os.makedirs(os.getcwd() + f"/pois/{dirName}")
                print(f"Directory {dirName} created")
                startDate = str(datetime.datetime.today() - datetime.timedelta(20)).split()[0]

                installationImint.getImage(bound, f"./pois/{dirName}", startDate, date, cadence)
            else:
                print(f"Directory {dirName} already exists")
                for (dirp, dirn, files) in os.walk(f"./pois/{dirName}"):
                    latestDate = str(datetime.datetime.today() - datetime.timedelta(20)).split()[0]
                    if len(files) > 0:
                        latestDate = files[0][:-4]
                        for file in files:
                            new = file[:-4]
                            if datetime.time.strptime(new, "%Y-%m-%d") > datetime.time.strptime(latestDate, "%Y-%m-%d"):
                                latestDate = new

                    print(latestDate)
                    if latestDate != date:
                        installationImint.getImage(bound, f"./pois/{dirName}", latestDate, date, cadence)

        if poi.get("ais", {}).get("needed"):
            print(f"AIS requested for {name}")
            # TODO: execute AIS collection for `bound`

        if poi.get("adsb", {}).get("needed"):
            print(f"ADS-B requested for {name}")
            # TODO: execute ADS-B collection for `bound`

    def analyze(self, poi: dict):
        name: str = poi.get("name")
        dirName = name.strip().replace(" ", "").lower()

        analysisPrompt = f"Analyze trends at {name}. TODAY'S date is {str(datetime.datetime.today()).split()[0]} A surface level corroboration revealed that IMINT was needed for this task. Below are various images of the area of interset with accompanying dates. "
        print("----------------------------------STARTING ANALYSIS-----------------------------")
        self.messages.append({"role": "user", "content": analysisPrompt})
        for (dirp, dirn, files) in os.walk(f"./pois/{dirName}"):
            for file in files:
                fileDate = file[:-4]
                encodedFile = helpers.encode_image(f"./pois/{dirName}/{file}")
                message = {"role": "user", "content": [
                    {
                        "type": "text",
                        "text": f"This is an image of the area of interset({name}) on {fileDate}"
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/png;base64,{encodedFile}"
                        },
                    },
                ]}
                self.messages.append(message)
        print(self.messages)
        isRunning = True
        while isRunning:
            toolCallRequested = False
            response = self.client.chat.completions.create(
                model="Qwen3.5-122B-A10B-Q4_K_M-merged.gguf",
                messages=self.messages,
                tools=tools,
                tool_choice="auto",
            )
            print("request sent")
            # print(response)
            self.messages.append(response.choices[0].message)
            if not response.choices[0].message.tool_calls is None:
                for item in response.choices[0].message.tool_calls:
                    toolCallRequested = True
                    if item.function.name == "search":
                        query = json.loads(item.function.arguments)["query"]
                        topic = json.loads(item.function.arguments)["topic"]
                        startTime = json.loads(item.function.arguments)["startTime"]
                        endTime = json.loads(item.function.arguments)["endTime"]
                        data = search(query, topic, startTime, endTime)
                        self.messages.append({
                            "role": "tool",
                            "content": json.dumps(data) if type(data) != "str" else data,
                            "tool_call_id": item.id,
                            "name": item.function.name
                        })
                        print("Search Request fulfilled")
                    elif item.function.name == "curlRequest":
                        url = json.loads(item.function.arguments)["url"]
                        data = curlRequest(url)
                        self.messages.append({
                            "role": "tool",
                            "content": json.dumps(data) if type(data) != "str" else data,
                            "tool_call_id": item.id,
                            "name": item.function.name
                        })
                        print("Curl Request fulfilled")

            isRunning = toolCallRequested
        print(
            "---------------------------------------------------TERMINATED ANALYSIS ||||| FORMATTING START---------------------------------------------------")
        self.messages.append({"role": "user",
                              "content": "All the data has now been consolidated. Please format it into the structured analysis template so it can be displayed."})
        convertedResponse = self.client.chat.completions.create(
            model="Qwen3.5-122B-A10B-Q4_K_M-merged.gguf",
            messages=self.messages,
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "pois_output",
                    "schema": PoIFormat.PoIAnalysis.model_json_schema(),
                    "strict": True,
                }
            }
        )
        return convertedResponse
