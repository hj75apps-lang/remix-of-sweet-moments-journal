import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { publishRadio, useNowPlaying, type NowPlaying } from "./now-playing";

const track = (playing: boolean): NowPlaying => ({ title: "Real track", artist: "Artist", album: "", sourceName: "Player", packageName: "music.player", artwork: "", playing, duration: 1000, position: 0, kind: "app" });
afterEach(() => { cleanup(); publishRadio(null); vi.unstubAllGlobals(); });

describe("confirmed now-playing state", () => {
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