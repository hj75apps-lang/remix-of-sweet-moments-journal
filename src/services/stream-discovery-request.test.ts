import { afterEach, describe, expect, it, vi } from "vitest";
import { requestDiscovery } from "./stream-discovery-request";
afterEach(() => vi.restoreAllMocks());
describe("bounded stream discovery requests", () => {
  it("cancels an audio probe without buffering an endless stream", async () => {
    const cancel = vi.fn();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(new ReadableStream({ cancel }), { headers: { "content-type": "audio/mpeg" } }));
    const response = await requestDiscovery("https://radio.example/live", 100, true);
    expect(response?.headers.get("content-type")).toBe("audio/mpeg");
    expect(cancel).toHaveBeenCalledOnce();
    expect(await response?.text()).toBe("");
  });
  it("refuses a redirect into the local network", async () => {
    const request = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 302, headers: { location: "https://127.0.0.1/" } }));
    expect(await requestDiscovery("https://radio.example/")).toBeNull();
    expect(request).toHaveBeenCalledOnce();
  });
  it("does not buffer pages above the page limit", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("x".repeat(400001)));
    expect(await requestDiscovery("https://radio.example/")).toBeNull();
  });
});
