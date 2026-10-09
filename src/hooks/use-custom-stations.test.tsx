import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RadioStation } from "@/services/radio-browser";
import { useCustomStations } from "./use-custom-stations";

const station = (id: string): RadioStation => ({ id, name: id, sources: ["https://radio.example/live"], favicon: "", tags: [], state: "", bitrate: 0, codec: "" });
beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe("custom station transactions", () => {
  it("retains consecutive additions and removals before React renders", () => {
    const { result } = renderHook(useCustomStations);
    act(() => {
      result.current.add(station("first"));
      result.current.add(station("second"));
      result.current.remove("first");
      result.current.add(station("third"));
    });
    expect(result.current.stations.map((s) => s.id)).toEqual(["third", "second"]);
    expect(JSON.parse(localStorage.getItem("sal.radio-custom") ?? "[]").map((s: RadioStation) => s.id)).toEqual(["third", "second"]);
  });
  it("keeps sequential edits when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("full"); });
    const { result } = renderHook(useCustomStations);
    act(() => { result.current.add(station("first")); result.current.add(station("second")); });
    expect(result.current.stations).toHaveLength(2);
  });
});