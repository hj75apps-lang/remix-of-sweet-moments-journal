import { describe, expect, it } from "vitest";
import { confirmedFrequency, metadataImage, normalizeNativeMedia, parseIcyMetadata, radioMetadata } from "./media-metadata";
const station = { id: "s", name: "Emissora", sources: ["https://radio.example/live"], favicon: "", tags: [], state: "", bitrate: 0, codec: "" };
describe("real metadata normalization", () => {
  it("does not infer a frequency from arbitrary station digits", () => {
    expect(confirmedFrequency({ name: "Radio 2026 99.9" })).toBe("");
    expect(confirmedFrequency({ name: "Emissora", frequency: "99.9" })).toBe("");
  });
  it.each([["Emissora FM 92.7", "92.7 FM"], ["Emissora 99,9 FM", "99.9 FM"], ["Rádio 850 AM", "850 AM"]])("recognizes an explicit dial designation %s", (name, result) => {
    expect(confirmedFrequency({ name })).toBe(result);
  });
  it("preserves user-supplied AM without appending FM", () => {
    expect(confirmedFrequency({ name: "Emissora", frequency: "850 AM" })).toBe("850 AM");
  });
  it("keeps ICY title intact without guessing artist", () => {
    expect(parseIcyMetadata("StreamTitle='Artist - Song';StreamUrl='';\0\0")).toEqual({ title: "Artist - Song", artist: "" });
    expect(parseIcyMetadata("StreamTitle='';")).toBeNull();
  });
  it("shows only station identity when track data is absent", () => {
    const media = radioMetadata(station, "playing", true, null);
    expect(media.title).toBe(""); expect(media.artist).toBe(""); expect(media.stationName).toBe("Emissora"); expect(media.frequency).toBe("");
  });
  it("represents buffering and failure without reporting playback", () => {
    expect(radioMetadata(station, "reconnecting", false, null).status).toBe("loading");
    expect(radioMetadata(station, "error", false, null).status).toBe("error");
  });
  it.each(["com.spotify.music", "com.google.android.youtube", "com.google.android.apps.youtube.music"])("accepts authorized session data from %s", (packageName) => {
    const media = normalizeNativeMedia({ packageName, title: "Published title", artist: "Published artist", playing: true, duration: 100, position: 200 });
    expect(media?.title).toBe("Published title"); expect(media?.position).toBe(100); expect(media?.status).toBe("playing");
  });
  it("rejects malformed bridge payloads and image schemes", () => {
    expect(normalizeNativeMedia({ title: "Fake" })).toBeNull();
    expect(normalizeNativeMedia({ packageName: "com.player", duration: NaN, position: -1 })?.position).toBe(0);
    expect(metadataImage("javascript:alert(1)")).toBe("");
    expect(metadataImage("http://insecure.example/art.jpg")).toBe("");
    expect(metadataImage("https://images.example/art.jpg")).toBe("https://images.example/art.jpg");
  });
});