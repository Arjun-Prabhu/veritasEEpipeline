# Veritas EE Pipeline — Earth Intelligence

**An AI-powered geospatial analysis platform that makes historical satellite imagery and land-cover changes accessible through natural language.**

Earth Intelligence allows users to explore how locations around the world have changed over time using real satellite imagery and geospatial datasets.

By combining Google Earth Engine, Sentinel-2 imagery, Google Dynamic World, and Google's Gemini API, the platform transforms satellite data into an interactive experience where users can ask questions about geographical locations and visualize historical environmental changes.

## Overview

Earth Intelligence is built around three primary components:

1. **Satellite Imagery Retrieval** — Acquires historical satellite imagery from Google Earth Engine using geographic coordinates and user-specified years.
2. **Geospatial Analysis** — Generates land-cover classifications and calculates the distribution of different land-cover types within a selected region.
3. **AI-Powered Interpretation** — Uses Gemini function calling to interpret user requests, retrieve relevant satellite data, and explain observed geographical changes.

The platform combines these components into a conversational interface, allowing users to investigate locations without manually navigating satellite imagery datasets.

## Features

### 1. Conversational Geospatial Analysis

The application integrates Google's Gemini API to interpret natural-language questions.

Users can ask questions such as:

- How has Mumbai changed between 2016 and 2025?
- Compare the land-cover distribution of Dubai in 2017 and 2024.
- Show me Las Vegas in 2018 and 2025.
- How has the built-up area of a particular location changed over time?

Gemini determines when historical imagery is needed and invokes the appropriate backend function to retrieve the requested data.

The application uses function calling to connect natural-language requests with actual Google Earth Engine operations.

### 2. Historical Satellite Imagery

The platform retrieves imagery from the following Google Earth Engine datasets:

| Dataset | Purpose |
|---|---|
| Sentinel-2 Harmonized | Historical multispectral satellite imagery |
| Google Dynamic World V1 | Pixel-level land-cover classification |

For each requested year, the application generates a cloud-masked Sentinel-2 median composite using the red, green, and blue bands.

The resulting imagery provides a visual representation of the selected geographical region.

**Satellite imagery configuration:**

| Parameter | Configuration |
|---|---|
| Satellite | Sentinel-2 |
| Earth Engine collection | `COPERNICUS/S2_HARMONIZED` |
| Imagery bands | B4, B3, B2 |
| Temporal aggregation | Yearly median |
| Cloud filtering | QA60 cloud and cirrus masking |
| Cloud coverage filter | Below 40% |
| Output dimensions | 768 pixels |
| Supported historical years | 2016–present |

The first full supported year is 2016. The current year contains partial-year observations.

### 3. Land-Cover Classification

Earth Intelligence uses Google Dynamic World V1 to generate land-cover maps for each requested year.

Dynamic World provides nine land-cover categories:

| Class ID | Classification |
|---:|---|
| 0 | Water |
| 1 | Trees |
| 2 | Grass |
| 3 | Flooded Vegetation |
| 4 | Crops |
| 5 | Shrub and Scrub |
| 6 | Built-up |
| 7 | Bare Ground |
| 8 | Snow and Ice |

For each year, the application calculates the per-pixel mode of the available Dynamic World classifications.

This produces a representative annual land-cover map.

### 4. Geospatial Statistics

Beyond visualizing satellite imagery, the platform calculates quantitative land-cover statistics.

For each requested year, the backend:

1. Generates an annual land-cover classification.
2. Calculates pixel-area values using Google Earth Engine.
3. Groups area measurements by land-cover class.
4. Converts measurements into square kilometers.
5. Calculates the percentage distribution of each class.

The resulting statistics include:

- Land-cover area in km².
- Percentage of the selected region occupied by each class.
- Total analyzed area.
- Changes in land-cover percentages between requested years.

Statistics are calculated using a 30-meter sampling scale to reduce computational overhead.

### 5. Interactive Visualization

The React frontend displays the results of each analysis.

For every requested year, users can view:

- Sentinel-2 satellite imagery.
- Dynamic World land-cover maps.
- Color-coded land-cover distribution bars.
- Land-cover area measurements.
- Percentage distributions by classification.

Multiple years are displayed side by side, allowing users to compare geographical changes visually and quantitatively.

## Technical Architecture

The application uses a full-stack architecture consisting of a React frontend, FastAPI backend, Gemini integration, and Google Earth Engine data retrieval.

```text
                  USER
                    |
                    v
          React + TypeScript
              (Vite)
                    |
                    v
             FastAPI Backend
                    |
          +---------+---------+
          |                   |
          v                   v
      Gemini API         Google Earth
      Function Calling      Engine
          |                   |
          |             +-----+------+
          |             |            |
          |             v            v
          |         Sentinel-2   Dynamic World
          |             |            |
          |             +-----+------+
          |                   |
          |                   v
          |           Geospatial Statistics
          |                   |
          +---------+---------+
                    |
                    v
             Structured Results
                    |
                    v
             React Frontend
                    |
                    v
          Imagery + Maps + Statistics
```

### Technology Stack

| Component | Technology |
|---|---|
| Frontend | React 18 |
| Programming Language | TypeScript |
| Frontend Build Tool | Vite |
| Backend | Python |
| API Framework | FastAPI |
| AI Integration | Google Gemini API |
| Satellite Imagery | Google Earth Engine |
| Satellite Dataset | Sentinel-2 Harmonized |
| Land-Cover Dataset | Google Dynamic World |
| Geocoding | OpenStreetMap Nominatim |
| Data Validation | Pydantic |
| Deployment | Vercel |

## Repository Structure

```text
veritasEEpipeline/
│
├── earth-intelligence/
│   │
│   ├── api/
│   │   └── index.py
│   │
│   ├── backend/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── ee_client.py
│   │   ├── gemini_chat.py
│   │   ├── geocode.py
│   │   └── imagery.py
│   │
│   ├── frontend/
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   │
│   │   └── src/
│   │       ├── App.tsx
│   │       ├── Results.tsx
│   │       ├── api.ts
│   │       ├── types.ts
│   │       └── styles.css
│   │
│   ├── requirements.txt
│   ├── README.md
│   └── vercel.json
│
├── PoIFormat.py
├── consts.py
├── helpers.py
├── installationImint.py
├── poiIdentify.py
├── poiAnalyze.py
├── newPoIAnalyze.py
├── integration.py
├── test.py
└── ...
```

The `earth-intelligence/` directory contains the primary web application. The other Python files in the repository represent additional experimental geospatial and research components.

## Installation and Setup

### Prerequisites

- Python 3.12 recommended
- Node.js and npm
- Google Cloud project with Earth Engine access
- Google Earth Engine registration
- Gemini API key

### 1. Clone the Repository

```bash
git clone -b main https://github.com/vikram-saraswatula/veritasEEpipeline.git

cd veritasEEpipeline/earth-intelligence
```

### 2. Configure the Python Environment

Create a virtual environment:

```bash
python3.12 -m venv .venv

source .venv/bin/activate
```

Install the backend dependencies:

```bash
pip install -r requirements.txt
```

### 3. Configure Google Earth Engine

Earth Intelligence uses Google Earth Engine to retrieve satellite imagery and land-cover classifications.

To configure Earth Engine:

1. Create or select a Google Cloud project.
2. Enable the Earth Engine API.
3. Register the project with Google Earth Engine.
4. Configure authentication.

For local development, authenticate using:

```bash
earthengine authenticate
```

Set the Earth Engine project identifier in your environment configuration.

### 4. Configure Gemini

Obtain a Gemini API key through Google AI Studio.

Create a `.env` file inside `earth-intelligence/`:

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash

EARTHENGINE_PROJECT=your_google_cloud_project
```

For local Earth Engine authentication, service-account credentials are not required.

For server-side deployment, configure the additional service-account variables described below.

### 5. Start the Backend

From the `earth-intelligence/` directory:

```bash
uvicorn api.index:app --reload --port 8000
```

The FastAPI backend will be available at:

```text
http://localhost:8000
```

API health endpoint:

```text
http://localhost:8000/api/health
```

### 6. Start the Frontend

Open another terminal:

```bash
cd earth-intelligence/frontend
```

Install frontend dependencies:

```bash
npm install
```

Start the Vite development server:

```bash
npm run dev
```

The frontend will be available at:

```text
http://localhost:5173
```

The Vite development configuration automatically proxies `/api` requests to the local FastAPI server on port 8000.

## API Endpoints

The FastAPI backend exposes three primary endpoints.

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/health` | GET | Check backend and credential configuration |
| `/api/chat` | POST | Process conversational geospatial requests |
| `/api/imagery` | POST | Retrieve historical satellite imagery directly |

### Health Check

```http
GET /api/health
```

Returns information about backend availability and whether required credentials are configured.

### Conversational Analysis

```http
POST /api/chat
```

Example request:

```json
{
  "messages": [
    {
      "role": "user",
      "content": "Show me Mumbai in 2016, 2020, and 2025."
    }
  ]
}
```

The backend sends the conversation to Gemini, handles any required function calls, and returns a response alongside retrieved imagery results.

### Direct Imagery Retrieval

```http
POST /api/imagery
```

Example request:

```json
{
  "place": "Mumbai, India",
  "years": [2016, 2020, 2025],
  "radius_km": 15
}
```

The response includes:

- Resolved location name and coordinates.
- Satellite imagery URLs.
- Land-cover map URLs.
- Land-cover area statistics.
- Individual yearly results and retrieval errors.

## Configuration and Constraints

The following parameters are defined in `backend/imagery.py`:

| Parameter | Default |
|---|---:|
| Minimum supported year | 2016 |
| Maximum years per request | 6 |
| Default region half-width | 15 km |
| Minimum region half-width | 1 km |
| Maximum region half-width | 40 km |
| Image thumbnail dimension | 768 pixels |
| Land-cover statistics scale | 30 meters |

The analyzed region is a square centered on the geocoded location.

The backend retrieves requested years concurrently and preserves successful results even if an individual year fails.

## Deployment

The application is configured for deployment through Vercel.

The `vercel.json` configuration:

- Builds the React frontend using Vite.
- Serves the generated frontend from `frontend/dist`.
- Routes API requests to the Python FastAPI entrypoint.
- Includes backend files in the serverless function.
- Sets the API execution limit to 60 seconds.

### Environment Variables

Configure the following variables in Vercel:

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Gemini API key |
| `GEMINI_MODEL` | Gemini model identifier |
| `EARTHENGINE_PROJECT` | Google Cloud project ID |
| `EARTHENGINE_SERVICE_ACCOUNT` | Earth Engine service-account email |
| `EARTHENGINE_PRIVATE_KEY` | Service-account private key or full JSON key contents |

The service account must have the appropriate Google Earth Engine permissions.

Credentials should remain server-side and must never be exposed in frontend code or committed to the repository.

## Current Limitations

Earth Intelligence currently focuses on historical observation rather than predictive modeling.

Important limitations include:

- **No forecasting:** The platform does not currently predict future geographical conditions.
- **Historical coverage:** Dynamic World analysis begins with 2016, the first full supported year.
- **Sampling resolution:** Land-cover statistics use a 30-meter sampling scale, while the source datasets provide finer native spatial resolution.
- **Regional coverage:** Statistics are calculated within a square region around the selected location.
- **Imagery availability:** Cloud coverage, satellite acquisition frequency, and missing observations can affect individual years.
- **Temporary imagery URLs:** Earth Engine thumbnail URLs expire, so previously generated imagery may eventually need to be retrieved again.

## Future Development

Potential directions for expanding Earth Intelligence include:

- Training and integrating predictive models for land-cover change.
- Incorporating additional satellite datasets and spectral bands.
- Improving temporal consistency between annual composites.
- Adding more advanced geospatial statistics.
- Supporting larger and customizable geographic regions.
- Persisting generated imagery for long-term access.
- Improving uncertainty quantification and model validation.
- Expanding environmental monitoring and climate-related analysis.

## Acknowledgements

This project builds upon publicly available geospatial datasets and open-source technologies:

- [Google Earth Engine](https://earthengine.google.com/)
- [Sentinel-2 / Copernicus](https://dataspace.copernicus.eu/)
- [Google Dynamic World](https://dynamicworld.app/)
- [Google Gemini](https://ai.google.dev/)
- [Apple MLX](https://github.com/ml-explore/mlx)
- [OpenStreetMap](https://www.openstreetmap.org/)
- [React](https://react.dev/)
- [FastAPI](https://fastapi.tiangolo.com/)

---

**Repository:** [vikram-saraswatula/veritasEEpipeline](https://github.com/vikram-saraswatula/veritasEEpipeline)

**Branch:** `main`

**Application:** Earth Intelligence
