import { afterEach, describe, expect, it, vi } from "vitest";
const { createTrip, sign } = vi.hoisted(() => ({ createTrip: vi.fn(), sign: vi.fn() }));
vi.mock("./navigation-connect-server", () => ({
  createTrackedTrip: createTrip, createNavigationConnectAccessKey: sign,
  getTrackedTrip: vi.fn(), verifyNavigationConnectAccessKey: vi.fn(),
}));
import { handleNavigationConnect } from "./navigation-api";

afterEach(() => vi.resetAllMocks());
const post = (body: string, headers: Record<string, string> = {}) => new Request("https://launcher.example/api/navigation/trips", {
  method: "POST", body, headers: { "content-type": "application/json", "cf-connecting-ip": crypto.randomUUID(), ...headers },
});
describe("Navigation Connect request boundary", () => {
  it.each(["{bad", "null", "[]", '{"app":"maps","destination":{}}', '{"app":"maps","destination":" "}', JSON.stringify({ app: "maps", destination: "x".repeat(201) })])("rejects malformed JSON/input without contacting Google: %s", async (body) => {
    const response = await handleNavigationConnect(post(body), {});
    expect(response?.status).toBe(400);
    expect(createTrip).not.toHaveBeenCalled();
  });
  it("limits chunked bodies even when Content-Length is absent or understated", async () => {
    for (const headers of [{}, { "content-length": "1" }]) {
      const response = await handleNavigationConnect(post(JSON.stringify({ app: "maps", destination: "x".repeat(5000) }), headers), {});
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
    const env = { NAVIGATION_CONNECT_ALLOWED_ORIGIN: "https://localhost" };
    expect((await handleNavigationConnect(post('{}'), env))?.status).toBe(403);
    const response = await handleNavigationConnect(post('{}', { origin: "https://localhost" }), env);
    expect(response?.status).toBe(400);
    expect(response?.headers.get("access-control-allow-origin")).toBe("https://localhost");
  });
  it("accepts a valid trimmed destination and returns a signed capability", async () => {
    createTrip.mockResolvedValue({ tripId: "trip", expiresAt: "2026-12-01T00:00:00Z", authToken: "ephemeral", launchUrl: "https://waze.com/ul" });
    sign.mockResolvedValue("signed-key");
    const response = await handleNavigationConnect(post('{"app":"waze","destination":" Casa "}'), {});
    expect(response?.status).toBe(200);
    expect(createTrip).toHaveBeenCalledWith({}, { app: "waze", destination: "Casa" });
    expect(response?.headers.get("x-navigation-connect-access-key")).toBe("signed-key");
  });
});
