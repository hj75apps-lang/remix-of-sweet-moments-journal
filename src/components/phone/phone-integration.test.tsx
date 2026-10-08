import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PhoneState } from "@/services/phone";

const native = vi.hoisted(() => ({
  navigate: vi.fn(), state: vi.fn(), pending: vi.fn(),
  receive: null as ((state: PhoneState) => void) | null,
  intent: null as (() => void) | null,
  resume: null as (() => void) | null,
  stops: [vi.fn(), vi.fn(), vi.fn()],
}));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => native.navigate, useRouterState: () => "/radio" }));
vi.mock("@/services/phone", () => ({
  isPhoneAvailable: () => true, getPhoneState: native.state, getPendingPhoneScreen: native.pending,
  onPhoneStateChanged: (callback: (state: PhoneState) => void) => { native.receive = callback; return native.stops[0]; },
  onPhoneScreenRequested: (callback: () => void) => { native.intent = callback; return native.stops[1]; },
}));
vi.mock("@/services/launcher-system", () => ({
  onLauncherResumed: (callback: () => void) => { native.resume = callback; return native.stops[2]; },
}));
import { PhoneIntegration } from "./phone-integration";

const idle: PhoneState = { available: true, isDefaultDialer: true, status: "idle", number: "", speakerOn: false };
beforeEach(() => {
  vi.clearAllMocks();
  native.state.mockResolvedValue(idle);
  native.pending.mockResolvedValue({ requested: false, number: "" });
});
afterEach(() => cleanup());

describe("global phone integration", () => {
  it("opens the phone from another route on an incoming call, without repeating identical updates", async () => {
    await act(async () => { render(<PhoneIntegration />); });
    act(() => { native.receive?.({ ...idle, status: "ringing" }); native.receive?.({ ...idle, status: "ringing" }); });
    expect(native.navigate).toHaveBeenCalledExactlyOnceWith({ to: "/telefone", search: { number: "" } });
  });
  it("routes a native dial intent with its number and removes listeners on exit", async () => {
    let unmount!: () => void;
    await act(async () => { ({ unmount } = render(<PhoneIntegration />)); });
    native.pending.mockResolvedValueOnce({ requested: true, number: "+55119999" });
    await act(async () => { native.intent?.(); });
    expect(native.navigate).toHaveBeenCalledExactlyOnceWith({ to: "/telefone", search: { number: "+55119999" } });
    unmount();
    native.stops.forEach((stop) => expect(stop).toHaveBeenCalledOnce());
  });
  it("does not navigate when a late initial state arrives after unmount", async () => {
    let finish!: (state: PhoneState) => void;
    native.state.mockReturnValue(new Promise<PhoneState>((resolve) => { finish = resolve; }));
    const { unmount } = render(<PhoneIntegration />);
    unmount();
    await act(async () => { finish({ ...idle, status: "ringing" }); });
    expect(native.navigate).not.toHaveBeenCalled();
  });
});
