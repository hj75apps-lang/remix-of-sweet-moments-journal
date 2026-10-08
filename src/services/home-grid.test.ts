import { describe, expect, it } from "vitest";
import { homeGridRows } from "./home-grid";
describe("dense home grid", () => {
  it("counts fragmented rows rather than underestimating them by total area", () => {
    expect(homeGridRows([{ w: 4, h: 4 }, { w: 4, h: 4 }], 6)).toBe(8);
  });
  it("keeps the standard navigation and side widgets in four rows", () => {
    expect(homeGridRows([{ w: 4, h: 4 }, { w: 2, h: 1 }, { w: 2, h: 1 }, { w: 2, h: 2 }], 6)).toBe(4);
  });
  it("matches the mobile spans and fills earlier gaps with later tiles", () => {
    expect(homeGridRows([{ w: 4, h: 4 }, { w: 1, h: 2 }, { w: 1, h: 1 }, { w: 1, h: 1 }], 2)).toBe(4);
  });
});
