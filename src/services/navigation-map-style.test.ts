import { describe, expect, it } from "vitest";
import { isNavigationMapStyle, navigationMapTiles } from "./navigation-map-style";
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
});