import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useNavigationTheme } from "./use-navigation-theme";
vi.mock("@/hooks/use-theme", () => ({ useTheme: () => ({ preferredMode: "light" }) }));
afterEach(() => { cleanup(); vi.useRealTimers(); });
it("changes at 18:00 and restores preference at 06:00 while mounted", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 9, 17, 59, 59));
  const { result } = renderHook(() => useNavigationTheme());
  expect(result.current).toBe(false);
  act(() => vi.advanceTimersByTime(1000));
  expect(result.current).toBe(true);
  vi.setSystemTime(new Date(2026, 9, 10, 5, 59, 59));
  act(() => window.dispatchEvent(new Event("focus")));
  act(() => vi.advanceTimersByTime(1000));
  expect(result.current).toBe(false);
});
it("refreshes immediately after returning to the app", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 9, 12));
  const { result } = renderHook(() => useNavigationTheme());
  vi.setSystemTime(new Date(2026, 9, 9, 19));
  act(() => window.dispatchEvent(new Event("focus")));
  expect(result.current).toBe(true);
});
it("does not render repeatedly while the map theme is unchanged", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 9, 12));
  let renders = 0;
  renderHook(() => { renders += 1; return useNavigationTheme(); });
  const initial = renders;
  act(() => vi.advanceTimersByTime(5 * 60_000));
  expect(renders).toBe(initial);
});
