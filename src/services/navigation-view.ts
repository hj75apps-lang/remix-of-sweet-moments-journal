export const MAP_VIEWS = [
  { value: "2d", label: "2D" },
  { value: "3d", label: "3D" },
  { value: "auto", label: "Automático" },
] as const;
export type MapView = (typeof MAP_VIEWS)[number]["value"];
export type MapPerspective = "2d" | "3d";
export function isMapView(value: unknown): value is MapView {
  return value === "2d" || value === "3d" || value === "auto";
}
/** Real guidance or movement enables perspective; hysteresis avoids speed jitter. */
export function resolveMapPerspective(mode: MapView, navigating: boolean, speed: number | null, previous: MapPerspective = "2d"): MapPerspective {
  if (mode !== "auto") return mode;
  if (navigating) return "3d";
  if (speed === null || !Number.isFinite(speed) || speed < 0) return "2d";
  return speed >= (previous === "3d" ? 0.8 : 2) ? "3d" : "2d";
}
export function mapViewZoom(perspective: MapPerspective): number {
  return perspective === "3d" ? 18 : 16;
}
