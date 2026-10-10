import mapboxLogo from "@/assets/mapbox-logo.svg.asset.json";

export const MAP_STYLES = [
  { value: "roads", label: "Ruas e avenidas" },
  { value: "standard", label: "Tradicional" },
] as const;
export type NavigationMapStyle = (typeof MAP_STYLES)[number]["value"];
export function isNavigationMapStyle(value: unknown): value is NavigationMapStyle {
  return value === "roads" || value === "standard";
}
export const TRAFFIC_REFRESH_MS = 5 * 60 * 1000;
export function isTrafficTile(url: string): boolean {
  return /^https:\/\/api\.mapbox\.com\/styles\/v1\/mapbox\/traffic-(day|night)-v2\/tiles\//.test(url);
}
/** Road hierarchy is not measured traffic. */
export function navigationMapTiles(style: NavigationMapStyle, dark: boolean, publicToken: string = import.meta.env['VITE_LOVABLE_CONNECTOR_MAPBOX_PUBLIC_TOKEN'] ?? "") {
  const token = publicToken.trim();
  const mapbox = token.startsWith("pk.");
  // Provider-rendered congestion, not road hierarchy or invented traffic.
  const mapboxStyle = dark ? "traffic-night-v2" : "traffic-day-v2";
  return {
    url: mapbox ? `https://api.mapbox.com/styles/v1/mapbox/${mapboxStyle}/tiles/256/{z}/{x}/{y}?access_token=${encodeURIComponent(token)}` : "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: `${mapbox ? `<a href="https://www.mapbox.com/about/maps/" target="_blank" rel="noopener noreferrer"><img src="${mapboxLogo.url}" alt="Mapbox" width="88" height="23" class="inline-block align-middle" /></a> © <a href="https://www.mapbox.com/about/maps/" target="_blank" rel="noopener noreferrer">Mapbox</a> · ` : ''}© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>${mapbox ? ' · <a href="https://www.mapbox.com/map-feedback/" target="_blank" rel="noopener noreferrer">Improve this map</a>' : ''}`,
    emphasizeRoads: !mapbox && style === "roads",
    darkFilter: !mapbox && dark,
    maxZoom: mapbox ? 22 : 19,
    provider: mapbox ? "mapbox" : "openstreetmap",
    traffic: mapbox,
  };
}