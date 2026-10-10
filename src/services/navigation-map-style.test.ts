import { describe, expect, it } from "vitest";
import { isNavigationMapStyle, navigationMapTiles } from "./navigation-map-style";
describe("road cartography", () => {
  it("uses road cartography, not fictional traffic", () => {
    expect(navigationMapTiles("roads", false, "").emphasizeRoads).toBe(true);
    expect(navigationMapTiles("standard", false, "").emphasizeRoads).toBe(false);
    expect(isNavigationMapStyle("traffic")).toBe(false);
  });
  it("preserves the traditional map", () => {
    expect(navigationMapTiles("standard", false, "").url).toBe("https://tile.openstreetmap.org/{z}/{x}/{y}.png");
  });
  it("respects night appearance", () => {
    expect(navigationMapTiles("roads", true, "").darkFilter).toBe(true);
    expect(navigationMapTiles("roads", false, "").darkFilter).toBe(false);
  });
  it("uses public Mapbox tokens with native day/night road styles and credits", () => {
    const day = navigationMapTiles("roads", false, "pk.test");
    expect(day.url).toContain("navigation-day-v1/tiles/256/{z}/{x}/{y}?access_token=pk.test");
    expect(day.attribution).toContain("Mapbox");
    expect(day.attribution).toContain("OpenStreetMap");
    expect(day.attribution).toContain("Improve this map");
    expect(day.darkFilter).toBe(false);
    expect(navigationMapTiles("roads", true, "pk.test").url).toContain("navigation-night-v1");
    expect(navigationMapTiles("standard", false, "pk.test").url).toContain("streets-v12");
  });
  it("never uses a secret token in browser tiles", () => {
    expect(navigationMapTiles("roads", false, "sk.test").provider).toBe("openstreetmap");
  });
});