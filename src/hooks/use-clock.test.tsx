import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useClock } from "./use-clock";

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

it("updates on the next minute boundary without rendering every second", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 9, 12, 10, 30));
  const { result } = renderHook(() => useClock(60_000));
  const initial = result.current;
  act(() => vi.advanceTimersByTime(29_000));
  expect(result.current).toBe(initial);
  act(() => vi.advanceTimersByTime(1000));
  expect(result.current?.getMinutes()).toBe(11);
  expect(result.current?.getSeconds()).toBe(0);
});

it("pauses while hidden and synchronizes immediately on resume, cleaning up timers", () => {
  vi.useFakeTimers();
  let hidden = false;
  vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
  const { result, unmount } = renderHook(() => useClock(60_000));
  const initial = result.current;
  hidden = true;
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  act(() => vi.advanceTimersByTime(120_000));
  expect(result.current).toBe(initial);
  expect(vi.getTimerCount()).toBe(0);
  hidden = false;
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(result.current?.getTime()).toBe(Date.now());
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});