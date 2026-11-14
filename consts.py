import ee

tools = [
    {"type": "function",
     "function": {
         "name": "curlRequest",
         "description": "Returns formatted HTML source of target document",
         "parameters": {
             "type": "object",
             "properties": {
                 "url": {
                     "type": "string",
                     "description": "URL of target document"
                 }
             },
             "required": ["url"]
         }
     }

     },
    {"type": "function",
     "function": {
         "name": "search",
         "description": "Returns list of sources related to query",
         "parameters": {
             "type": "object",
             "properties": {
                 "query": {
                     "type": "string",
                     "description": "Specified query from which URLs are extracted from"
                 },
                 "topic": {
                     "type": "string",
                     "description": "Specified topic. It CAN ONLY BE: \"general\", \"news\", \"finance\"."
                 },
                 "startTime": {
                     "type": "string",
                     "description": "Specified BEGINNING of the time range to extract data from. MUST BE IN THE FORMAT OF: YYYY-MM-DD. EXAMPLE: 2021-06-30"
                 },
                 "endTime": {
                     "type": "string",
                     "description": "Specified END of the time range to extract data from. MUST BE IN THE FORMAT OF: YYYY-MM-DD. EXAMPLE: 2021-06-30"
                 },
             },
             "required": ["query", "topic", "time_range"]
         }

     }
     }
]
