import { afterEach, describe, expect, it, vi } from "vitest";
import { clearNavigationConnectTrip, isNavigationConnectConfigured, readNavigationConnectTrip, rememberNavigationConnectTrip, onNavigationConnectTripChanged } from "./navigation-connect";

afterEach(() => { vi.restoreAllMocks(); clearNavigationConnectTrip(); sessionStorage.clear(); });

describe("Navigation Connect client", () => {
  it("keeps configuration server-side", () => {
    expect(typeof isNavigationConnectConfigured()).toBe("boolean");
  });
  it("never saves Google's auth token, including when a wider trip object is passed", () => {
    const trip = { tripId: "test-trip", app: "maps" as const, expiresAt: new Date(Date.now() + 60000).toISOString(), accessKey: "signed-key", authToken: "must-not-be-saved", launchUrl: "https://www.google.com/maps/" };
    const changed = vi.fn();
    const stop = onNavigationConnectTripChanged(changed);
    rememberNavigationConnectTrip(trip);
    expect(readNavigationConnectTrip()).toEqual({ tripId: trip.tripId, app: trip.app, expiresAt: trip.expiresAt, accessKey: trip.accessKey });
    expect(sessionStorage.getItem("smart-auto-launcher:navigation-connect-trip:v2")).not.toContain(trip.authToken);
    expect(changed).toHaveBeenCalledOnce();
    clearNavigationConnectTrip();
    expect(changed).toHaveBeenCalledTimes(2);
    stop();
  });
  it("rejects malformed or expired saved capabilities", () => {
    for (const expiresAt of ["bad", "", new Date(Date.now() - 1).toISOString()]) {
      sessionStorage.setItem("smart-auto-launcher:navigation-connect-trip:v2", JSON.stringify({ tripId: "trip", app: "maps", expiresAt, accessKey: "key" }));
      expect(readNavigationConnectTrip()).toBeNull();
    }
  });
  it("cleans up safely when session storage is blocked", () => {
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(() => clearNavigationConnectTrip()).not.toThrow();
  });
  it("keeps the newest capability in memory when storage writes fail", () => {
    const trip = { tripId: "new-trip", app: "maps" as const, expiresAt: new Date(Date.now() + 60000).toISOString(), accessKey: "key" };
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    rememberNavigationConnectTrip(trip);
    expect(readNavigationConnectTrip()).toEqual(trip);
    clearNavigationConnectTrip();
    expect(readNavigationConnectTrip()).toBeNull();
  });
});
