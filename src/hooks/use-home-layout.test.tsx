import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { defaultLayout, useHomeLayout } from "./use-home-layout";

describe("useHomeLayout", () => {
  beforeEach(() => localStorage.clear());

  it("persists reorder, resize and undo", () => {
    const { result } = renderHook(() => useHomeLayout());
    expect(result.current.items).toEqual(defaultLayout.items);

    act(() => result.current.reorder(0, 1));
    expect(result.current.items[1]?.ref).toBe("navigation");

    act(() => result.current.resize("w-clock", { w: 3, h: 2 }));
    expect(result.current.items.find((i) => i.id === "w-clock")?.size).toEqual({ w: 3, h: 2 });

    act(() => result.current.undo());
    expect(result.current.items.find((i) => i.id === "w-clock")?.size).toEqual({ w: 2, h: 1 });

    const stored = JSON.parse(localStorage.getItem("sal.home-layout") ?? "{}");
    expect(stored.schema).toBe(2);
  });

  it("restores a valid saved layout", () => {
    localStorage.setItem("sal.home-layout", JSON.stringify({
      schema: 2,
      data: { ...defaultLayout, items: [defaultLayout.items[2]] },
    }));
    const { result } = renderHook(() => useHomeLayout());
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]?.ref).toBe("weather");
  });

  it("ignores corrupted layouts and reset returns the defaults", () => {
    localStorage.setItem("sal.home-layout", "{bad");
    const { result } = renderHook(() => useHomeLayout());
    expect(result.current.items).toHaveLength(defaultLayout.items.length);
    act(() => result.current.remove("w-clock"));
    expect(result.current.items.some((i) => i.id === "w-clock")).toBe(false);
    act(() => result.current.reset());
    expect(result.current.items).toEqual(defaultLayout.items);
  });
  it.each(["constructor", "__proto__", "toString"])("rejects inherited registry names: %s", (ref) => {
    localStorage.setItem("sal.home-layout", JSON.stringify({ schema: 2, data: { version: 2, items: [{ id: "bad", type: "WIDGET", ref, size: { w: 2, h: 1 } }] } }));
    expect(renderHook(() => useHomeLayout()).result.current.items).toEqual(defaultLayout.items);
  });
  it("never saves a layout that the next startup would discard", () => {
    const { result } = renderHook(() => useHomeLayout());
    act(() => result.current.resize("w-clock", { w: 2, h: 5 }));
    expect(result.current.items.find((item) => item.id === "w-clock")?.size.h).toBe(1);
    for (let i = 0; i < 25; i++) act(() => result.current.add({ type: "APP", ref: "radio", size: { w: 1, h: 1 } }));
    expect(result.current.items).toHaveLength(24);
    expect(result.current.canAdd).toBe(false);
    expect(renderHook(() => useHomeLayout()).result.current.items).toHaveLength(24);
  });
});
