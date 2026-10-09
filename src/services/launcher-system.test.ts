// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { create, Superseded } = vi.hoisted(() => ({ create: vi.fn(), Superseded: class extends Error {} }));
vi.mock("./navigation-connect", () => ({ createNavigationConnectTrip: create, NavigationConnectSupersededError: Superseded }));
import { startNavigation } from "./launcher-system";

const navigate = vi.fn();
beforeEach(() => { vi.stubGlobal("window", { Capacitor: { isNativePlatform: () => true, Plugins: { LauncherSystem: { navigate } } } }); });
afterEach(() => { vi.resetAllMocks(); vi.unstubAllGlobals(); });
describe("optional official telemetry and native navigation", () => {
  it("preserves ordinary navigation when authentication/backend is unavailable", async () => {
    create.mockRejectedValue(new Error("navigation_auth_not_configured"));
    await startNavigation("maps", "Casa");
    expect(navigate).toHaveBeenCalledWith({ app: "maps", destination: "Casa" });
  });
  it("does not reopen a superseded destination through the fallback", async () => {
    const error = new Superseded();
    create.mockRejectedValue(error);
    await expect(startNavigation("waze", "Antigo")).rejects.toBe(error);
    expect(navigate).not.toHaveBeenCalled();
  });
  it("forwards a validated official URL to the existing native plugin", async () => {
    create.mockResolvedValue({ launchUrl: "https://waze.com/ul?q=Casa" });
    await startNavigation("waze", "Casa");
    expect(navigate).toHaveBeenCalledWith({ app: "waze", destination: "Casa", launchUrl: "https://waze.com/ul?q=Casa" });
  });
});
