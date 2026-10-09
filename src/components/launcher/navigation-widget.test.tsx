import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NavigationWidget } from "./navigation-widget";

const mocks = vi.hoisted(() => ({
  native: true,
  settings: { navApp: "waze", openNavigatorOnStartup: true },
  launch: vi.fn().mockResolvedValue(undefined),
  normalLaunch: vi.fn(),
  toast: vi.fn(),
}));
vi.mock("@/hooks/use-launcher-settings", () => ({
  useLauncherSettings: () => ({ settings: mocks.settings, loaded: true, update: vi.fn() }),
}));
vi.mock("@/services/navigation-apps", () => ({
  useNavigationApps: () => ({ ready: true, apps: [{ id: "waze", label: "Waze" }] }),
}));
vi.mock("@/services/launcher-system", () => ({
  isLauncherNative: () => mocks.native,
  errorMessage: () => "Indisponível",
  startNavigation: mocks.normalLaunch,
}));
vi.mock("@/services/navigation-window", () => ({
  navigationWindowBounds: () => ({ left: 100, top: 16, right: 900, bottom: 704 }),
  openNavigationWindow: mocks.launch,
}));
vi.mock("sonner", () => ({ toast: { error: mocks.toast } }));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
  mocks.native = true;
  mocks.settings.openNavigatorOnStartup = true;
  mocks.launch.mockResolvedValue(undefined);
});

describe("external navigator frame", () => {
  it("requests the selected navigator when home opens and opens again on return", async () => {
    vi.useFakeTimers();
    const first = render(<NavigationWidget />);
    await act(async () => { await vi.advanceTimersByTimeAsync(600); });
    expect(mocks.launch).toHaveBeenCalledWith("waze", { left: 100, top: 16, right: 900, bottom: 704 });
    first.unmount();
    render(<NavigationWidget />);
    await act(async () => { await vi.advanceTimersByTimeAsync(600); });
    expect(mocks.launch).toHaveBeenCalledTimes(2);
  });
  it("never opens a replacement navigator when positioned windows fail", async () => {
    mocks.settings.openNavigatorOnStartup = false;
    mocks.launch.mockRejectedValue(new Error("window_unsupported"));
    render(<NavigationWidget />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Abrir navegador escolhido nesta moldura" })); });
    expect(mocks.launch).toHaveBeenCalledTimes(1);
    expect(mocks.normalLaunch).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalled();
  });
  it("does not launch a web map when the frame is tapped in a browser", async () => {
    mocks.native = false;
    render(<NavigationWidget />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Abrir navegador escolhido nesta moldura" })); });
    expect(mocks.launch).not.toHaveBeenCalled();
    expect(mocks.normalLaunch).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalled();
  });
  it("respects a disabled automatic-opening preference", async () => {
    vi.useFakeTimers();
    mocks.settings.openNavigatorOnStartup = false;
    render(<NavigationWidget />);
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(mocks.launch).not.toHaveBeenCalled();
  });
});