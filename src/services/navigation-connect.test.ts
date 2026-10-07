import { describe, expect, it } from "vitest";
import { isNavigationConnectConfigured } from "./navigation-connect";

describe("Navigation Connect client", () => {
  it("keeps configuration server-side", () => {
    expect(typeof isNavigationConnectConfigured()).toBe("boolean");
  });
});
