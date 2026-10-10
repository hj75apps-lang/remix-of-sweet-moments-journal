import { describe, it, expect, vi } from "vitest";
import { createOtaEngine, type OtaAdapter, type OtaManifest, type OtaState } from "./ota-engine";

const hash = "a".repeat(64);
const manifest: OtaManifest = { schema: 1, appId: "app.smartautolauncher", sequence: 2, version: "1.1.0", channel: "testing", kind: "ota", compatible: true, url: "https://updates.example.org/2-1.1.0.zip", sha256: hash, bytes: 100, notes: "Comandos de voz", minNativeCode: 1, maxNativeCode: 1, minLauncherVersion: "1.0.0", bridgeRevision: 1, publishedAt: 1, expiresAt: 9999999999999 };
function setup(patch: Partial<OtaAdapter> = {}) {
  const builtin = { id: "builtin", version: "1.0.0", checksum: "", status: "success" };
  const adapter: OtaAdapter = {
    info: vi.fn().mockResolvedValue({ configured: true, nativeVersion: "1.0.0", nativeCode: 1, highest: 1, pending: "", previous: "builtin", channel: "testing", lastResult: "" }),
    claimStartup: vi.fn().mockResolvedValue({}), check: vi.fn().mockResolvedValue({ manifest, envelope: { payload: "signed" } }),
    stage: vi.fn().mockResolvedValue(undefined), confirmed: vi.fn().mockResolvedValue(undefined),
    current: vi.fn().mockResolvedValue({ bundle: builtin, native: "1.0.0" }),
    download: vi.fn().mockResolvedValue({ id: "new", version: "2-1.1.0", checksum: hash, status: "pending" }),
    set: vi.fn().mockResolvedValue(undefined), notifyReady: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue({ bundles: [builtin] }), remove: vi.fn().mockResolvedValue(undefined), ...patch,
  };
  const states: OtaState[] = [];
  const engine = createOtaEngine(adapter, (s) => states.push(s), () => 100000);
  return { adapter, states, engine };
}
describe("Launcher OTA", () => {
  it("stages signed compatible voice/UI updates without reload or media control", async () => {
    const { adapter, states, engine } = setup(); await engine.start(); await engine.ready(); await engine.check(true, true);
    expect(adapter.stage).toHaveBeenCalledWith({ id: "new", envelope: { payload: "signed" } });
    expect(adapter.set).not.toHaveBeenCalled(); expect(states.at(-1)?.status).toBe("staged");
  });
  it("activates exclusively on a startup claim", async () => {
    const { adapter, engine } = setup({ claimStartup: vi.fn().mockResolvedValue({ id: "new" }), list: vi.fn().mockResolvedValue({ bundles: [{ id: "new", status: "pending" }] }) });
    expect(await engine.start()).toBe(true); expect(adapter.set).toHaveBeenCalledWith({ id: "new" }); expect(adapter.notifyReady).not.toHaveBeenCalled();
  });
  it("preserves offline data and pauses hidden checks", async () => {
    const { adapter, engine, states } = setup(); await engine.check(false, true); await engine.check(true, false);
    expect(adapter.download).not.toHaveBeenCalled(); expect(adapter.check).not.toHaveBeenCalled(); expect(states.at(-1)?.status).toBe("offline");
  });
  it.each(["native", "incompatible", "suspended", "old", "unsigned", "corrupt"])("rejects %s without activation", async (kind) => {
    const m = { ...manifest, kind: kind === "native" ? "native" as const : "ota" as const, compatible: kind !== "incompatible", suspended: kind === "suspended", sequence: kind === "old" ? 1 : 2 };
    const { adapter, engine, states } = setup({ check: vi.fn().mockResolvedValue({ manifest: m, envelope: kind === "unsigned" ? undefined : {} }), ...(kind === "corrupt" ? { download: vi.fn().mockResolvedValue({ id: "bad", checksum: "bad", status: "pending" }) } : {}) });
    await engine.check(true, true); expect(adapter.stage).not.toHaveBeenCalled(); expect(adapter.set).not.toHaveBeenCalled(); expect(states.at(-1)?.status).not.toBe("staged");
  });
  it("recovers from server failure and retries", async () => {
    const check = vi.fn().mockRejectedValueOnce(new Error("offline server")).mockResolvedValue({ manifest, envelope: {} });
    const { engine, states, adapter } = setup({ check }); await engine.check(true, true); expect(states.at(-1)?.status).toBe("error");
    await engine.check(true, true, true); expect(adapter.stage).toHaveBeenCalled();
  });
  it("retains active, previous, pending and builtin bundles", async () => {
    const { engine, adapter } = setup({ list: vi.fn().mockResolvedValue({ bundles: [{ id: "builtin", status: "success" }, { id: "orphan", status: "error" }] }) });
    await engine.ready(); expect(adapter.remove).toHaveBeenCalledTimes(1); expect(adapter.remove).toHaveBeenCalledWith({ id: "orphan" });
  });
});