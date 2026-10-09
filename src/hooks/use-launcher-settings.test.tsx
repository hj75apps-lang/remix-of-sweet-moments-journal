import { act, cleanup, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/services/launcher-system", () => ({ applyLauncherPrefs: async () => {}, setScreenBrightness: async () => {} }));
vi.mock("@/services/navigation-apps", () => ({ useNavigationApps: () => ({ apps: [], ready: false }) }));
import { DEFAULT_SETTINGS, LauncherSettingsProvider, useLauncherSettings } from "./use-launcher-settings";
import { VEHICLE_ICONS } from "@/services/vehicle-icon";
import { MAP_VIEWS } from "@/services/navigation-view";
const wrapper = ({ children }: { children: ReactNode }) => <LauncherSettingsProvider>{children}</LauncherSettingsProvider>;
beforeEach(() => { localStorage.clear(); localStorage.setItem("sal.android-system-integration-v2", "1"); });
afterEach(() => cleanup());
describe("launcher preference validation", () => {
  it.each(MAP_VIEWS)("persists and restores the $label map view", ({ value }) => {
    const first = renderHook(useLauncherSettings, { wrapper });
    act(() => first.result.current.update({ mapView: value }));
    expect(first.result.current.settings.mapView).toBe(value);
    first.unmount();
    expect(renderHook(useLauncherSettings, { wrapper }).result.current.settings.mapView).toBe(value);
  });
  it("preserves old preferences when adding the map view", () => {
    const { mapView: _view, ...legacy } = DEFAULT_SETTINGS;
    localStorage.setItem("sal.launcher-settings", JSON.stringify({ schema: 1, data: { ...legacy, navApp: "waze", vehicleIcon: "red" } }));
    expect(renderHook(useLauncherSettings, { wrapper }).result.current.settings).toMatchObject({ mapView: "2d", navApp: "waze", vehicleIcon: "red" });
  });
  it("rejects unknown map views without discarding other preferences", () => {
    localStorage.setItem("sal.launcher-settings", JSON.stringify({ schema: 1, data: { ...DEFAULT_SETTINGS, mapView: "invalid", navApp: "waze" } }));
    expect(renderHook(useLauncherSettings, { wrapper }).result.current.settings).toMatchObject({ mapView: "2d", navApp: "waze" });
  });
  it.each(VEHICLE_ICONS)("persists and restores $label as the GPS icon", ({ value }) => {
    const first = renderHook(useLauncherSettings, { wrapper });
    act(() => first.result.current.update({ vehicleIcon: value }));
    expect(first.result.current.settings.vehicleIcon).toBe(value);
    first.unmount();
    const restored = renderHook(useLauncherSettings, { wrapper });
    expect(restored.result.current.settings.vehicleIcon).toBe(value);
  });
  it("migrates older settings to an arrow without losing the navigator", () => {
    const { vehicleIcon: _icon, ...legacy } = DEFAULT_SETTINGS;
    localStorage.setItem("sal.launcher-settings", JSON.stringify({ schema: 1, data: { ...legacy, navApp: "waze" } }));
    const { result } = renderHook(useLauncherSettings, { wrapper });
    expect(result.current.settings.vehicleIcon).toBe("arrow");
    expect(result.current.settings.navApp).toBe("waze");
  });
  it("rejects an unknown vehicle icon while preserving valid preferences", () => {
    localStorage.setItem("sal.launcher-settings", JSON.stringify({ schema: 1, data: { ...DEFAULT_SETTINGS, vehicleIcon: "invalid", navApp: "waze" } }));
    const { result } = renderHook(useLauncherSettings, { wrapper });
    expect(result.current.settings.vehicleIcon).toBe("arrow");
    expect(result.current.settings.navApp).toBe("waze");
  });
  it("migrates invalid styled envelopes without erasing valid preferences", () => {
    localStorage.setItem("sal.launcher-settings", JSON.stringify({ schema: 1, data: { ...DEFAULT_SETTINGS, navApp: "waze", buttonOpacity: -10, buttonColor: "invalid", brightness: -0.5 } }));
    const { result } = renderHook(useLauncherSettings, { wrapper });
    expect(result.current.settings).toMatchObject({ navApp: "waze", buttonOpacity: 100, buttonColor: "", brightness: -1 });
    expect(document.documentElement.style.getPropertyValue("--launcher-button-opacity")).toBe("1");
  });
  it("normalizes edits before applying or persisting them", () => {
    const { result } = renderHook(useLauncherSettings, { wrapper });
    act(() => result.current.update({ buttonOpacity: Number.NaN, buttonColor: "#12abEF", brightness: 0.4 }));
    expect(result.current.settings).toMatchObject({ buttonOpacity: 100, buttonColor: "#12abEF", brightness: 0.4 });
    expect(JSON.parse(localStorage.getItem("sal.launcher-settings") ?? "null")).toMatchObject({ data: { buttonOpacity: 100 } });
  });
});
