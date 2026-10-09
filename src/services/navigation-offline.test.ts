import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isSavedMapPosition, readMapPosition, saveMapPosition, viewedMapTile } from "./navigation-offline";

const position = { latitude: -23.56, longitude: -46.65, heading: 90, speed: 12, accuracy: 5, timestamp: 1791570000000 };
const url = "https://tile.openstreetmap.org/15/1/2.png";
beforeEach(() => localStorage.clear());
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe("last map view", () => {
  it("restores only a validated GPS fix", () => {
    saveMapPosition(position);
    expect(readMapPosition()).toEqual(position);
    expect(isSavedMapPosition({ ...position, latitude: 200 })).toBe(false);
    expect(isSavedMapPosition({ ...position, timestamp: NaN })).toBe(false);
  });
  it("uses saved tiles offline without network requests", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const fetch = vi.spyOn(globalThis, "fetch");
    vi.stubGlobal("caches", { open: async () => ({ match: async () => new Response("saved") }) });
    expect(await (await viewedMapTile(url)).text()).toBe("saved");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("saves viewed tiles and limits disk usage", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    const put = vi.fn();
    const remove = vi.fn();
    vi.stubGlobal("caches", { open: async () => ({ match: async () => undefined, put, keys: async () => Array.from({ length: 162 }, (_, i) => String(i)), delete: remove }) });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("new", { headers: { "content-type": "image/png" } }));
    expect(await (await viewedMapTile(url)).text()).toBe("new");
    expect(put).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledTimes(2);
  });
  it("keeps expired saved tiles when an online request fails", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    vi.stubGlobal("caches", { open: async () => ({ match: async () => new Response("old", { headers: { date: "Thu, 01 Jan 1970 00:00:00 GMT" } }) }) });
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));
    expect(await (await viewedMapTile(url)).text()).toBe("old");
  });
  it("works online when optional caching is unavailable", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    vi.stubGlobal("caches", { open: async () => { throw new Error("quota"); } });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("new", { headers: { "content-type": "image/png" } }));
    expect(await (await viewedMapTile(url)).text()).toBe("new");
  });
});