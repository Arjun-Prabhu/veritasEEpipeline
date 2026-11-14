export function formatCoord(lat: number, lon: number) {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}°${ns}  ${Math.abs(lon).toFixed(2)}°${ew}`;
}

export function frameSrc(
  frame: { image_url?: string; image_base64?: string; image_mime?: string; mask_url?: string; mask_base64?: string; mask_mime?: string },
  kind: "photo" | "mask",
) {
  if (kind === "mask") {
    if (frame.mask_base64) return `data:${frame.mask_mime || "image/png"};base64,${frame.mask_base64}`;
    return frame.mask_url ?? null;
  }
  if (frame.image_base64) return `data:${frame.image_mime || "image/jpeg"};base64,${frame.image_base64}`;
  return frame.image_url ?? null;
}

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}
