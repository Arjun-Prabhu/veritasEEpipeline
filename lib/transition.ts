export function startPageTransition() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("gaia-transition"));
}
