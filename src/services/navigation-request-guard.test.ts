// @vitest-environment node
import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { authenticateNavigationCreator, consumeNavigationQuota, NAVIGATION_CREATOR_COOKIE } from "./navigation-request-guard";

const credential = "a".repeat(48);
const env = { NAVIGATION_CONNECT_CREATOR_KEYS_JSON: JSON.stringify({ device: createHash("sha256").update(credential).digest("hex") }) };
const request = (headers: Record<string, string> = {}) => new Request("https://launcher.example/api/navigation/trips", { headers });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe("navigation creator authentication", () => {
  it("accepts a provisioned bearer or one host-only cookie", async () => {
    await expect(authenticateNavigationCreator(request({ authorization: `Bearer ${credential}` }), env)).resolves.toBe("device");
    await expect(authenticateNavigationCreator(request({ cookie: `${NAVIGATION_CREATOR_COOKIE}=${credential}; preference=1` }), env)).resolves.toBe("device");
  });
  it("does not authenticate origins, IP headers, unknown keys or ambiguous cookies", async () => {
    const attempts: Record<string, string>[] = [{ origin: "https://launcher.example", "cf-connecting-ip": "1.1.1.1" }, { authorization: `Bearer ${"b".repeat(48)}` },
      { cookie: `${NAVIGATION_CREATOR_COOKIE}=${credential}; ${NAVIGATION_CREATOR_COOKIE}=${credential}` },
      { authorization: "Basic bad", cookie: `${NAVIGATION_CREATOR_COOKIE}=${credential}` }];
    for (const headers of attempts) {
      await expect(authenticateNavigationCreator(request(headers), env)).rejects.toMatchObject({ status: 401 });
    }
  });
  it("fails closed with missing, weak or malformed registry configuration", async () => {
    for (const value of [undefined, "{bad", "null", "[]", "{}", JSON.stringify({ device: "plaintext-key" })]) {
      await expect(authenticateNavigationCreator(request({ authorization: `Bearer ${credential}` }), { NAVIGATION_CONNECT_CREATOR_KEYS_JSON: value })).rejects.toMatchObject({ status: 503 });
    }
  });
});

describe("quota failure boundary", () => {
  it("fails closed on missing, failed, unbounded or malformed service responses", async () => {
    await expect(consumeNavigationQuota({}, "create", "device")).rejects.toMatchObject({ status: 503 });
    for (const response of [new Response(null, { status: 500 }), Response.json({ allowed: true }), new Response("x".repeat(1025)), Response.json({ allowed: "yes", retryAfter: 0 })]) {
      await expect(consumeNavigationQuota({ NAVIGATION_CONNECT_QUOTA: { fetch: async () => response } }, "create", "device")).rejects.toMatchObject({ status: 503 });
    }
  });
  it("propagates a denied budget and Retry-After without calling Google", async () => {
    await expect(consumeNavigationQuota({ NAVIGATION_CONNECT_QUOTA: { fetch: async () => Response.json({ allowed: false, retryAfter: 120 }) } }, "create", "device"))
      .rejects.toMatchObject({ code: "rate_limited", status: 429, retryAfter: 120 });
  });
  it("times out a binding that never answers", async () => {
    vi.useFakeTimers();
    const pending = expect(consumeNavigationQuota({ NAVIGATION_CONNECT_QUOTA: { fetch: () => new Promise<Response>(() => {}) } }, "create", "device")).rejects.toMatchObject({ status: 503 });
    await vi.advanceTimersByTimeAsync(2_000);
    await pending;
  });
});
