import { describe, expect, it } from "vitest";
import { normalizeGuidance, type NavGuidance } from "./navigation-guidance";

const guidance: NavGuidance = {
  packageName: "com.waze",
  title: "Vire à direita",
  text: "Av. Brasil",
  subText: "300 m · 12 min",
  icon: "",
};

describe("normalizeGuidance", () => {
  it("extracts distance and duration when structured telemetry is unavailable", () => {
    const normalized = normalizeGuidance(guidance);
    expect(normalized?.remainingDistanceMeters).toBe(300);
    expect(normalized?.remainingDurationSeconds).toBe(12 * 60);
  });

  it("keeps authoritative structured telemetry", () => {
    const normalized = normalizeGuidance({
      ...guidance,
      remainingDistanceMeters: 12800,
      remainingDurationSeconds: 45 * 60,
    });
    expect(normalized?.remainingDistanceMeters).toBe(12800);
    expect(normalized?.remainingDurationSeconds).toBe(45 * 60);
  });
});
