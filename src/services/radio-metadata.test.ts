import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => false }, registerPlugin: () => ({}) }));
import { readRadioMetadata } from "./radio-metadata";
afterEach(() => vi.restoreAllMocks());
describe("bounded optional ICY reader", () => {
  it("reads metadata across chunks and cancels stream after one block", async () => {
    const text = "StreamTitle='Published song';";
    const block = new TextEncoder().encode(text.padEnd(32, "\0"));
    const cancel = vi.fn();
    const body = new ReadableStream({ start(controller) {
      controller.enqueue(new Uint8Array([1, 2, 3, 4, 2, ...block.slice(0, 7)]));
      controller.enqueue(block.slice(7));
    }, cancel });
    const request = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(body, { headers: { "icy-metaint": "4" } }));
    expect(await readRadioMetadata("https://radio.example/live", new AbortController().signal)).toEqual({ title: "Published song", artist: "" });
    expect(request).toHaveBeenCalledTimes(1); expect(cancel).toHaveBeenCalled();
  });
  it("does not disrupt listening when CORS rejects metadata", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("CORS"));
    expect(await readRadioMetadata("https://radio.example/live", new AbortController().signal)).toBeNull();
  });
  it("does not probe playlists or invalid stream URLs", async () => {
    const request = vi.spyOn(globalThis, "fetch");
    for (const url of ["https://radio.example/live.m3u8", "http://radio.example/live", "https://127.0.0.1/live"]) {
      expect(await readRadioMetadata(url, new AbortController().signal)).toBeNull();
    }
    expect(request).not.toHaveBeenCalled();
  });
  it("rejects impossible intervals without reading endless audio", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("audio", { headers: { "icy-metaint": "99999999" } }));
    expect(await readRadioMetadata("https://radio.example/live", new AbortController().signal)).toBeNull();
  });
});