Role: You are an expert Full-Stack Web Developer and Creative Frontend Engineer. Build a complete, multi-page web application for geospatial land-change analysis.

Tech Stack: Use a clean, modern stack with proper client-side routing (e.g., Next.js App Router / Pages Router or React with React Router for the frontend, and Node.js/Express or Next.js API routes for the backend). Style it with Tailwind CSS. For animations, 3D rendering, and scroll mechanics on the Home page, use **Lenis** (`lenis` by darkroomengineering) for smooth inertia scrolling paired with **Three.js / React Three Fiber** (or `globe.gl`) and **GSAP ScrollTrigger** (or Framer Motion `useScroll`).

### Application Architecture & Multi-Page Structure

Structure the application cleanly across distinct pages/routes so the landing experience stays cinematic and fast, while the core AI tool has a dedicated, distraction-free workspace:

1. **Page 1: Landing / Home Page (`/`) — Exclusive Home to the Scroll Animation**
   * **Important:** Restrict the Lenis smooth-scroll choreography and the satellite-to-3D-Earth zoom-out animation strictly to this Home Page (`/`).
   * **Smooth Scrolling Foundation (Lenis):** Initialize **Lenis** (`lenis`) specifically for the Home Page scroll experience, syncing its `requestAnimationFrame` loop with your scroll-animation driver (GSAP `ScrollTrigger` or Framer Motion). Cleanly destroy/unmount the pinned scroll triggers on route change so other pages scroll normally.
   * **Seamless Satellite "Pixel" to 3D Earth Zoom-Out Sequence:**
     * **Initial State (0% Scroll):** Full-bleed viewport (`100vh`) filled edge-to-edge with a high-resolution satellite imagery patch (representing a close-up "pixel"/tile of Earth's surface—such as a river winding through lush terrain and agricultural patches, matching a top-left satellite tile). Overlay bold hero typography (e.g., *"Every pixel tells a story. Watch Earth evolve."*).
     * **Mid-Scroll Transition (10% – 75% Scroll):** Inside a tall pinned/sticky scroll container (`300vh`–`400vh`), as the user scrolls smoothly down with Lenis, the close-up satellite imagery tile scales down, curves, and blends seamlessly into the surface coordinates of an interactive, high-resolution **3D rendering of the Earth** (styled like Google Earth with realistic continents, oceans, cloud layer, atmospheric glow, and subtle auto-rotation). Pair this with progressive floating callout text blocks that fade in and out at key scroll milestones (e.g., *"From single satellite tiles..."* $\rightarrow$ *"...to planetary-scale intelligence."*).
     * **Final Hero State & CTA (75% – 100% Scroll):** The camera settles into a wide orbital view of the rotating 3D Earth globe alongside a clear Call-to-Action section (e.g., *"Start Analyzing Land Change"* button) that routes the user to `/analyze`.

2. **Page 2: Core Land-Change Analyzer Workspace (`/analyze`)**
   * A dedicated, full-screen productivity interface (no heavy scroll-jacking here—standard responsive layout) where users run geospatial queries, inspect year-by-year satellite imagery, compare land-classification masks, and read AI insights.

3. **Page 3 (Optional/Recommended): Saved Analyses / Case Studies (`/explore` or `/history`)**
   * A clean gallery or history view displaying pre-loaded example case studies (e.g., *Amazon Deforestation 2018–2024*, *NYC Urban Expansion 2021–2026*) and locally saved user reports so visitors can explore sample outputs in one click without needing to type a prompt first.

4. **Shared Navigation Bar:**
   * Include a persistent, minimalist Apple-style floating top navigation bar across all pages with links to **Home (`/`)**, **Analyzer (`/analyze`)**, and **Explore (`/explore`)**, plus a subtle status badge indicating whether the app is running in *"Placeholder ML Mode"* or connected to the live ML endpoint.

---

### Core Geospatial AI Application Workflow (Powering `/analyze`)

1. **User Input:** On the `/analyze` page, the user enters a natural language query (e.g., *"Give me how the land in New York City has changed over time"* or *"Show deforestation in the Amazon from 2018 to 2024"*), or clicks a preset prompt chip.

2. **LLM Query Parsing (Step 1):** Send the user's raw prompt to the **Google Gemini API** (`gemini-2.5-flash` using the `@google/genai` SDK) with Structured Outputs (JSON mode). The LLM must extract:
   * `location` (string, e.g., "New York City")
   * `start_year` (integer)
   * `end_year` (integer)
   * `focus_area` (string, e.g., "urban development", "deforestation", "general land use")
   * *Rule:* If the user does not specify a timeframe in their prompt, default to the last 5 years (`2021` to `2026`).

3. **Machine Learning Model Placeholder & Plug-and-Play Architecture (Step 2):** Pass the extracted JSON (`location`, `start_year`, `end_year`, `focus_area`) to an isolated backend service module (e.g., `services/mlModelService.js` or `.ts`) exporting a single unified function: `fetchLandImagery(params)`.
   * **CRITICAL (Plug-and-Play Design):** My custom ML model is currently in development, so you MUST design this service using an Adapter/Strategy pattern controlled by environment variables (`USE_MOCK_MODEL=true` and `ML_MODEL_ENDPOINT_URL`).
   * **Mock Implementation (`USE_MOCK_MODEL=true`):** Simulate a 2-second processing delay and return realistic mock data matching the exact contract schema: an array of year-by-year image URLs (or base64 strings) along with simulated land-cover metadata (e.g., `% green space`, `% urban area`, `% water`, `% crops`, `% built`) for each year in the range, plus optional segmented land-classification mask overlays.
   * **Real Model Placeholder (`USE_MOCK_MODEL=false`):** Write the actual `fetch`/`axios` HTTP client boilerplate ready to call `process.env.ML_MODEL_ENDPOINT_URL` (supporting `POST` requests with JSON payloads and optional `ML_MODEL_API_KEY` bearer authentication), complete with timeout handling, error catching, and response validation.
   * **Strict Data Contract:** Define clear TypeScript interfaces or JSDoc schemas (`MLModelRequest` and `MLModelResponse`) directly in the service file so I know the exact JSON structure my finished ML model needs to accept and return.

4. **LLM Visual & Trend Analysis (Step 3):** Send the images (or image URLs/base64 data) and metadata returned from `fetchLandImagery`—along with the user's original prompt—back to the **Google Gemini API** (`gemini-2.5-flash`, utilizing its multimodal vision capabilities). Prompt Gemini to return a structured analysis covering:
   * **Observed Changes:** What visibly changed between the start year and end year.
   * **Root Causes:** Why these changes likely happened in that specific region.
   * **Future Predictions:** What further changes are likely over the next 5 years if trends continue.
   * **Actionable Mitigation / Prevention:** If the change is environmentally or urbanistically negative (e.g., urban heat islands, deforestation, coastal erosion), provide concrete steps to fix or prevent further damage.

5. **Analyzer Workspace UI (`/analyze`):**
   * Clean search bar with example prompt chips users can click to test immediately.
   * An interactive timeline or before/after image comparison slider showing the raw satellite images and toggleable land-classification overlays returned for each year, paired with a compact mini-globe or map pin showing the queried coordinates.
   * Structured cards displaying the LLM's **Observed Changes**, **Root Causes**, **Future Predictions**, and **Actionable Mitigation** steps, plus a breakdown chart/metrics bar of the land-cover percentages.

---

### Deliverables

* Provide the complete file structure and full, copy-pasteable code for the multi-page frontend (`/`, `/analyze`, `/explore`) and backend API routes/services.
* Include a `.env.example` file with `GEMINI_API_KEY`, `USE_MOCK_MODEL=true`, `ML_MODEL_ENDPOINT_URL=http://localhost:8000/predict`, and `ML_MODEL_API_KEY=`.
* Include a dedicated **"How to Integrate Your Finished ML Model"** section in the README explaining:
  1. The exact JSON input/output contract your ML model API must follow.
  2. How to handle both image URLs and Base64-encoded images from the model.
  3. The exact `.env` flip required to switch from mock mode to production without changing frontend or LLM code.