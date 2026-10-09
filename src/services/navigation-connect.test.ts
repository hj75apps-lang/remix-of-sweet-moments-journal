import { afterEach, describe, expect, it, vi } from "vitest";
import { clearNavigationConnectTrip, isNavigationConnectConfigured, readNavigationConnectTrip, rememberNavigationConnectTrip, onNavigationConnectTripChanged,
  setNavigationConnectCreatorCredential, createNavigationConnectTrip, getNavigationConnectTelemetry } from "./navigation-connect";

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); setNavigationConnectCreatorCredential(null); clearNavigationConnectTrip(); sessionStorage.clear(); });

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
  it("uses a memory-only creator key while persisting only the trip capability", async () => {
    const credential = "a".repeat(48);
    setNavigationConnectCreatorCredential(credential);
    const trip = { tripId: "new-trip", expiresAt: new Date(Date.now() + 60000).toISOString(), authToken: "temporary-google-token", launchUrl: "https://waze.com/ul?q=Casa" };
    const request = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(trip, { headers: { "x-navigation-connect-access-key": "signed-trip-key" } }));
    expect(await createNavigationConnectTrip({ app: "waze", destination: "Casa" })).toEqual(trip);
    expect(request).toHaveBeenCalledWith("/api/navigation/trips", expect.objectContaining({
      headers: { "content-type": "application/json", authorization: `Bearer ${credential}` }, redirect: "error", signal: expect.anything(),
    }));
    const stored = sessionStorage.getItem("smart-auto-launcher:navigation-connect-trip:v2");
    expect(stored).not.toContain(credential);
    expect(stored).not.toContain(trip.authToken);
    setNavigationConnectCreatorCredential(null);
    expect(readNavigationConnectTrip()).toBeNull();
  });
  it.each(["https://attacker.example/maps/dir/", "javascript:alert(1)", "https://user:pass@www.google.com/maps/dir/"])("rejects an unexpected launch URL: %s", async (launchUrl) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ tripId: "trip", expiresAt: new Date(Date.now() + 60000).toISOString(), authToken: "token", launchUrl },
      { headers: { "x-navigation-connect-access-key": "signed-key" } }));
    await expect(createNavigationConnectTrip({ app: "maps", destination: "Casa" })).rejects.toThrow("viagem inválida");
    expect(readNavigationConnectTrip()).toBeNull();
  });
  it("rejects oversized successful trip payloads", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("x".repeat(32769)));
    await expect(createNavigationConnectTrip({ app: "maps", destination: "Casa" })).rejects.toThrow("body_too_large");
    expect(readNavigationConnectTrip()).toBeNull();
  });
  it("keeps server error bodies out of user-facing exceptions", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("unexpected-provider-secret", { status: 503 }));
    await expect(createNavigationConnectTrip({ app: "maps", destination: "Casa" })).rejects.toThrow("Serviço de navegação indisponível (503)");
  });
  it("accepts authoritative metrics but rejects another trip and invalid positions", async () => {
    const valid = { tripId: "trip", state: "ENROUTE", active: true, sourcePackage: null, remainingDurationSeconds: 12.5,
      route: { points: [], remainingDistanceMeters: 300 } };
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => Response.json(valid));
    await expect(getNavigationConnectTelemetry("trip", "signed-key")).resolves.toEqual(valid);
    await expect(getNavigationConnectTelemetry("other-trip", "signed-key")).rejects.toThrow("telemetria inválida");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ ...valid, latitude: 200, longitude: 0 }));
    await expect(getNavigationConnectTelemetry("trip", "signed-key")).rejects.toThrow("telemetria inválida");
  });
  it("does not restore a cookie-authenticated trip after logout, even if fetch ignores abort", async () => {
    let resolve!: (response: Response) => void;
    const request = vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise<Response>((done) => { resolve = done; }));
    const pending = expect(createNavigationConnectTrip({ app: "maps", destination: "Casa" })).rejects.toMatchObject({ name: "NavigationConnectSupersededError" });
    setNavigationConnectCreatorCredential(null);
    expect(request.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
    resolve(Response.json({ tripId: "trip", expiresAt: new Date(Date.now() + 60000).toISOString(), authToken: "token", launchUrl: "https://www.google.com/maps/dir/" },
      { headers: { "x-navigation-connect-access-key": "signed-key" } }));
    await pending;
    expect(readNavigationConnectTrip()).toBeNull();
  });
  it("keeps the newest destination when an older create completes last", async () => {
    let resolve!: (response: Response) => void;
    vi.spyOn(globalThis, "fetch").mockImplementationOnce(() => new Promise<Response>((done) => { resolve = done; }))
      .mockResolvedValueOnce(Response.json({ tripId: "new-trip", expiresAt: new Date(Date.now() + 60000).toISOString(), authToken: "token", launchUrl: "https://waze.com/ul" },
        { headers: { "x-navigation-connect-access-key": "new-key" } }));
    const older = expect(createNavigationConnectTrip({ app: "maps", destination: "Antigo" })).rejects.toMatchObject({ name: "NavigationConnectSupersededError" });
    await createNavigationConnectTrip({ app: "waze", destination: "Novo" });
    resolve(Response.json({ tripId: "old-trip", expiresAt: new Date(Date.now() + 60000).toISOString(), authToken: "token", launchUrl: "https://www.google.com/maps/dir/" },
      { headers: { "x-navigation-connect-access-key": "old-key" } }));
    await older;
    expect(readNavigationConnectTrip()?.tripId).toBe("new-trip");
  });
  it("aborts a stalled request after ten seconds without AbortSignal.timeout support", async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, "fetch").mockImplementation((_url, options) => new Promise<Response>((_resolve, reject) => {
      options?.signal?.addEventListener("abort", () => reject(new Error("deadline")));
    }));
    const pending = expect(createNavigationConnectTrip({ app: "maps", destination: "Casa" })).rejects.toThrow("deadline");
    await vi.advanceTimersByTimeAsync(10_000);
    await pending;
    expect(readNavigationConnectTrip()).toBeNull();
  });
});
