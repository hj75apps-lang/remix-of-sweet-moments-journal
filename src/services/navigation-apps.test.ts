import { describe, expect, it } from "vitest";
import { navigationId } from "./navigation-apps";
describe("navigation app identifiers", () => {
  it("preserves existing Google Maps and Waze preferences", () => {
    expect(navigationId("com.google.android.apps.maps")).toBe("maps");
    expect(navigationId("com.waze")).toBe("waze");
  });
  it("addresses other installed compatible apps explicitly", () => {
    expect(navigationId("com.here.app.maps")).toBe("package:com.here.app.maps");
  });
});