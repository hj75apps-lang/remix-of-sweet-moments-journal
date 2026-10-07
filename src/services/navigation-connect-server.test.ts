import { describe, expect, it } from "vitest";
import {
  createNavigationConnectAccessKey,
  verifyNavigationConnectAccessKey,
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
