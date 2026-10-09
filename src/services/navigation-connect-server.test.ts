import { webcrypto } from "node:crypto";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  createNavigationConnectAccessKey,
  verifyNavigationConnectAccessKey,
  getTrackedTrip,
  createTrackedTrip,
} from "./navigation-connect-server";

describe("Navigation Connect access capability", () => {
  it("accepts a signed capability before expiry", async () => {
    const env = { NAVIGATION_CONNECT_SESSION_SECRET: "x".repeat(48) };
    const expiresAt = new Date(Date.now() + 60_000).toISOString();
    const key = await createNavigationConnectAccessKey(env, "trip-123", expiresAt);

    await expect(verifyNavigationConnectAccessKey(env, "trip-123", key)).resolves.toBe(true);
    await expect(verifyNavigationConnectAccessKey(env, "trip-other", key)).resolves.toBe(false);
  });

  it("rejects expired capabilities", async () => {
    const env = { NAVIGATION_CONNECT_SESSION_SECRET: "x".repeat(48) };
    const expiresAt = new Date(Date.now() - 1_000).toISOString();
    const key = await createNavigationConnectAccessKey(env, "trip-123", expiresAt);

    await expect(verifyNavigationConnectAccessKey(env, "trip-123", key)).resolves.toBe(false);
  });
});

describe("Navigation Connect telemetry", () => {
  let env: Record<string, string>;
  beforeAll(async () => {
    const keys = await webcrypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
    const pem = Buffer.from(await webcrypto.subtle.exportKey("pkcs8", keys.privateKey)).toString("base64");
    env = { GOOGLE_NAVIGATION_CONNECT_SERVICE_ACCOUNT_JSON: JSON.stringify({ client_email: "audit@example.invalid", project_id: "audit", private_key: `-----BEGIN PRIVATE KEY-----\n${pem}\n-----END PRIVATE KEY-----` }) };
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  it.each(["12.5s", "120s", "0s"])("maps the provider's %s duration and ETA", async (duration) => {
    vi.stubGlobal("crypto", webcrypto);
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => new Response(JSON.stringify(String(url).includes("oauth2") ? { access_token: "test-token" } : { state: "ENROUTE", execution: { remainingDuration: duration, remainingDistanceMeters: 300 } })));
    const telemetry = await getTrackedTrip(env, "test-trip") as { remainingDurationSeconds: number; etaEpochMs: number; route: { points: unknown[]; remainingDistanceMeters: number } };
    expect(telemetry.remainingDurationSeconds).toBe(Number(duration.slice(0, -1)));
    expect(telemetry.etaEpochMs).toBeGreaterThanOrEqual(Date.now() - 100);
    expect(telemetry.route).toMatchObject({ points: [], remainingDistanceMeters: 300 });
  });
  it("fails before contacting Google when the capability secret is missing", async () => {
    const requests = vi.spyOn(globalThis, "fetch");
    await expect(createTrackedTrip(env, { app: "maps", destination: "Casa" })).rejects.toThrow("NAVIGATION_CONNECT_SESSION_SECRET");
    expect(requests).not.toHaveBeenCalled();
  });
  it("cancels an oversized OAuth response before any trip request", async () => {
    const cancel = vi.fn();
    const requests = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(new ReadableStream({
      start(controller) { controller.enqueue(new TextEncoder().encode("x".repeat(32769))); }, cancel,
    })));
    await expect(getTrackedTrip(env, "test-trip")).rejects.toThrow("body_too_large");
    expect(requests).toHaveBeenCalledOnce();
    expect(cancel).toHaveBeenCalledOnce();
  });
  it("rejects an OAuth token with the wrong runtime type", async () => {
    const requests = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ access_token: { token: "bad" } }));
    await expect(getTrackedTrip(env, "test-trip")).rejects.toThrow("access token");
    expect(requests).toHaveBeenCalledOnce();
  });
  it("does not start an upstream request after its caller has aborted", async () => {
    const requests = vi.spyOn(globalThis, "fetch");
    const controller = new AbortController();
    controller.abort();
    await expect(getTrackedTrip(env, "test-trip", controller.signal)).rejects.toThrow();
    expect(requests).not.toHaveBeenCalled();
  });
  it("rejects malformed route geometry instead of calling array methods on external input", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => Response.json(String(url).includes("oauth2") ?
      { access_token: "test-token" } : { execution: { remainingRoute: { simplePolyline: { points: {} } } } }));
    await expect(getTrackedTrip(env, "test-trip")).rejects.toThrow("Invalid route geometry");
  });
  it("rejects expired newly issued trips and keeps credentials on HTTPS without redirects", async () => {
    const requests = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => Response.json(String(url).includes("oauth2") ?
      { access_token: "test-token" } : { authToken: { token: "trip-token", expireTime: "2000-01-01T00:00:00Z" } }));
    await expect(createTrackedTrip({ ...env, NAVIGATION_CONNECT_SESSION_SECRET: "x".repeat(48) }, { app: "maps", destination: "Casa" })).rejects.toThrow("token de viagem válido");
    expect(requests).toHaveBeenCalledTimes(2);
    for (const [url, options] of requests.mock.calls) {
      expect(String(url)).toMatch(/^https:/);
      expect(options?.redirect).toBe("error");
      expect(options?.signal).toBeDefined();
    }
  });
});
