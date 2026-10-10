import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NavigationWidget } from "./navigation-widget";

const mocks = vi.hoisted(() => ({
  settings: { navApp: "waze", openNavigatorOnStartup: true, animations: true },
  apps: [{ id: "waze", label: "Waze" }, { id: "maps", label: "Google Maps" }, { id: "package:com.example.navigator", label: "Navigator" }],
  launch: vi.fn().mockResolvedValue(undefined),
  navigate: vi.fn().mockResolvedValue(undefined),
  acquire: vi.fn(), release: vi.fn(), update: vi.fn(), toast: vi.fn(),
}));
vi.mock("@/hooks/use-launcher-settings", () => ({ useLauncherSettings: () => ({ settings: mocks.settings, loaded: true, update: mocks.update }) }));
vi.mock("@/hooks/use-theme", () => ({ useTheme: () => ({ mode: "dark" }) }));
vi.mock("@/services/navigation-apps", () => ({ useNavigationApps: () => ({ ready: true, apps: mocks.apps }) }));
vi.mock("@/contexts/navigation-context", () => ({ useNavigationState: () => ({ acquireLocation: mocks.acquire, position: null, online: true, guidance: null, route: null }) }));
vi.mock("@/services/launcher-system", () => ({ errorMessage: () => "Indisponível", startNavigation: mocks.navigate }));
vi.mock("@/services/navigation-window", async (original) => ({ ...await original<typeof import("@/services/navigation-window")>(), openNavigationWindow: mocks.launch }));
vi.mock("./live-map", () => ({ default: () => null }));
vi.mock("sonner", () => ({ toast: { error: mocks.toast } }));

beforeEach(() => {
  mocks.launch.mockResolvedValue(undefined);
  mocks.navigate.mockResolvedValue(undefined);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ left: 100, top: 16, right: 900, bottom: 704, width: 800, height: 688, x: 100, y: 16, toJSON: () => ({}) });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.restoreAllMocks(); vi.useRealTimers(); mocks.settings.navApp = "waze"; });

describe("home GPS navigation", () => {
  it("never launches an external navigator at startup or when returning home, even with the legacy opt-in", async () => {
    vi.useFakeTimers(); mocks.acquire.mockReturnValue(mocks.release);
    const first = render(<NavigationWidget />);
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    first.unmount();
    render(<NavigationWidget />);
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(mocks.launch).not.toHaveBeenCalled();
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(mocks.acquire).toHaveBeenCalledTimes(2);
    expect(mocks.release).toHaveBeenCalledTimes(1);
  });
  it.each(["waze", "maps", "package:com.example.navigator"])("opens configured navigator %s from the map without window bounds", async (app) => {
    mocks.settings.navApp = app; render(<NavigationWidget />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Abrir mapa no navegador configurado em tela cheia" })); });
    expect(mocks.navigate).toHaveBeenCalledExactlyOnceWith(app, "");
    expect(mocks.launch).not.toHaveBeenCalled();
  });
  it("opens the selected app from the expansion control", async () => {
    render(<NavigationWidget />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Abrir navegador configurado" })); });
    expect(mocks.navigate).toHaveBeenCalledExactlyOnceWith("waze", "");
  });
  it("does not open the app while editing a destination", () => {
    render(<NavigationWidget />);
    fireEvent.click(screen.getByRole("textbox", { name: "Destino da navegação" }));
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
  it.each(["waze", "maps", "package:com.example.navigator", "system"])("opens destination directly in %s without requiring window support", async (app) => {
    mocks.settings.navApp = app;
    render(<NavigationWidget />);
    fireEvent.change(screen.getByRole("textbox", { name: "Destino da navegação" }), { target: { value: "  Avenida Paulista  " } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Iniciar navegação" })); });
    expect(mocks.navigate).toHaveBeenCalledExactlyOnceWith(app, "Avenida Paulista");
    expect(mocks.launch).not.toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalledWith({ lastDestination: "Avenida Paulista" });
  });
  it("does not replace an uninstalled selected navigator", async () => {
    mocks.settings.navApp = "package:com.missing.navigator"; render(<NavigationWidget />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Abrir navegador configurado" })); });
    expect(mocks.navigate).not.toHaveBeenCalled(); expect(mocks.launch).not.toHaveBeenCalled(); expect(mocks.toast).toHaveBeenCalled();
  });
  it("requires a specific configured app rather than launching an unrestricted chooser", async () => {
    mocks.settings.navApp = "system"; render(<NavigationWidget />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Abrir navegador configurado" })); });
    expect(mocks.launch).not.toHaveBeenCalled();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
  it("keeps the home state and does not save a destination when app launch fails", async () => {
    mocks.navigate.mockRejectedValueOnce(new Error("not_installed")); render(<NavigationWidget />);
    fireEvent.change(screen.getByRole("textbox", { name: "Destino da navegação" }), { target: { value: "Avenida Paulista" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Iniciar navegação" })); });
    expect(mocks.navigate).toHaveBeenCalledTimes(1);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledTimes(1);
  });
});
