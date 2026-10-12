import { describe, expect, it } from "vitest";
import { isNavigationMapStyle, isTrafficTile, navigationMapTiles } from "./navigation-map-style";
describe("road cartography", () => {
  it("uses road cartography, not fictional traffic", () => {
    expect(navigationMapTiles("roads", false).emphasizeRoads).toBe(true);
    expect(navigationMapTiles("standard", false).emphasizeRoads).toBe(false);
    expect(isNavigationMapStyle("traffic")).toBe(false);
  });
  it("preserves the traditional map", () => {
    expect(navigationMapTiles("standard", false).url).toBe("https://tile.openstreetmap.org/{z}/{x}/{y}.png");
  });
  it("respects night appearance", () => {
    expect(navigationMapTiles("roads", true).darkFilter).toBe(true);
    expect(navigationMapTiles("roads", false).darkFilter).toBe(false);
  });
  it("uses only OpenStreetMap in all styles without live traffic or tokens", () => {
    for (const style of ["roads", "standard"] as const) {
      for (const dark of [true, false]) {
        const tiles = navigationMapTiles(style, dark);
        expect(tiles.url).toBe("https://tile.openstreetmap.org/{z}/{x}/{y}.png");
        expect(tiles.provider).toBe("openstreetmap");
        expect(tiles.traffic).toBe(false);
        expect(isTrafficTile(tiles.url)).toBe(false);
        expect(tiles.attribution).toContain("OpenStreetMap");
        expect(tiles.attribution).not.toContain("Mapbox");
        expect(tiles.url).not.toContain("access_token");
        expect(tiles.maxZoom).toBe(19);
      }
    }
  });
});
