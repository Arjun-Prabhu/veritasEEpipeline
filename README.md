# gAIa

gAIa is a land-change studio named for Gaia, the Greek goddess of the Earth, with the intelligence written into the middle of her name. Ask how a place has changed. The app parses the question, pulls a year-by-year record, and writes what the trend means and what to do next.

## Run it

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Route | What it is |
| --- | --- |
| `/` | Scroll-only home. A satellite tile pulls back into a 3D Earth. Lenis and the scroll timeline live only on this page. |
| `/analyze` | The workspace. Natural-language query, year slider, classification overlay, land-cover bars, and a briefing. |
| `/explore` | Case studies, plus readings saved in this browser. |

`GEMINI_API_KEY` ships as `placeholder-gemini-api-key`. The app sends that value to Gemini as a real key. The box under the home tiles reports whether the call succeeded. Replace the placeholder with a key from Google AI Studio for live replies. The analyzer still falls back to the local parser if the call fails. Imagery stays on the mock adapter until you flip the switch below.

## Pipeline

1. **Parse.** `POST /api/parse` sends the prompt to Gemini `models/gemini-3.8-flash` with a JSON schema and returns `location`, `start_year`, `end_year`, `focus_area`, plus a map center. If the prompt has no years, the range is 2021–2026.
2. **Imagery.** `POST /api/imagery` calls `fetchLandImagery()` in `services/mlModelService.ts`. Nothing else in the app knows whether the tiles are simulated.
3. **Read.** `POST /api/interpret` sends the user’s prompt, the land-cover table, and the first, middle, and last images back to Gemini and returns observed changes, root causes, a five-year reading, and mitigation steps.

## How to integrate your finished ML model

The UI, the parser, and the briefing do not change. Only the adapter does.

### 1. JSON contract

`fetchLandImagery` POSTs `MLModelRequest` and expects `MLModelResponse`. Both interfaces live at the top of `services/mlModelService.ts`.

Request:

```json
{
  "location": "Amazon Basin",
  "start_year": 2018,
  "end_year": 2024,
  "focus_area": "deforestation",
  "latitude": -3.4653,
  "longitude": -62.2159
}
```

`latitude` and `longitude` are optional. Include them when you have a better center than the one gAIa guessed.

Response:

```json
{
  "location": "Amazon Basin",
  "latitude": -3.4653,
  "longitude": -62.2159,
  "start_year": 2018,
  "end_year": 2024,
  "focus_area": "deforestation",
  "provider": "remote",
  "frames": [
    {
      "year": 2018,
      "image_url": "https://your-cdn.example/amazon-2018.jpg",
      "mask_url": "https://your-cdn.example/amazon-2018-mask.png",
      "land_cover": {
        "green_space": 74,
        "urban": 4,
        "water": 8,
        "crops": 11,
        "built": 3
      }
    }
  ]
}
```

Rules the adapter checks before the UI ever sees the payload:

- `frames` is a non-empty array.
- Every frame has a numeric `year`.
- Every frame has `image_url` or `image_base64`. If both are present, the slider uses the base64. Send one of them.
- `land_cover` includes numeric `green_space`, `urban`, `water`, `crops`, and `built`. Use a 0–100 percent of the tile. They should sum to about 100.
- `mask_url` / `mask_base64` are optional. When present, the Classification toggle draws them over the photo.
- One frame per year you want on the timeline, in any order. The workspace sorts nothing; return them from oldest to newest.

A non-200 response, invalid JSON, a timeout (45 seconds), or a body that misses those fields is shown as an error in the analyzer. The briefing step does not run.

### 2. Image URLs and base64

Each year can use either form. Mix them if you need to.

URL (preferred when the file is already hosted):

```json
{ "year": 2024, "image_url": "https://cdn.example.com/tile.jpg", "mask_url": "https://cdn.example.com/tile-mask.png" }
```

The browser loads that URL directly. Absolute `https` URLs and site-relative paths such as `/tiles/amazon-2024.jpg` (a file in `public/`) both work.

Base64 (no `data:` prefix):

```json
{
  "year": 2024,
  "image_base64": "<raw base64>",
  "image_mime": "image/png",
  "mask_base64": "<raw base64>",
  "mask_mime": "image/png"
}
```

`image_mime` defaults to `image/jpeg` and `mask_mime` defaults to `image/png` when omitted. The client turns these into `data:` URLs for the slider. The briefing route does the same, resizes the bitmap to fit inside 768×768, and sends PNG bytes to Gemini. SVG strings, local `/api/tile` previews, `data:` URLs, public files, and remote URLs are all accepted on that path.

Send a real image, not a page of HTML. Transparent PNG masks should line up with the photo — same dimensions and the same extent — because the UI stacks them with `object-cover`.

### 3. Flip the switch

In `.env.local`:

```bash
USE_MOCK_MODEL=false
ML_MODEL_ENDPOINT_URL=http://localhost:8000/predict
ML_MODEL_API_KEY=your-token-if-you-use-one
```

Restart the dev server. `USE_MOCK_MODEL=false` is the only flag that leaves the mock. Any other value, including an empty one, keeps the placeholder (a 2 second delay and simulated tiles).

When the flag is false the adapter:

- POSTs the request JSON to `ML_MODEL_ENDPOINT_URL`
- sets `Authorization: Bearer <ML_MODEL_API_KEY>` when the key is non-empty
- aborts after 45 seconds
- validates the body with `assertMLModelResponse`

The nav badge switches from **Placeholder ML Mode** to **Live ML endpoint**. No frontend component and no Gemini prompt needs an edit.

## Credits

The opening photograph is an ESA view of the Amazon River ([ESA387332](https://commons.wikimedia.org/wiki/File:Amazon_River_ESA387332.jpg) via Wikimedia Commons). Earth textures are the public NASA-derived maps shipped with the three.js examples.
