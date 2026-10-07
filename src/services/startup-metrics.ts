const startedAt = typeof performance !== "undefined" ? performance.now() : 0;

export function markHomeVisible(): number | null {
  if (typeof performance === "undefined") return null;
  const elapsed = Math.round(performance.now() - startedAt);
  performance.mark("smart-auto-launcher:home-visible");
  return elapsed;
}
