import json
from pyexpat.errors import messages

import openai

from consts import tools
from helpers import search, curlRequest
import PoIFormat

class PoIIdentify():
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
    def identify(self, analysisPrompt, conversionPrompt):
        print("----------------------------------STARTING ANALYSIS-----------------------------")
        self.messages.append({"role": "user", "content": analysisPrompt})
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
        print("---------------------------------------------------TERMINATED ANALYSIS ||||| FORMATTING START---------------------------------------------------")
        self.messages.append({"role": "user", "content": conversionPrompt})
        convertedResponse = self.client.chat.completions.create(
            model="Qwen3.5-122B-A10B-Q4_K_M-merged.gguf",
            messages=self.messages,
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "pois_output",
                    "schema": PoIFormat.PoIs.model_json_schema(),
                    "strict": True,
                }
            }
        )
        # print(convertedResponse)
        return convertedResponse