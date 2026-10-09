import { describe, expect, it } from "vitest";
import { customStationSchema } from "./custom-station";

const input = { name: "Rádio", url: "https://radio.example/live.mp3", frequency: "106.7 FM", city: "", state: "" };
describe("manual radio validation", () => {
  it("accepts a normal HTTPS stream", () => {
    expect(customStationSchema.safeParse(input).success).toBe(true);
  });
  it.each(["http://radio.example/live", "https://user:pass@radio.example/live", "javascript:alert(1)"])("rejects unsafe or nonpersistent input %s", (url) => {
    expect(customStationSchema.safeParse({ ...input, url }).success).toBe(false);
  });
});