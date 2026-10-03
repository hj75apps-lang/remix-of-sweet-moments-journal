import { describe, expect, it, vi } from "vitest";
import { matchScore, searchStations, mergeStations, editDistance, expandQuery, applyFilters } from "./radio-search";
import { parsePlaylist, streamKind, reconnectDelay, MAX_RECONNECTS, resolveSource } from "./radio-stream";
import { fetchFromMirrors, fetchCatalog, RADIO_SERVERS, type RadioStation } from "./radio-browser";
import { verifiedStations } from "./radio-catalog";

const st = (name: string, extra: Partial<RadioStation> = {}): RadioStation => ({
  id: name, name, sources: [`https://x/${encodeURIComponent(name)}`], favicon: "", tags: [], state: "", bitrate: 0, codec: "MP3", ...extra,
});

describe("busca tolerante", () => {
  const list = [st("Rádio Antena 1 94.7 FM"), st("Jovem Pan FM"), st("Rádio Itatiaia 95.7 FM", { tags: ["news"] }), st("Sertaneja 106.7")];

  it("ignora acentos e maiúsculas", () => {
    expect(searchStations(list, "RADIO ITATIAIA")[0]?.name).toBe("Rádio Itatiaia 95.7 FM");
  });
  it("tolera erros de digitação", () => {
    expect(searchStations(list, "itatiaa")[0]?.name).toBe("Rádio Itatiaia 95.7 FM");
    expect(searchStations(list, "sertanja")[0]?.name).toBe("Sertaneja 106.7");
    expect(editDistance("jvoem", "jovem")).toBe(1);
  });
  it("entende nomes alternativos", () => {
    expect(expandQuery("antena one")).toContain("antena 1");
    expect(searchStations(list, "antena one")[0]?.name).toBe("Rádio Antena 1 94.7 FM");
  });
  it("não devolve rádios sem relação", () => {
    expect(matchScore(st("Jovem Pan FM"), "itatiaia")).toBe(0);
  });
  it("filtra por estado, estilo e formato", () => {
    const l = [st("A", { state: "Bahia", tags: ["rock"] }), st("B", { state: "Bahia", codec: "AAC+" }), st("C", { state: "Ceará" })];
    expect(applyFilters(l, { state: "Bahia" }).map((s) => s.name)).toEqual(["A", "B"]);
    expect(applyFilters(l, { genre: "Rock" }).map((s) => s.name)).toEqual(["A"]);
    expect(applyFilters(l, { codec: "AAC" }).map((s) => s.name)).toEqual(["B"]);
  });
  it("junta emissoras repetidas como fontes alternativas", () => {
    const m = mergeStations([st("Rádio X", { sources: ["https://a"] })], [st("radio x", { sources: ["https://b"] })]);
    expect(m).toHaveLength(1);
    expect(m[0]?.sources).toEqual(["https://a", "https://b"]);
  });
});

describe("troca de servidores", () => {
  it("usa o próximo servidor quando um falha", async () => {
    const calls: string[] = [];
    const fetcher = vi.fn(async (url: string) => {
      calls.push(url);
      if (url.startsWith(RADIO_SERVERS[0]!)) throw new Error("down");
      return new Response(JSON.stringify([{ ok: 1 }]));
    });
    await expect(fetchFromMirrors("/json/x", fetcher)).resolves.toEqual([{ ok: 1 }]);
    expect(calls).toHaveLength(2);
  });
  it("cai no catálogo verificado quando todos falham", async () => {
    const res = await fetchCatalog(async () => { throw new Error("down"); });
    expect(res.offlineCatalog).toBe(true);
    expect(res.stations).toEqual(verifiedStations);
    expect(verifiedStations.every((s) => s.sources[0]?.startsWith("https://"))).toBe(true);
  });
});

describe("reprodução", () => {
  it("reconhece HLS, playlists e streams diretos", () => {
    expect(streamKind("https://a/live.m3u8?t=1")).toBe("hls");
    expect(streamKind("https://a/radio.pls")).toBe("playlist");
    expect(streamKind("https://a/stream;")).toBe("direct");
  });
  it("lê playlists M3U e PLS", () => {
    expect(parsePlaylist("#EXTM3U\n#EXTINF:-1,X\nhttps://s1/live\n")).toEqual(["https://s1/live"]);
    expect(parsePlaylist("[playlist]\nFile1=https://s2/a\nFile2=http://s3/b\n")).toEqual(["https://s2/a", "http://s3/b"]);
  });
  it("descarta fontes inseguras ao resolver playlist", async () => {
    const f = (async () => new Response("File1=http://insegura\nFile2=https://segura")) as typeof fetch;
    await expect(resolveSource("https://a/x.pls", f)).resolves.toEqual(["https://segura"]);
  });
  it("limita as reconexões", () => {
    expect([0, 1, 2].map(reconnectDelay)).toEqual([1000, 2000, 4000]);
    expect(reconnectDelay(MAX_RECONNECTS)).toBeNull();
  });
});

import { matchScore as ms } from "./radio-search";
import { describe as d2, it as i2, expect as e2 } from "vitest";
d2("extended search", () => {
  const st = { id: "x", name: "Sertaneja 106.7", sources: ["https://stream.sertaneja.com.br/live"], favicon: "", tags: [], state: "Paraná", city: "Londrina", bitrate: 0, codec: "MP3", homepage: "https://sertaneja.com.br" };
  i2("by frequency", () => e2(ms(st, "106.7")).toBeGreaterThan(0));
  i2("by url", () => e2(ms(st, "sertaneja.com.br")).toBeGreaterThan(0));
  i2("by city", () => e2(ms(st, "londrina")).toBeGreaterThan(0));
  i2("by state", () => e2(ms(st, "parana")).toBeGreaterThan(0));
  i2("no false url hit", () => e2(ms(st, "outra.com")).toBe(0));
});
