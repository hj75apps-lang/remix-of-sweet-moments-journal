import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
const { read } = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("@/services/radio-metadata", () => ({ readRadioMetadata: read }));
import { useRadioMetadata } from "./use-radio-metadata";
afterEach(() => { cleanup(); vi.resetAllMocks(); vi.restoreAllMocks(); vi.useRealTimers(); });
describe("radio metadata lifecycle", () => {
  it("cannot associate late metadata with a new station", async () => {
    let finish: ((v: { title: string; artist: string }) => void) | undefined;
    read.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; })).mockResolvedValue({ title: "New song", artist: "" });
    const { result, rerender } = renderHook(({ id }) => useRadioMetadata(id, `https://radio.example/${id}`, true), { initialProps: { id: "old" } });
    await act(async () => { rerender({ id: "new" }); });
    expect(result.current?.title).toBe("New song");
    await act(async () => finish?.({ title: "Old song", artist: "" }));
    expect(result.current?.title).toBe("New song");
  });
  it("pauses hidden/offline requests and backs off absent metadata", async () => {
    vi.useFakeTimers(); let hidden = false;
    vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
    read.mockResolvedValue(null);
    renderHook(() => useRadioMetadata("s", "https://radio.example/live", true));
    await act(async () => { await vi.advanceTimersByTimeAsync(45000); }); expect(read).toHaveBeenCalledTimes(1);
    hidden = true; act(() => document.dispatchEvent(new Event("visibilitychange")));
    await act(async () => { await vi.advanceTimersByTimeAsync(600000); }); expect(read).toHaveBeenCalledTimes(1);
    hidden = false;
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); }); expect(read).toHaveBeenCalledTimes(2);
  });
});