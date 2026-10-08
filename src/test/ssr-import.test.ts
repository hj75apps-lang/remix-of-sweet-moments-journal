// @vitest-environment node
import { describe, expect, it } from "vitest";

describe("server route imports", () => {
  it("loads every route without evaluating browser-only Leaflet", async () => {
    expect(typeof window).toBe("undefined");
    const { routeTree } = await import("../routeTree.gen");
    expect(routeTree).toBeDefined();
  });
});
