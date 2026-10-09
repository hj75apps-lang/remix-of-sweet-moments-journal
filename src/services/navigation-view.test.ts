import { describe, expect, it } from "vitest";
import { isMapView, mapViewZoom, resolveMapPerspective } from "./navigation-view";

describe("navigation view", () => {
  it("keeps the chosen 2D view even during navigation", () => {
    expect(resolveMapPerspective("2d", true, 20)).toBe("2d");
  });
  it("keeps the chosen 3D view when stopped", () => {
    expect(resolveMapPerspective("3d", false, 0)).toBe("3d");
  });
  it("zooms closer in 3D than 2D", () => {
    expect(mapViewZoom("2d")).toBe(16);
    expect(mapViewZoom("3d")).toBe(18);
  });
  it("automatically uses perspective with active navigation", () => {
    expect(resolveMapPerspective("auto", true, null)).toBe("3d");
  });
  it("automatically uses 2D when stopped without navigation", () => {
    expect(resolveMapPerspective("auto", false, 0, "3d")).toBe("2d");
  });
  it("enters perspective when moving and avoids speed jitter", () => {
    expect(resolveMapPerspective("auto", false, 2)).toBe("3d");
    expect(resolveMapPerspective("auto", false, 1, "3d")).toBe("3d");
    expect(resolveMapPerspective("auto", false, 1, "2d")).toBe("2d");
  });
  it("does not infer movement from unavailable GPS speed", () => {
    expect(resolveMapPerspective("auto", false, null)).toBe("2d");
    expect(resolveMapPerspective("auto", false, NaN)).toBe("2d");
  });
  it("accepts only the three supported choices", () => {
    expect(["2d", "3d", "auto"].every(isMapView)).toBe(true);
    expect(isMapView("terrain")).toBe(false);
  });
});