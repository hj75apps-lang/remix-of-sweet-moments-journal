import { describe, expect, it } from "vitest";
import { clampProgress, formatDistance, formatDuration } from "./navigation-state";

describe("navigation state formatting", () => {
  it("formats automotive distances", () => {
    expect(formatDistance(320)).toBe("320 m");
    expect(formatDistance(7400)).toBe("7,4 km");
  });

  it("formats remaining duration", () => {
    expect(formatDuration(12 * 60)).toBe("12 min");
    expect(formatDuration(75 * 60)).toBe("1 h 15 min");
  });

  it("clamps route progress", () => {
    expect(clampProgress(-0.5)).toBe(0);
    expect(clampProgress(0.5)).toBe(0.5);
    expect(clampProgress(2)).toBe(1);
  });
});
