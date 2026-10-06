import { describe, expect, it } from "vitest";
import { selectMedia } from "./media-selection";

describe("active media selection", () => {
  const radio = { playing: false, title: "Radio" };
  const spotify = { playing: true, title: "Spotify" };
  it("shows external playback instead of retained radio", () => {
    expect(selectMedia(radio, spotify, "radio")).toBe(spotify);
  });
  it("prioritizes the external session when both report playback", () => {
    expect(selectMedia({ ...radio, playing: true }, spotify, "system")).toBe(spotify);
  });
  it("shows online radio while the other player is paused", () => {
    const playingRadio = { ...radio, playing: true };
    expect(selectMedia(playingRadio, { ...spotify, playing: false }, "system")).toBe(playingRadio);
  });
  it("preserves the last source on pause", () => {
    const paused = { ...spotify, playing: false };
    expect(selectMedia(radio, paused, "system")).toBe(paused);
  });
  it("handles missing sources", () => {
    expect(selectMedia(null, null, "system")).toBeNull();
    expect(selectMedia(radio, null, "system")).toBe(radio);
  });
});