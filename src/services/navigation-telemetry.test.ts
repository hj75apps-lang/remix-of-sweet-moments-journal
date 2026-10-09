import { describe, expect, it } from "vitest";
import { reconcileNavigationTelemetry } from "./navigation-telemetry";
import type { NavigationConnectTelemetry } from "./navigation-connect";

const reading = (): NavigationConnectTelemetry => ({ tripId: "trip", state: "ACTIVE", active: true, sourcePackage: "com.waze", route: {
  points: [{ latitude: -23, longitude: -46 }, { latitude: -23.01, longitude: -46.01 }], remainingDurationSeconds: 100,
} });

describe("navigation snapshot reconciliation", () => {
  it("reuses an identical native/network snapshot", () => {
    const previous = reading();
    expect(reconcileNavigationTelemetry(previous, reading())).toBe(previous);
  });
  it("updates metrics without rebuilding identical route points", () => {
    const previous = reading();
    const next = reading();
    if (!next.route) throw new Error("Missing fixture route");
    next.route.remainingDurationSeconds = 80;
    const result = reconcileNavigationTelemetry(previous, next);
    expect(result.route?.remainingDurationSeconds).toBe(80);
    expect(result.route?.points).toBe(previous.route?.points);
  });
  it("never reuses geometry or state after the route changes", () => {
    const previous = reading();
    const next = reading();
    if (!next.route) throw new Error("Missing fixture route");
    next.route.points = [{ latitude: 1, longitude: 2 }];
    expect(reconcileNavigationTelemetry(previous, next)).toBe(next);
    expect(reconcileNavigationTelemetry(previous, { ...reading(), active: false }).active).toBe(false);
  });
});