import { describe, expect, it } from "vitest";
import { isNavigationMapStyle, isTrafficTile, navigationMapTiles } from "./navigation-map-style";
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
  it("uses genuine Mapbox traffic in both day/night styles with public tokens and credits", () => {
    const day = navigationMapTiles("roads", false, "pk.test");
    expect(day.url).toContain("traffic-day-v2/tiles/256/{z}/{x}/{y}?access_token=pk.test");
    expect(day.traffic).toBe(true);
    expect(isTrafficTile(day.url)).toBe(true);
    expect(isTrafficTile("https://tile.openstreetmap.org/1/2/3.png")).toBe(false);
    expect(day.attribution).toContain("Mapbox");
    expect(day.attribution).toContain("OpenStreetMap");
    expect(day.attribution).toContain("Improve this map");
    expect(day.darkFilter).toBe(false);
    expect(navigationMapTiles("roads", true, "pk.test").url).toContain("traffic-night-v2");
    expect(navigationMapTiles("standard", true, "pk.test").url).toContain("traffic-night-v2");
    expect(navigationMapTiles("standard", false, "pk.test").url).toContain("traffic-day-v2");
  });
  it("never uses a secret token in browser tiles", () => {
    expect(navigationMapTiles("roads", false, "sk.test").provider).toBe("openstreetmap");
    expect(navigationMapTiles("roads", false, "").traffic).toBe(false);
  });
});