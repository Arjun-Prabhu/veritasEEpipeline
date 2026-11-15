export type NamedPlace = {
  location: string;
  region: string;
  country: string;
};

export async function reversePlace(lat: number, lon: number): Promise<NamedPlace | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&localityLanguage=en`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    const body = (await response.json()) as {
      city?: string;
      locality?: string;
      principalSubdivision?: string;
      countryName?: string;
    };
    const location = (body.city || body.locality || "").trim();
    if (!location) return null;
    return {
      location,
      region: (body.principalSubdivision || "").trim(),
      country: (body.countryName || "").trim(),
    };
  } catch (error) {
    console.error("Reverse geocode failed", error);
    return null;
  }
}
