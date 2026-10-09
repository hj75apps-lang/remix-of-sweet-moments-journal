import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NavigationWidget } from "./navigation-widget";

const mocks = vi.hoisted(() => ({
  settings: { navApp: "waze", openNavigatorOnStartup: true, animations: true },
  apps: [{ id: "waze", label: "Waze" }, { id: "maps", label: "Google Maps" }, { id: "package:com.example.navigator", label: "Navigator" }],
  launch: vi.fn().mockResolvedValue(undefined),
  acquire: vi.fn(), release: vi.fn(), update: vi.fn(), toast: vi.fn(),
}));
vi.mock("@/hooks/use-launcher-settings", () => ({ useLauncherSettings: () => ({ settings: mocks.settings, loaded: true, update: mocks.update }) }));
vi.mock("@/hooks/use-theme", () => ({ useTheme: () => ({ mode: "dark" }) }));
vi.mock("@/services/navigation-apps", () => ({ useNavigationApps: () => ({ ready: true, apps: mocks.apps }) }));
vi.mock("@/contexts/navigation-context", () => ({ useNavigationState: () => ({ acquireLocation: mocks.acquire, position: null, online: true, guidance: null, route: null }) }));
vi.mock("@/services/launcher-system", () => ({ errorMessage: () => "Indisponível", startNavigation: mocks.launch }));
vi.mock("./live-map", () => ({ default: () => null }));
vi.mock("sonner", () => ({ toast: { error: mocks.toast } }));

afterEach(() => { cleanup(); vi.clearAllMocks(); vi.useRealTimers(); mocks.settings.navApp = "waze"; });

describe("home GPS navigation", () => {
  it("never launches an external navigator at startup or when returning home, even with the legacy opt-in", async () => {
    vi.useFakeTimers(); mocks.acquire.mockReturnValue(mocks.release);
    const first = render(<NavigationWidget />);
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    first.unmount();
    render(<NavigationWidget />);
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(mocks.launch).not.toHaveBeenCalled();
    expect(mocks.acquire).toHaveBeenCalledTimes(2);
    expect(mocks.release).toHaveBeenCalledTimes(1);
  });
  it.each(["waze", "maps", "package:com.example.navigator", "system"])("explicitly opens configured navigator %s", async (app) => {
    mocks.settings.navApp = app; render(<NavigationWidget />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Abrir navegador configurado" })); });
    expect(mocks.launch).toHaveBeenCalledExactlyOnceWith(app, "");
  });
  it("launches the entered destination with the selected app and remembers it after success", async () => {
    render(<NavigationWidget />);
    fireEvent.change(screen.getByRole("textbox", { name: "Destino da navegação" }), { target: { value: "  Avenida Paulista  " } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Iniciar navegação" })); });
    expect(mocks.launch).toHaveBeenCalledExactlyOnceWith("waze", "Avenida Paulista");
    expect(mocks.update).toHaveBeenCalledWith({ lastDestination: "Avenida Paulista" });
  });
  it("does not replace an uninstalled selected navigator", async () => {
    mocks.settings.navApp = "package:com.missing.navigator"; render(<NavigationWidget />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Abrir navegador configurado" })); });
    expect(mocks.launch).not.toHaveBeenCalled(); expect(mocks.toast).toHaveBeenCalled();
  });
});
