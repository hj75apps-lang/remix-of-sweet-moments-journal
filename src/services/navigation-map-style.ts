export const MAP_STYLES = [
  { value: "roads", label: "Ruas e avenidas" },
  { value: "standard", label: "Tradicional" },
] as const;
export type NavigationMapStyle = (typeof MAP_STYLES)[number]["value"];
export function isNavigationMapStyle(value: unknown): value is NavigationMapStyle {
  return value === "roads" || value === "standard";
}
/** Road hierarchy is not measured traffic. */
export function navigationMapTiles(style: NavigationMapStyle, dark: boolean) {
  return {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
    emphasizeRoads: style === "roads",
    darkFilter: dark,
    maxZoom: 19,
  };
}