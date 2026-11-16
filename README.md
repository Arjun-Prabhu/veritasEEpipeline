# gAIa — Geospatial AI for Land-Change Analysis

**gAIa** is an AI-powered geospatial analysis platform designed to help users understand how Earth's surface changes over time. By combining natural-language processing, satellite imagery, machine-learning land classification, and AI-generated interpretation, gAIa turns geographic questions into visual, data-driven insights.

Ask a question about a location, explore its historical land-use patterns, and see how the landscape has evolved.

## Overview

gAIa is organized around three main experiences:

- **Home (`/`)** — An immersive landing page featuring a scroll-driven transition from satellite imagery to a 3D Earth.
- **Analyze (`/analyze`)** — The primary analysis workspace, where users submit geographic questions and explore year-by-year imagery, land-cover classifications, and AI-generated reports.
- **Explore (`/explore`)** — A collection of example case studies and saved readings.
- **LUNA (`/luna`)** — A dedicated AI assistant experience.

The application uses a modular architecture so the machine-learning imagery provider can be replaced without rewriting the frontend or the AI interpretation workflow.

## Features

### Natural-language geospatial queries

Users can ask questions in plain English, such as:

- "Show deforestation in the Amazon from 2018 to 2024."
- "How has urban development changed in New York City?"
- "Analyze changes in vegetation around this location."

The application uses Google's Gemini API to extract the relevant location, timeframe, and analysis focus from each query.

### Historical satellite imagery

The analysis pipeline retrieves or generates imagery for individual years in the requested timeframe. Each year can include:

- A satellite image.
- A land-cover classification mask.
- Land-cover percentage estimates.
- Geographic coordinates and metadata.

The analyzer presents these results through an interactive timeline and image overlays.

### Land-cover classification

The application organizes land-cover information into five reporting categories:

| Category | Description |
|---|---|
| Green space | Vegetated and other green areas |
| Urban | Urbanized land |
| Water | Water bodies |
| Crops | Agricultural land |
| Built | Built or developed surfaces |

Percentages describe the classified area represented in the returned image tile. They should be interpreted in the context of the model's classification method and geographic coverage.

### AI-generated interpretation

Gemini receives the user's question and the available imagery and land-cover information to generate a structured briefing. The intended analysis includes:

- **Observed changes** — Differences visible across the selected years.
- **Root causes** — Potential explanations for the observed patterns.
- **Future outlook** — A discussion of possible future trends.
- **Mitigation** — Potential actions to address negative environmental or urban changes.

AI-generated explanations are interpretations, not independently verified causal findings or guaranteed forecasts.

### Modular machine-learning integration

The imagery pipeline is isolated in `services/mlModelService.ts`. This adapter supports a simulated placeholder mode and an external machine-learning endpoint.

This separation allows the imagery model to be developed or replaced independently of the user interface and Gemini-powered analysis.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| Framework | Next.js 15, React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| AI | Google Gemini API, `@google/genai` |
| 3D graphics | Three.js, React Three Fiber, Drei |
| Animation | GSAP, Lenis |
| Image processing | Sharp |
| Geospatial tooling | Google Earth Engine dependency |
| Deployment | Compatible with Next.js hosting platforms |

## Architecture

The application uses the Next.js App Router. Frontend pages, reusable components, API routes, and supporting services are separated by responsibility.

```text
veritasEEpipeline/
│
├── app/
│   ├── api/
│   │   ├── ask/
│   │   ├── imagery/
│   │   ├── interpret/
│   │   ├── parse/
│   │   ├── satellite/
│   │   ├── status/
│   │   └── tile/
│   │
│   ├── analyze/
│   ├── explore/
│   ├── luna/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
│
├── components/
│   ├── analyze/
│   ├── explore/
│   ├── home/
│   ├── luna/
│   ├── EarthSpinner.tsx
│   ├── Nav.tsx
│   ├── RouteLoader.tsx
│   └── SmoothScroll.tsx
│
├── lib/
│   ├── cases.ts
│   ├── classify.ts
│   ├── continents.ts
│   ├── cover.ts
│   ├── earthImages.ts
│   ├── earthNode.ts
│   ├── gemini.ts
│   ├── geocode.ts
│   ├── landmarks.ts
│   ├── luna.ts
│   ├── narrative.ts
│   ├── places.ts
│   ├── query.ts
│   ├── storage.ts
│   └── transition.ts
│
├── services/
│   ├── mlModelService.ts
│   └── tileArt.ts
│
├── public/
├── types/
├── .env.example
├── next.config.ts
├── package.json
└── README.md
```

### Request workflow

The primary land-change analysis follows three stages:

**1. Parse the query**

`POST /api/parse` processes the natural-language prompt with Gemini and extracts structured information, including:

- `location`
- `start_year`
- `end_year`
- `focus_area`
- Geographic map center

When a timeframe is not supplied, the current parser defaults to 2021–2026.

**2. Retrieve imagery**

`POST /api/imagery` calls `fetchLandImagery()` from `services/mlModelService.ts`.

The adapter determines whether to use simulated imagery or an external machine-learning endpoint. The rest of the application consumes the same response structure regardless of provider.

**3. Interpret the results**

`POST /api/interpret` sends the original question, land-cover information, and selected imagery to Gemini. The response is used to create the analysis briefing.

Additional API routes support the LUNA assistant, satellite imagery, tile previews, and service status.

---

## Getting Started

### Requirements

- Node.js and npm
- A Google Gemini API key for live AI responses
- An external ML endpoint if you want to use your own imagery model
- Google Earth Engine credentials if you are developing or running functionality that requires authenticated Earth Engine access

### 1. Clone the repository

```bash
git clone -b prod https://github.com/vikram-saraswatula/veritasEEpipeline.git
cd veritasEEpipeline
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a local environment file:

```bash
cp .env.example .env.local
```

Configure the variables:

```env
# Google Gemini
GEMINI_API_KEY=your-gemini-api-key

# ML adapter
USE_MOCK_MODEL=true
ML_MODEL_ENDPOINT_URL=http://localhost:8000/predict

# Existing land-model service endpoints
ML_PREDICTION_IMAGE_URL=http://1.52.76.251:63480/predictionImage
ML_PREDICTION_DATA_URL=http://1.52.76.251:63480/predictionData

# Optional authentication for your ML endpoint
ML_MODEL_API_KEY=
```

Do not commit `.env.local` or expose API keys in source code.

### 4. Start the development server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

### 5. Build for production

```bash
npm run build
npm run start
```

---

## Integrating a Custom Machine-Learning Model

The primary integration point is:

```text
services/mlModelService.ts
```

The frontend does not need to know which model provider produced the imagery. It calls the adapter and receives a standardized response.

### 1. Model request format

The adapter sends a JSON request containing the location and analysis parameters:

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

Latitude and longitude are optional.

### 2. Model response format

The model should return a response following this structure:

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

### 3. Response requirements

The adapter validates the response before passing it to the frontend.

- `frames` must be a non-empty array.
- Every frame must contain a numeric `year`.
- Every frame must contain an `image_url` or `image_base64`.
- `land_cover` must include numeric values for `green_space`, `urban`, `water`, `crops`, and `built`.
- Land-cover percentages should approximately sum to 100.
- Classification masks are optional.
- Return one frame per requested year, ordered from oldest to newest.

### 4. Image delivery

The model can return images through URLs or Base64.

**Image URL (recommended for hosted imagery):**

```json
{
  "year": 2024,
  "image_url": "https://cdn.example.com/tile-2024.jpg",
  "mask_url": "https://cdn.example.com/tile-2024-mask.png"
}
```

**Base64:**

```json
{
  "year": 2024,
  "image_base64": "BASE64_IMAGE_DATA",
  "image_mime": "image/png",
  "mask_base64": "BASE64_MASK_DATA",
  "mask_mime": "image/png"
}
```

Base64 fields should contain raw Base64 data without a `data:` prefix. The MIME types default to JPEG for imagery and PNG for masks.

Classification masks should have the same dimensions and geographic extent as their corresponding satellite images so that the frontend overlays align correctly.

### 5. Switch from placeholder to live mode

In `.env.local`, change:

```env
USE_MOCK_MODEL=false
ML_MODEL_ENDPOINT_URL=http://localhost:8000/predict
ML_MODEL_API_KEY=your-optional-token
```

Restart the application.

When mock mode is disabled, the adapter:

1. Sends a POST request to `ML_MODEL_ENDPOINT_URL`.
2. Includes the JSON request body.
3. Adds a Bearer authorization header if `ML_MODEL_API_KEY` is configured.
4. Aborts requests after 45 seconds.
5. Validates the response before returning it to the frontend.

The application can then use the live model without requiring changes to the analyzer components or Gemini interpretation workflow.

---

## API Routes

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/parse` | POST | Convert a natural-language query into structured geographic parameters |
| `/api/imagery` | POST | Retrieve imagery and land-cover results through the ML adapter |
| `/api/interpret` | POST | Generate an AI interpretation of the analysis |
| `/api/ask` | POST | Handle assistant questions |
| `/api/satellite` | GET/POST | Satellite imagery functionality |
| `/api/tile` | GET | Tile preview functionality |
| `/api/status` | GET | Check application or model status |

Request and response details are defined in the corresponding route handlers under `app/api/`.

## Important Notes

- **Placeholder mode:** `USE_MOCK_MODEL=true` is the default. Imagery is simulated and should not be treated as measured satellite data.
- **Live model:** A real model endpoint must implement the documented request and response contract.
- **AI interpretation:** Gemini-generated explanations may contain uncertainty. Potential causes and future outcomes should be independently verified.
- **Credentials:** Keep API keys and service credentials in environment variables. Never expose them in client-side code or commit them to Git.
- **External services:** Availability and performance depend on Gemini, the configured imagery provider, and any external geospatial services.

## Credits

- **Google Gemini** — Natural-language query parsing and AI-generated interpretation.
- **Google Earth Engine** — Geospatial tooling and imagery-related capabilities.
- **Three.js / React Three Fiber** — 3D Earth visualization.
- **GSAP** — Scroll-driven animation.
- **Lenis** — Smooth scrolling.
- **NASA-derived Earth textures** — Earth visualization assets.
- **ESA** — Opening satellite imagery, credited in the original asset documentation.

---

**gAIa**
