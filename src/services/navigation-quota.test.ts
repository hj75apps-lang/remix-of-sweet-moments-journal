// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { NavigationQuota } from "./navigation-quota";
import { memoryQuotaStorage } from "../test/navigation-quota-storage";
import worker from "../../infrastructure/navigation-quota/worker";

const request = (subject: string, operation = "create") => new Request("https://quota.internal/consume", {
  method: "POST", body: JSON.stringify({ operation, subject }),
});
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe("shared atomic navigation budget", () => {
  it("routes all backend instances to the same private quota object", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ allowed: true, retryAfter: 0 }));
    const idFromName = vi.fn().mockReturnValue("id");
    const get = vi.fn().mockReturnValue({ fetch });
    const input = request("device");
    await worker.fetch(input, { NAVIGATION_QUOTA_STATE: { idFromName, get } });
    expect(idFromName).toHaveBeenCalledWith("launcher-v1");
    expect(get).toHaveBeenCalledWith("id");
    expect(fetch).toHaveBeenCalledWith(input);
  });
  it("admits only five concurrent creates, including across reconstructed instances", async () => {
    const state = { storage: memoryQuotaStorage() };
    const instances = [new NavigationQuota(state, {}), new NavigationQuota(state, {})];
    const results = await Promise.all(Array.from({ length: 20 }, async (_, i) =>
      (await instances[i % 2]!.fetch(request("device"))).json()));
    expect(results.filter((result) => result.allowed)).toHaveLength(5);
    expect(results.filter((result) => !result.allowed).every((result) => result.retryAfter >= 1 && result.retryAfter <= 60)).toBe(true);
  });
  it("retains the project-wide hourly cap after the per-device minute resets", async () => {
    let now = 10_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const quota = new NavigationQuota({ storage: memoryQuotaStorage() }, { NAVIGATION_CREATE_HOURLY_LIMIT: "2" });
    expect(await (await quota.fetch(request("global"))).json()).toMatchObject({ allowed: true });
    expect(await (await quota.fetch(request("other"))).json()).toMatchObject({ allowed: true });
    now += 61_000;
    expect(await (await quota.fetch(request("new-device"))).json()).toMatchObject({ allowed: false });
    now += 3_600_000;
    expect(await (await quota.fetch(request("new-device"))).json()).toMatchObject({ allowed: true });
  });
  it("isolates read buckets and keeps polling below its budget", async () => {
    const quota = new NavigationQuota({ storage: memoryQuotaStorage() }, {});
    for (let count = 0; count < 60; count++) expect(await (await quota.fetch(request("trip", "read"))).json()).toMatchObject({ allowed: true });
    expect(await (await quota.fetch(request("trip", "read"))).json()).toMatchObject({ allowed: false });
    expect(await (await quota.fetch(request("other-trip", "read"))).json()).toMatchObject({ allowed: true });
    expect(await (await quota.fetch(request("device"))).json()).toMatchObject({ allowed: true });
  });
  it("rejects malformed callers and unsafe budget configuration", async () => {
    const quota = new NavigationQuota({ storage: memoryQuotaStorage() }, {});
    for (const body of ["{bad", "null", JSON.stringify({ operation: "delete", subject: "device" }), JSON.stringify({ operation: "create", subject: "create:global" })]) {
      expect((await quota.fetch(new Request("https://quota.internal/consume", { method: "POST", body }))).status).toBe(400);
    }
    expect((await quota.fetch(new Request("https://quota.internal/consume"))).status).toBe(404);
    expect(() => new NavigationQuota({ storage: memoryQuotaStorage() }, { NAVIGATION_CREATE_HOURLY_LIMIT: "0" })).toThrow("invalid_hourly_quota");
  });
});
