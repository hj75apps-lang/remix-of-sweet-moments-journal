import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ native: true, request: vi.fn(), web: vi.fn() }));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => mocks.native },
  registerPlugin: () => ({ request: mocks.request }),
}));
vi.mock("@/lib/stream-discovery.functions", () => ({ discoverStream: mocks.web }));

import { discoverRadioWebsite, fetchRadioPlaylist } from "./radio-network";
import { resolveSource } from "./radio-stream";

describe("Rádio Online no APK", () => {
  beforeEach(() => {
    mocks.native = true;
    mocks.request.mockReset();
    mocks.web.mockReset();
  });

  it("descobre o stream no Android sem chamar o servidor web", async () => {
    mocks.request.mockImplementation(async ({ url, probe }: { url: string; probe: boolean }) => ({
      status: 200,
      contentType: probe ? "audio/mpeg" : "text/html",
      body: url === "https://radio.example/"
        ? '<title>Rádio Real</title><audio src="https://stream.example/live.mp3"></audio>'
        : "",
    }));
    const result = await discoverRadioWebsite("radio.example");
    expect(result.status).toBe("found");
    expect(result.sources).toEqual(["https://stream.example/live.mp3"]);
    expect(mocks.web).not.toHaveBeenCalled();
    expect(mocks.request).toHaveBeenCalledWith({
      url: "https://stream.example/live.mp3", timeout: 6000, probe: true,
    });
  });

  it("resolve playlists no APK sem CORS preservando apenas HTTPS", async () => {
    mocks.request.mockResolvedValue({ status: 200, contentType: "audio/x-scpls",
      body: "File1=https://stream.example/live\nFile2=http://stream.example/unsafe" });
    expect(await resolveSource("https://radio.example/list.pls")).toEqual([
      "https://stream.example/live",
    ]);
  });

  it("mantém a busca por site existente no navegador", async () => {
    mocks.native = false;
    mocks.web.mockResolvedValue({ status: "found", sources: ["https://stream.example/live"] });
    await discoverRadioWebsite("radio.example");
    expect(mocks.web).toHaveBeenCalledWith({ data: { url: "radio.example" } });
    expect(mocks.request).not.toHaveBeenCalled();
  });

  it("não encaminha endereços locais ao plugin Android", async () => {
    await expect(fetchRadioPlaylist("https://127.0.0.1/list.pls")).rejects.toThrow();
    expect(mocks.request).not.toHaveBeenCalled();
  });
});