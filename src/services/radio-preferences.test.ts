import { describe, expect, it } from "vitest";
import { normalizeRadioStations, radioGain } from "./radio-preferences";
import { searchStations } from "./radio-search";
describe("saved radio data", () => {
  it("restores old stations with safe metadata so search and playback can use them", () => {
    const stations = normalizeRadioStations([{ id: "legacy", name: "Rádio Teste", streamUrl: "https://radio.example/live" }], 200);
    expect(stations[0]).toMatchObject({ tags: [], codec: "", state: "", sources: ["https://radio.example/live"] });
    expect(searchStations(stations, "teste")).toHaveLength(1);
  });
  it("filters invalid streams and clamps persisted equalizer gains", () => {
    expect(normalizeRadioStations([{ id: "bad", name: "Bad", sources: [null, {}, "javascript:alert(1)"] }], 200)).toEqual([]);
    expect(radioGain(NaN)).toBe(0);
    expect(radioGain(100)).toBe(12);
    expect(radioGain(-100)).toBe(-12);
  });
});
