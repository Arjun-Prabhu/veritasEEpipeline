import datetime

import poiIdentify

analysisPrompt = f"Give me the top 20 geopolitically important military hotspots around the world. Do an in depth analysis and leave no stone unturned. The date is {str(datetime.datetime.today()).split()[0]}"
conversionPrompt = f"All the data has now been consolidated. Please format it into the structured analysis template so it can be displayed."

model = poiIdentify.PoIIdentify()

print(model.identify(analysisPrompt, conversionPrompt))