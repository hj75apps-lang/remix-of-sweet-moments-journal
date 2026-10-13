import { describe, expect, it, vi } from "vitest";
import { DEFAULT_WALLPAPER, importWallpaper, isWallpaperState, readWallpaper, writeWallpaper } from "./wallpaper";
const native = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn() }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => true }, registerPlugin: () => native }));
describe("wallpaper", () => {
  it("validates defaults and retained inactive images", () => {
    expect(isWallpaperState(DEFAULT_WALLPAPER)).toBe(true);
    expect(isWallpaperState({ ...DEFAULT_WALLPAPER, image: { name: "test.png", data: "data:image/png;base64,AAAA" } })).toBe(true);
  });
  it("rejects external URLs, unknown modes and missing active images", () => {
    expect(isWallpaperState({ ...DEFAULT_WALLPAPER, active: true })).toBe(false);
    expect(isWallpaperState({ ...DEFAULT_WALLPAPER, fit: "stretch" })).toBe(false);
    expect(isWallpaperState({ ...DEFAULT_WALLPAPER, image: { name: "a", data: "https://example.com/image.png" } })).toBe(false);
  });
  it("reads and writes the native private store", async () => {
    native.read.mockResolvedValue({ value: JSON.stringify(DEFAULT_WALLPAPER) });
    expect(await readWallpaper()).toEqual(DEFAULT_WALLPAPER);
    await writeWallpaper(DEFAULT_WALLPAPER);
    expect(native.write).toHaveBeenCalledWith({ value: JSON.stringify(DEFAULT_WALLPAPER) });
  });
  it("does not write invalid state and propagates storage failure", async () => {
    await expect(writeWallpaper({ ...DEFAULT_WALLPAPER, active: true })).rejects.toThrow();
    native.write.mockRejectedValueOnce(new Error("full"));
    await expect(writeWallpaper(DEFAULT_WALLPAPER)).rejects.toThrow("full");
  });
  it("rejects invalid format and empty files before decoding", async () => {
    await expect(importWallpaper(new File(["test"], "test.svg", { type: "image/svg+xml" }))).rejects.toThrow("JPG");
    await expect(importWallpaper(new File([], "test.png", { type: "image/png" }))).rejects.toThrow("vazia");
  });
});