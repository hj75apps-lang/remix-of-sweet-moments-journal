// @vitest-environment node
import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
const { createTrip, sign, getTrip, verify } = vi.hoisted(() => ({ createTrip: vi.fn(), sign: vi.fn(), getTrip: vi.fn(), verify: vi.fn() }));
vi.mock("./navigation-connect-server", () => ({
  createTrackedTrip: createTrip, createNavigationConnectAccessKey: sign,
  getTrackedTrip: getTrip, verifyNavigationConnectAccessKey: verify,
}));
import { handleNavigationConnect } from "./navigation-api";
import { NavigationQuota } from "./navigation-quota";
import { memoryQuotaStorage } from "../test/navigation-quota-storage";

const credential = "a".repeat(48);
const keys = JSON.stringify({ device: createHash("sha256").update(credential).digest("hex") });
function serverEnv() {
  const quota = new NavigationQuota({ storage: memoryQuotaStorage() }, {});
  return { NAVIGATION_CONNECT_CREATOR_KEYS_JSON: keys, NAVIGATION_CONNECT_QUOTA: { fetch: (request: Request) => quota.fetch(request) } };
}

afterEach(() => vi.resetAllMocks());
const post = (body: string, headers: Record<string, string> = {}) => new Request("https://launcher.example/api/navigation/trips", {
  method: "POST", body, headers: { "content-type": "application/json", authorization: `Bearer ${credential}`, "cf-connecting-ip": crypto.randomUUID(), ...headers },
});
describe("Navigation Connect request boundary", () => {
  it.each(["{bad", "null", "[]", '{"app":"maps","destination":{}}', '{"app":"maps","destination":" "}', JSON.stringify({ app: "maps", destination: "x".repeat(201) })])("rejects malformed JSON/input without contacting Google: %s", async (body) => {
    const response = await handleNavigationConnect(post(body), serverEnv());
    expect(response?.status).toBe(400);
    expect(createTrip).not.toHaveBeenCalled();
  });
  it("limits chunked bodies even when Content-Length is absent or understated", async () => {
    for (const headers of [{}, { "content-length": "1" }]) {
      const response = await handleNavigationConnect(post(JSON.stringify({ app: "maps", destination: "x".repeat(5000) }), headers), serverEnv());
      expect(response?.status).toBe(413);
    }
    expect(createTrip).not.toHaveBeenCalled();
  });
  it("rejects a foreign browser origin even without a CORS override", async () => {
    const response = await handleNavigationConnect(post('{"app":"maps","destination":"Casa"}', { origin: "https://other.example" }), {});
    expect(response?.status).toBe(403);
    expect(createTrip).not.toHaveBeenCalled();
  });
  it("requires the configured APK origin and retains its CORS response", async () => {
    const env = { ...serverEnv(), NAVIGATION_CONNECT_ALLOWED_ORIGIN: "https://localhost" };
    expect((await handleNavigationConnect(post('{}'), env))?.status).toBe(403);
    const response = await handleNavigationConnect(post('{}', { origin: "https://localhost" }), env);
    expect(response?.status).toBe(400);
    expect(response?.headers.get("access-control-allow-origin")).toBe("https://localhost");
  });
  it("accepts a valid trimmed destination and returns a signed capability", async () => {
    createTrip.mockResolvedValue({ tripId: "trip", expiresAt: "2026-12-01T00:00:00Z", authToken: "ephemeral", launchUrl: "https://waze.com/ul" });
    sign.mockResolvedValue("signed-key");
    const env = serverEnv();
    const request = post('{"app":"waze","destination":" Casa "}');
    const response = await handleNavigationConnect(request, env);
    expect(response?.status).toBe(200);
    expect(createTrip).toHaveBeenCalledWith(env, { app: "waze", destination: "Casa" }, request.signal);
    expect(response?.headers.get("x-navigation-connect-access-key")).toBe("signed-key");
  });
  it("refuses unauthenticated creates before consuming quota or contacting Google", async () => {
    const env = serverEnv();
    const quota = vi.spyOn(env.NAVIGATION_CONNECT_QUOTA, "fetch");
    const response = await handleNavigationConnect(post('{"app":"maps","destination":"Casa"}', { authorization: "" }), env);
    expect(response?.status).toBe(401);
    expect(quota).not.toHaveBeenCalled();
    expect(createTrip).not.toHaveBeenCalled();
  });
  it("cannot evade the per-creator budget by rotating forwarded IP headers", async () => {
    const env = serverEnv();
    createTrip.mockResolvedValue({ tripId: "trip", expiresAt: "2026-12-01T00:00:00Z", authToken: "ephemeral", launchUrl: "https://waze.com/ul" });
    sign.mockResolvedValue("signed-key");
    for (let index = 0; index < 5; index++) {
      expect((await handleNavigationConnect(post('{"app":"waze","destination":"Casa"}', { "x-forwarded-for": `${index}.1.1.1` }), env))?.status).toBe(200);
    }
    const response = await handleNavigationConnect(post('{"app":"waze","destination":"Casa"}', { "x-forwarded-for": "9.1.1.1" }), env);
    expect(response?.status).toBe(429);
    expect(Number(response?.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(createTrip).toHaveBeenCalledTimes(5);
  });
  it("fails closed if quota is unavailable after authentication", async () => {
    const response = await handleNavigationConnect(post('{"app":"maps","destination":"Casa"}'), { NAVIGATION_CONNECT_CREATOR_KEYS_JSON: keys });
    expect(response?.status).toBe(503);
    expect(createTrip).not.toHaveBeenCalled();
  });
  it("bounds and validates encoded trip identifiers before checking a capability", async () => {
    for (const id of ["%ZZ", "%2Fsecret", "x".repeat(129)]) {
      const response = await handleNavigationConnect(new Request(`https://launcher.example/api/navigation/trips/${id}`), serverEnv());
      expect(response?.status).toBe(400);
    }
    expect(verify).not.toHaveBeenCalled();
    expect(getTrip).not.toHaveBeenCalled();
  });
  it("requires a valid capability before consuming the read budget", async () => {
    const env = serverEnv();
    const quota = vi.spyOn(env.NAVIGATION_CONNECT_QUOTA, "fetch");
    verify.mockResolvedValue(false);
    const request = new Request("https://launcher.example/api/navigation/trips/trip", { headers: { "x-navigation-connect-access-key": "invalid" } });
    expect((await handleNavigationConnect(request, env))?.status).toBe(401);
    expect(quota).not.toHaveBeenCalled();
    expect(getTrip).not.toHaveBeenCalled();
  });
  it("does not intercept neighboring API routes", async () => {
    expect(await handleNavigationConnect(new Request("https://launcher.example/api/navigation/trips-other"), {})).toBeNull();
  });
});
