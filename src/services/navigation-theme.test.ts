import { describe, expect, it } from "vitest";
import { navigationNightMode } from "./navigation-theme";
const time = (hour: number, minute = 0, second = 0) => new Date(2026, 9, 9, hour, minute, second);
describe("navigation local night schedule", () => {
  it("forces night at 18:00 despite light preference", () => {
    expect(navigationNightMode(false, time(18))).toBe(true);
  });
  it("forces night through midnight until 05:59:59", () => {
    expect(navigationNightMode(false, time(0))).toBe(true);
    expect(navigationNightMode(false, time(5, 59, 59))).toBe(true);
  });
  it("restores light preference at exactly 06:00", () => {
    expect(navigationNightMode(false, time(6))).toBe(false);
  });
  it("does not force night before 18:00 during the day", () => {
    expect(navigationNightMode(false, time(17, 59, 59))).toBe(false);
    expect(navigationNightMode(false, time(12))).toBe(false);
  });
  it("preserves dark preference during daytime", () => {
    expect(navigationNightMode(true, time(6))).toBe(true);
    expect(navigationNightMode(true, time(12))).toBe(true);
  });
});
