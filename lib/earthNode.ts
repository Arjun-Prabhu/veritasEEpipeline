type EarthEngine = {
  data: {
    authenticateViaPrivateKey: (
      key: Record<string, string>,
      success: () => void,
      error: (err: unknown) => void,
    ) => void;
    setAuthToken: (
      clientId: string,
      tokenType: string,
      accessToken: string,
      expiresIn: number,
      extraScopes: string[],
      callback: () => void,
      updateAuthLibrary: boolean,
    ) => void;
  };
  initialize: (
    baseUrl: null,
    tileUrl: null,
    success: () => void,
    error: (err: unknown) => void,
    xsrf: null,
    project: string,
  ) => void;
  Geometry: { Point: (coords: number[]) => EarthObject };
  ImageCollection: new (id: string) => EarthCollection;
  Image: new (value: unknown) => EarthImage;
  Filter: { lt: (name: string, value: number) => unknown };
};

type EarthObject = {
  buffer: (meters: number) => { bounds: () => unknown };
};

type EarthCollection = {
  filterBounds: (geometry: unknown) => EarthCollection;
  filterDate: (start: string, end: string) => EarthCollection;
  filter: (filter: unknown) => EarthCollection;
  sort: (property: string) => EarthCollection;
  size: () => { getInfo: (cb: (value: number, error?: unknown) => void) => void };
  first: () => unknown;
};

type EarthImage = {
  select: (bands: string[]) => EarthImage;
  getThumbURL: (
    params: Record<string, unknown>,
    callback: (url: string, error?: string) => void,
  ) => void;
};

const PROJECT = "veritasaihackathon";
// Earth Engine CLI defaults, used when a credentials file stores only a refresh token.
const EARTH_ENGINE_CLIENT_ID = "517222506229-vsmmajv00ul0bs7p89v5m89qs8eb9359.apps.googleusercontent.com";
const EARTH_ENGINE_CLIENT_SECRET = "RUP0RZ6e0pPhDzsqIJ7KlNd1";
let ready: Promise<EarthEngine> | null = null;

function credentials() {
  const raw = process.env.EARTHENGINE_CREDENTIALS?.trim();
  if (!raw) return null;
  return JSON.parse(raw) as Record<string, string>;
}

export function earthEngineConfigured() {
  return Boolean(process.env.EARTHENGINE_CREDENTIALS?.trim());
}

async function client() {
  if (!ready) {
    ready = connect().catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}

async function connect() {
  const key = credentials();
  if (!key) throw new Error("EARTHENGINE_CREDENTIALS is not set.");
  const imported = (await import("@google/earthengine")) as { default?: EarthEngine } & EarthEngine;
  const ee = imported.default ?? imported;
  if (key.private_key) {
    await new Promise<void>((resolve, reject) => {
      ee.data.authenticateViaPrivateKey(key, resolve, reject);
    });
  } else if (key.refresh_token) {
    const body = new URLSearchParams({
      client_id: key.client_id || EARTH_ENGINE_CLIENT_ID,
      client_secret: key.client_secret || EARTH_ENGINE_CLIENT_SECRET,
      refresh_token: key.refresh_token,
      grant_type: "refresh_token",
    });
    const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body });
    const token = (await response.json()) as { access_token?: string; expires_in?: number; error_description?: string };
    if (!token.access_token) {
      throw new Error(token.error_description || "Earth Engine login failed.");
    }
    await new Promise<void>((resolve) => {
      ee.data.setAuthToken("", "Bearer", token.access_token!, token.expires_in || 3600, [], resolve, false);
    });
  } else {
    throw new Error("EARTHENGINE_CREDENTIALS needs a service account key or a refresh token.");
  }
  await new Promise<void>((resolve, reject) => {
    ee.initialize(null, null, resolve, reject, null, PROJECT);
  });
  return ee;
}

function info<T>(value: { getInfo: (cb: (result: T, error?: unknown) => void) => void }) {
  return new Promise<T>((resolve, reject) => {
    value.getInfo((result, error) => (error ? reject(error) : resolve(result)));
  });
}

async function scene(ee: EarthEngine, lat: number, lon: number, year: number) {
  const point = ee.Geometry.Point([lon, lat]);
  const region = point.buffer(2500).bounds();
  const collection = new ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
    .filterBounds(point)
    .filterDate(`${year}-01-01`, `${year + 1}-01-01`)
    .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 30))
    .sort("CLOUDY_PIXEL_PERCENTAGE");
  const count = await info<number>(collection.size());
  if (!count) return null;
  const image = new ee.Image(collection.first()).select(["B4", "B3", "B2"]);
  const url = await new Promise<string>((resolve, reject) => {
    image.getThumbURL(
      { region, dimensions: 500, min: 0, max: 3000, gamma: 1.3, format: "png" },
      (thumb, error) => (error || !thumb ? reject(new Error(error || `No scene for ${year}`)) : resolve(thumb)),
    );
  });
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Scene download for ${year} failed (${response.status}).`);
  const source = Buffer.from(await response.arrayBuffer());
  const sharp = (await import("sharp")).default;
  const smooth = await sharp(source).resize(1500, 1500, { kernel: "lanczos3" }).png().toBuffer();
  return `data:image/png;base64,${smooth.toString("base64")}`;
}

export async function pullSatelliteImagesInNode(lat: number, lon: number, years: number[]) {
  const ee = await client();
  const photos: Record<number, string> = {};
  const results = await Promise.allSettled(
    years.map(async (year) => {
      console.log("Earth Engine year", year);
      return [year, await scene(ee, lat, lon, year)] as const;
    }),
  );
  for (const result of results) {
    if (result.status === "rejected") {
      console.error(result.reason instanceof Error ? result.reason.message : result.reason);
      continue;
    }
    const [year, image] = result.value;
    if (image) photos[year] = image;
  }
  if (!Object.keys(photos).length) {
    throw new Error("No clear satellite scenes came back for those years.");
  }
  return photos;
}
