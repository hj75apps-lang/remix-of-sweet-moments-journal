import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearNavigationConnectTrip, readNavigationConnectTrip, rememberNavigationConnectTrip } from "@/services/navigation-connect";

vi.mock("@/services/navigation-guidance", () => ({ useNavGuidance: () => ({ guidance: null, access: false }) }));
vi.mock("@/services/launcher-system", () => ({ onLauncherResumed: () => () => {} }));
vi.mock("@/services/location-store", () => ({ subscribeLocation: () => () => {} }));
import { NavigationProvider, useNavigationState } from "./navigation-context";
const wrapper = ({ children }: { children: ReactNode }) => <NavigationProvider>{children}</NavigationProvider>;
const trip = (tripId: string) => ({ tripId, app: "maps" as const, expiresAt: new Date(Date.now() + 60000).toISOString(), accessKey: "key" });
const telemetry = (tripId: string, active = true) => new Response(JSON.stringify({ tripId, state: active ? "ACTIVE" : "COMPLETED", active, sourcePackage: "com.google.android.apps.maps", route: { points: [], remainingDurationSeconds: 12.5 } }));
beforeEach(() => { clearNavigationConnectTrip(); sessionStorage.clear(); localStorage.clear(); });
afterEach(() => { cleanup(); clearNavigationConnectTrip(); vi.restoreAllMocks(); });

describe("Navigation Connect polling lifecycle", () => {
  it("restores the last map position offline and resumes on reconnection", async () => {
    let online = false;
    vi.spyOn(navigator, "onLine", "get").mockImplementation(() => online);
    const position = { latitude: -23.56, longitude: -46.65, heading: 90, speed: 10, accuracy: 5, timestamp: Date.now() };
    localStorage.setItem("sal.navigation-last-position", JSON.stringify({ schema: 1, data: position }));
    const { result } = renderHook(useNavigationState, { wrapper });
    await waitFor(() => expect(result.current.online).toBe(false));
    expect(result.current.position).toEqual(position);
    expect(result.current.locating).toBe(false);
    act(() => { online = true; window.dispatchEvent(new Event("online")); });
    await waitFor(() => expect(result.current.online).toBe(true));
    expect(result.current.position).toEqual(position);
  });
  it("starts polling a trip created after the root provider was mounted", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(telemetry("new"));
    const { result } = renderHook(useNavigationState, { wrapper });
    expect(fetch).not.toHaveBeenCalled();
    act(() => rememberNavigationConnectTrip(trip("new")));
    await waitFor(() => expect(result.current.active).toBe(true));
    expect(result.current.route?.remainingDurationSeconds).toBe(12.5);
    expect(fetch).toHaveBeenCalledOnce();
  });
  it("ignores an old completed response when a newer trip has replaced it", async () => {
    let finishOld!: (response: Response) => void;
    vi.spyOn(globalThis, "fetch").mockImplementation((url) => String(url).endsWith("/old")
      ? new Promise<Response>((resolve) => { finishOld = resolve; }) : Promise.resolve(telemetry("new")));
    rememberNavigationConnectTrip(trip("old"));
    const { result } = renderHook(useNavigationState, { wrapper });
    act(() => rememberNavigationConnectTrip(trip("new")));
    await waitFor(() => expect(result.current.active).toBe(true));
    await act(async () => { finishOld(telemetry("old", false)); });
    expect(readNavigationConnectTrip()?.tripId).toBe("new");
    expect(result.current.active).toBe(true);
  });
});
