import { describe, expect, it } from "vitest";
import { buildNavigationUrl } from "./navigation-deep-link-manager";

describe("buildNavigationUrl", () => {
  it("builds an official Google Maps driving navigation URL", () => {
    const url = buildNavigationUrl({ app: "maps", destination: "Av. Paulista, São Paulo" });
    expect(url).toContain("https://www.google.com/maps/dir/?api=1");
    expect(url).toContain("travelmode=driving");
    expect(url).toContain("dir_action=navigate");
    expect(url).toContain(encodeURIComponent("Av. Paulista, São Paulo"));
  });

  it("builds a Waze deep link", () => {
    const url = buildNavigationUrl({ app: "waze", destination: "Praça da Sé, São Paulo" });
    expect(url).toBe("https://waze.com/ul?q=Pra%C3%A7a%20da%20S%C3%A9%2C%20S%C3%A3o%20Paulo&navigate=yes");
  });

  it("prefers coordinates when supplied", () => {
    const url = buildNavigationUrl({
      app: "maps",
      destination: "ignored",
      latitude: -23.55052,
      longitude: -46.63331,
    });
    expect(url).toContain(encodeURIComponent("-23.55052,-46.63331"));
  });
});
