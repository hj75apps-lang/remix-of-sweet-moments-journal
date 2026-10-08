import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VehiclePosition } from "./navigation-location";

const { watch, stop } = vi.hoisted(() => ({ watch: vi.fn(), stop: vi.fn() }));
vi.mock("./navigation-location", () => ({ watchVehicle: watch }));
let emit: (position: VehiclePosition) => void;
const fix = (patch: Partial<VehiclePosition> = {}): VehiclePosition => ({
  latitude: -15, longitude: -52, heading: null, speed: null, accuracy: 10, timestamp: Date.now(), ...patch,
});
beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-08T12:00:00Z"));
  watch.mockReset().mockImplementation((callback) => { emit = callback; return stop; });
  stop.mockReset();
});
afterEach(() => vi.useRealTimers());

describe("shared location lifecycle", () => {
  it("waits for a fresh fix instead of replaying an expired fix and releases the watch", async () => {
    const store = await import("./location-store");
    const release = store.subscribeLocation(() => {});
    emit(fix());
    release();
    vi.advanceTimersByTime(11 * 60_000);
    const resolved = vi.fn();
    const pending = store.getLocationOnce().then(resolved);
    await Promise.resolve();
    expect(resolved).not.toHaveBeenCalled();
    const fresh = fix();
    emit(fresh);
    await pending;
    expect(resolved).toHaveBeenCalledWith(fresh);
    expect(watch).toHaveBeenCalledTimes(2);
    expect(stop).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("does not treat an old native last-known fix as fresh when it arrives now", async () => {
    const store = await import("./location-store");
    const pending = store.getLocationOnce();
    const resolved = vi.fn();
    void pending.then(resolved);
    emit(fix({ timestamp: Date.now() - 30 * 60_000 }));
    await Promise.resolve();
    expect(resolved).not.toHaveBeenCalled();
    emit(fix());
    await pending;
    expect(stop).toHaveBeenCalledOnce();
  });
  it("shares a watch and stops only after every consumer releases it", async () => {
    const store = await import("./location-store");
    const one = store.subscribeLocation(() => {});
    const two = store.subscribeLocation(() => {});
    expect(watch).toHaveBeenCalledOnce();
    one();
    expect(stop).not.toHaveBeenCalled();
    two();
    expect(stop).toHaveBeenCalledOnce();
  });
  it("cleans up a one-shot timeout", async () => {
    const store = await import("./location-store");
    const pending = store.getLocationOnce(1000);
    const rejected = expect(pending).rejects.toThrow("location_timeout");
    await vi.advanceTimersByTimeAsync(1000);
    await rejected;
    expect(stop).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
});
