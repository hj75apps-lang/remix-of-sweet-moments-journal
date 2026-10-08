import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RadioStation } from "@/services/radio-browser";
const { resolveSource } = vi.hoisted(() => ({ resolveSource: vi.fn() }));
vi.mock("@/services/radio-stream", () => ({ resolveSource, streamKind: () => "direct", canPlayNatively: () => true, reconnectDelay: () => 1000 }));
import { useRadioPlayer } from "./use-radio-player";

class FakeAudio extends EventTarget {
  static elements: FakeAudio[] = [];
  src = ""; volume = 1; currentTime = 0; crossOrigin: string | null = null;
  constructor() { super(); FakeAudio.elements.push(this); }
  pause() {}
  load() { this.currentTime = 0; }
  removeAttribute(name: string) { if (name === "src") this.src = ""; }
  play() { return Promise.resolve().then(() => { if (this.src) { this.currentTime = 1; this.dispatchEvent(new Event("timeupdate")); } }); }
}
const station = (name: string): RadioStation => ({ id: name, name, sources: [`https://radio.example/${name}`], favicon: "", tags: [], state: "", bitrate: 0, codec: "" });
const flush = async () => { for (let n = 0; n < 12; n++) await Promise.resolve(); };
beforeEach(() => {
  vi.useFakeTimers();
  FakeAudio.elements = [];
  vi.stubGlobal("Audio", FakeAudio);
  localStorage.clear();
  resolveSource.mockReset().mockImplementation(async (url: string) => [url]);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe("radio playback cancellation", () => {
  it("cannot overwrite a newer station after an older CORS check finishes", async () => {
    let finishOld!: (response: Response) => void;
    vi.spyOn(globalThis, "fetch").mockImplementation((url) => String(url).endsWith("old")
      ? new Promise<Response>((resolve) => { finishOld = resolve; })
      : Promise.resolve(new Response("", { status: 200 })));
    const { result } = renderHook(() => useRadioPlayer());
    act(() => result.current.setEq(true));
    await act(async () => { result.current.play(station("old")); await flush(); });
    await act(async () => { result.current.play(station("new")); await flush(); });
    expect(result.current.status).toBe("playing");
    expect(FakeAudio.elements[0]?.src).toContain("/new");
    await act(async () => { finishOld(new Response("", { status: 403 })); await flush(); });
    expect(FakeAudio.elements[0]?.src).toContain("/new");
    expect(result.current.station?.id).toBe("new");
    expect(result.current.status).toBe("playing");
    expect(FakeAudio.elements[0]?.crossOrigin).toBeNull();
  });
  it("does not schedule retries when an obsolete playlist returns no sources", async () => {
    let finishOld!: (sources: string[]) => void;
    resolveSource.mockImplementation((url: string) => url.endsWith("old") ? new Promise<string[]>((resolve) => { finishOld = resolve; }) : Promise.resolve([url]));
    const { result, unmount } = renderHook(() => useRadioPlayer());
    await act(async () => { result.current.play(station("old")); await flush(); });
    await act(async () => { result.current.play(station("new")); await flush(); });
    await act(async () => { finishOld([]); await flush(); });
    expect(result.current.status).toBe("playing");
    // React may schedule its own timers. Verify that no obsolete source is retried.
    await act(async () => { await vi.advanceTimersByTimeAsync(12000); await flush(); });
    expect(resolveSource).toHaveBeenCalledTimes(2);
    expect(result.current.station?.id).toBe("new");
    expect(result.current.status).toBe("playing");
    unmount();
    expect(FakeAudio.elements.every((audio) => audio.src === "")).toBe(true);
  });
  it("retains plain playback if Web Audio initialization is unavailable", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 200 }));
    vi.stubGlobal("AudioContext", class { constructor() { throw new Error("unavailable"); } });
    const { result } = renderHook(() => useRadioPlayer());
    act(() => result.current.setEq(true));
    await act(async () => { result.current.play(station("new")); await flush(); });
    expect(result.current.status).toBe("playing");
    expect(result.current.eqStatus).toBe("unsupported");
    expect(FakeAudio.elements[0]?.src).toContain("/new");
    expect(FakeAudio.elements[0]?.crossOrigin).toBeNull();
  });
});
