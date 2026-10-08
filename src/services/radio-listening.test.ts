import { beforeEach, describe, expect, it } from "vitest";
import { addRadioListening, rankRadioStations, readRadioListening, saveRadioListening } from "./radio-listening";
import type { RadioStation } from "./radio-browser";

const now = Date.UTC(2026, 9, 8);
const station = (id: string, name = id): RadioStation => ({ id, name, sources: ["https://example.com/live"], favicon: "", tags: [], state: "", bitrate: 0, codec: "MP3" });
const a = station("A"), b = station("B"), c = station("C");
describe("recent radio listening", () => {
  beforeEach(() => localStorage.clear());
  it("puts most-listened first, then recency, keeping unheard order", () => {
    let history = addRadioListening([], b, 60, now - 1000);
    history = addRadioListening(history, c, 90, now);
    expect(rankRadioStations([a, b, c], history, now)).toEqual([c, b, a]);
    history = addRadioListening(history, b, 30, now + 1000);
    expect(rankRadioStations([a, b, c], history, now + 1000)).toEqual([b, c, a]);
    expect(rankRadioStations([c, a, b], [], now)).toEqual([c, a, b]);
  });
  it("expires listening older than thirty days", () => {
    const history = addRadioListening([], b, 9999, now - 31 * 86400000);
    expect(rankRadioStations([a, b], history, now)).toEqual([a, b]);
  });
  it("survives reopen and matches changed directory ids by name", () => {
    saveRadioListening(addRadioListening([], b, 50, now));
    const updated = station("new-id", "B");
    expect(rankRadioStations([a, updated], readRadioListening(now), now)).toEqual([updated, a]);
  });
  it("does not bypass filters or mutate the input list", () => {
    const history = addRadioListening([], c, 50, now);
    const filtered = [a, b];
    expect(rankRadioStations(filtered, history, now)).toEqual([a, b]);
    expect(filtered).toEqual([a, b]);
  });
  it("rejects corrupt saved data and invalid duration", () => {
    localStorage.setItem("sal.radio-listening", JSON.stringify({ schema: 1, data: [{ key: "B", seconds: "bad" }] }));
    expect(readRadioListening(now)).toEqual([]);
    expect(addRadioListening([], b, NaN, now)).toEqual([]);
  });
});