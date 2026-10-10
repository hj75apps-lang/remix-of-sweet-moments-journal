import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { publishRadio, useNowPlaying, type NowPlaying } from "./now-playing";

const track = (playing: boolean): NowPlaying => ({ title: "Real track", artist: "Artist", album: "", sourceName: "Player", packageName: "music.player", artwork: "", playing, duration: 1000, position: 0, kind: "app" });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); publishRadio(null); vi.restoreAllMocks(); vi.useRealTimers(); });

describe("confirmed now-playing state", () => {
  it("refreshes permission even when there is no media snapshot", async () => {
    let granted = false;
    vi.stubGlobal("Capacitor", { isNativePlatform: () => true, Plugins: { NowPlaying: {
      hasPermission: async () => ({ granted }), getCurrent: async () => ({ media: null }),
      addListener: () => ({ remove: () => {} }),
    } } });
    const { result } = renderHook(useNowPlaying);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(result.current.permission).toBe(false);
    granted = true;
    await act(async () => { window.dispatchEvent(new Event("focus")); await Promise.resolve(); await Promise.resolve(); });
    expect(result.current.permission).toBe(true); expect(result.current.media).toBeNull();
  });
  it("reuses identical snapshots and stops periodic bridge reads while hidden", async () => {
    vi.useFakeTimers();
    let hidden = false;
    vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
    const getCurrent = vi.fn(async () => ({ media: track(true) }));
    let change: ((event: { media: NowPlaying | null }) => void) | undefined;
    vi.stubGlobal("Capacitor", { isNativePlatform: () => true, Plugins: { NowPlaying: {
      hasPermission: async () => ({ granted: true }), getCurrent,
      addListener: (event: string, cb: typeof change) => { if (event === "mediaChanged") change = cb; return { remove: () => {} }; },
    } } });
    const { result } = renderHook(useNowPlaying);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    const snapshot = result.current.media;
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(result.current.media).toBe(snapshot);
    hidden = true;
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    const reads = getCurrent.mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(getCurrent).toHaveBeenCalledTimes(reads);
    act(() => change?.({ media: track(false) }));
    expect(result.current.media?.playing).toBe(false);
    hidden = false;
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); await vi.advanceTimersByTimeAsync(0); });
    expect(getCurrent).toHaveBeenCalledTimes(reads + 1);
  });
  it("follows native play/pause events without assuming a command succeeded", async () => {
    let change: ((event: { media: NowPlaying | null }) => void) | undefined;
    let state = track(true);
    const control = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("Capacitor", { isNativePlatform: () => true, Plugins: { NowPlaying: {
      hasPermission: async () => ({ granted: true }),
      getCurrent: async () => ({ media: state }),
      control,
      addListener: (event: string, cb: typeof change) => { if (event === "mediaChanged") change = cb; return { remove: () => {} }; },
    } } });
    const { result } = renderHook(() => useNowPlaying());
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(result.current.media?.playing).toBe(true);
    await act(async () => { await result.current.control("pause"); });
    expect(control).toHaveBeenCalledWith({ action: "pause", packageName: "music.player" });
    expect(result.current.media?.playing).toBe(true);
    act(() => { state = track(false); change?.({ media: state }); });
    expect(result.current.media?.playing).toBe(false);
    act(() => { state = track(true); change?.({ media: state }); });
    expect(result.current.media?.playing).toBe(true);
  });
  it("does not let a delayed native read overwrite a newer pause event", async () => {
    let change: ((event: { media: NowPlaying | null }) => void) | undefined;
    let resolveRead: ((value: { media: NowPlaying }) => void) | undefined;
    vi.stubGlobal("Capacitor", { isNativePlatform: () => true, Plugins: { NowPlaying: {
      hasPermission: async () => ({ granted: true }),
      getCurrent: () => new Promise((resolve) => { resolveRead = resolve; }),
      addListener: (event: string, cb: typeof change) => { if (event === "mediaChanged") change = cb; return { remove: () => {} }; },
    } } });
    const { result } = renderHook(() => useNowPlaying());
    await act(async () => { await Promise.resolve(); });
    act(() => change?.({ media: track(false) }));
    await act(async () => { resolveRead?.({ media: track(true) }); });
    expect(result.current.media?.playing).toBe(false);
  });
});