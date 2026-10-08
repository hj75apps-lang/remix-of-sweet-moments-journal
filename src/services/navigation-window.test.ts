import { afterEach, describe, expect, it, vi } from "vitest";
import { navigationWindowBounds, openNavigationWindow } from "./navigation-window";

afterEach(() => vi.unstubAllGlobals());

describe("navigation window", () => {
  it("keeps the measured card bounds in CSS pixels", () => {
    expect(navigationWindowBounds({ left: 100, top: 16, right: 900, bottom: 704 })).toEqual({ left: 100, top: 16, right: 900, bottom: 704 });
  });
  it("rejects invalid, hidden or offscreen rectangles", () => {
    for (const left of [NaN, Infinity, -1, 900]) {
      expect(navigationWindowBounds({ left, top: 16, right: 900, bottom: 704 })).toBeNull();
    }
    expect(navigationWindowBounds({ left: 100, top: 16, right: 900, bottom: 16 })).toBeNull();
  });
  it("never launches a full-screen fallback on the web or older APK", async () => {
    vi.stubGlobal("window", { Capacitor: { isNativePlatform: () => false } });
    await expect(openNavigationWindow("maps", { left: 100, top: 16, right: 900, bottom: 704 })).rejects.toThrow("window_unavailable");
  });
  it("passes the selected navigator and bounds without changing the layout", async () => {
    const launch = vi.fn().mockResolvedValue({ requested: true });
    vi.stubGlobal("window", { Capacitor: { isNativePlatform: () => true, Plugins: { LauncherSystem: { openNavigationWindow: launch } } } });
    const bounds = { left: 100, top: 16, right: 900, bottom: 704 };
    await openNavigationWindow("waze", bounds);
    expect(launch).toHaveBeenCalledExactlyOnceWith({ app: "waze", bounds });
  });
  it("reports unsupported windows without requesting normal navigation", async () => {
    vi.stubGlobal("window", { Capacitor: { isNativePlatform: () => true, Plugins: { LauncherSystem: { openNavigationWindow: vi.fn().mockResolvedValue({ requested: false }) } } } });
    await expect(openNavigationWindow("maps", { left: 100, top: 16, right: 900, bottom: 704 })).rejects.toThrow("window_unsupported");
  });
});