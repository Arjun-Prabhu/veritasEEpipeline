import datetime
import json
import openai

import helpers
import installationImint
from consts import tools
from helpers import search, curlRequest
import PoIFormat

installationImint.auth()
lensURL = "http://localhost:8080/v1"
regions = helpers.createRegions()

imageDate, imagePath = installationImint.getImage(regions.get("norfolk"), "norfolk")
analysisPrompt = f"Analyze this image of Norfolk Naval Harbor on {imageDate}. Identify any useful information as to what this might signify for global trends. TODAY'S date is {str(datetime.datetime.today()).split()[0]}"
conversionPrompt = f"ALl the data has now been consolidated. Please format it into the structured analysis template so it can be displayed."
image = helpers.encode_image("./" + imagePath)

sysPrompt = ""

with open("./sys.txt") as f:
    for line in f:
        sysPrompt += line
client = openai.Client(
    base_url=lensURL,
    api_key="sk-no-key-required"
)
messages = [
    {"role": "developer", "content": sysPrompt},
    {"role": "user", "content": [
        {
            "type": "text",
            "text": analysisPrompt
        },
        {
            "type": "image_url",
            "image_url": {
                "url": f"data:image/jpeg;base64,{image}"
            },
        },
    ]},

]
isRunning = True
while isRunning:
    toolCallRequested = False
    response = client.chat.completions.create(
        model="Qwen3.5-122B-A10B-Q4_K_M-merged.gguf",
        messages=messages,
        tools=tools,
        tool_choice="auto",

    )
    print("request sent")
    print(response)
    messages.append(response.choices[0].message)
    if not response.choices[0].message.tool_calls is None:
        for item in response.choices[0].message.tool_calls:
            toolCallRequested = True
            if item.function.name == "search":
                query = json.loads(item.function.arguments)["query"]
                topic = json.loads(item.function.arguments)["topic"]
                startTime = json.loads(item.function.arguments)["startTime"]
                endTime = json.loads(item.function.arguments)["endTime"]
                data = search(query, topic, startTime, endTime)
                messages.append({
                    "role": "tool",
                    "content": json.dumps(data) if type(data) != "str" else data,
                    "tool_call_id": item.id,
                    "name": item.function.name
                })
            elif item.function.name == "curlRequest":
                url = json.loads(item.function.arguments)["url"]
                data = curlRequest(url)
                messages.append({
                    "role": "tool",
                    "content": json.dumps(data) if type(data) != "str" else data,
                    "tool_call_id": item.id,
                    "name": item.function.name
                })

    isRunning = toolCallRequested
    print(messages)
print("---------------------------------------------------TERMINATED ANALYSIS ||||| FORMATTING START---------------------------------------------------")
messages.append({"role": "user", "content": conversionPrompt})
convertedResponse = client.chat.completions.create(
    model="Qwen3.5-122B-A10B-Q4_K_M-merged.gguf",
    messages=messages,
    response_format={
        "type": "json_schema",
        "json_schema": {
            "name": "pois_output",
            "schema": PoIFormat.PoIAnalysis.model_json_schema(),
            "strict": True,
        }
    }
)
print(convertedResponse)