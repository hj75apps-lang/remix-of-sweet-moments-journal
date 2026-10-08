import { act, cleanup, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/services/launcher-system", () => ({ applyLauncherPrefs: async () => {}, setScreenBrightness: async () => {} }));
vi.mock("@/services/navigation-apps", () => ({ useNavigationApps: () => ({ apps: [], ready: false }) }));
import { DEFAULT_SETTINGS, LauncherSettingsProvider, useLauncherSettings } from "./use-launcher-settings";
const wrapper = ({ children }: { children: ReactNode }) => <LauncherSettingsProvider>{children}</LauncherSettingsProvider>;
beforeEach(() => { localStorage.clear(); localStorage.setItem("sal.android-system-integration-v2", "1"); });
afterEach(() => cleanup());
describe("launcher preference validation", () => {
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
    expect(JSON.parse(localStorage.getItem("sal.launcher-settings")!)).toMatchObject({ data: { buttonOpacity: 100 } });
  });
});
