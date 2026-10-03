import { useCallback, useEffect, useState } from "react";
import type { HomeItem, HomeLayout, ItemSize } from "@/types/home";

const STORAGE_KEY = "sal.home-layout";
const MAX_HISTORY = 20;

export const defaultLayout: HomeLayout = {
  version: 1,
  items: [
    { id: "w-nav", type: "WIDGET", ref: "navigation", size: { w: 4, h: 4 } },
    { id: "w-media", type: "WIDGET", ref: "media", size: { w: 2, h: 2 } },
    { id: "w-weather", type: "WIDGET", ref: "weather", size: { w: 2, h: 1 } },
    { id: "w-fav", type: "WIDGET", ref: "favorites", size: { w: 2, h: 1 } },
  ],
};

function isValid(value: unknown): value is HomeLayout {
  const v = value as HomeLayout;
  return !!v && v.version === 1 && Array.isArray(v.items) && v.items.every((i) => i.id && i.type && i.ref && i.size);
}

/** Home layout state with persistence and undo. */
export function useHomeLayout() {
  const [layout, setLayout] = useState<HomeLayout>(defaultLayout);
  const [history, setHistory] = useState<HomeLayout[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (isValid(parsed)) setLayout(parsed);
      }
    } catch {
      /* corrupted layout: keep default */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  }, [layout, loaded]);

  const commit = useCallback((next: (items: HomeItem[]) => HomeItem[]) => {
    setLayout((prev) => {
      setHistory((h) => [...h.slice(-MAX_HISTORY + 1), prev]);
      return { ...prev, items: next(prev.items) };
    });
  }, []);

  return {
    items: layout.items,
    canUndo: history.length > 0,
    reorder: (from: number, to: number) =>
      commit((items) => {
        const copy = [...items];
        const [moved] = copy.splice(from, 1);
        if (moved) copy.splice(to, 0, moved);
        return copy;
      }),
    remove: (id: string) => commit((items) => items.filter((i) => i.id !== id)),
    resize: (id: string, size: ItemSize) => commit((items) => items.map((i) => (i.id === id ? { ...i, size } : i))),
    add: (item: Omit<HomeItem, "id">) => commit((items) => [...items, { ...item, id: `${item.ref}-${crypto.randomUUID().slice(0, 8)}` }]),
    reset: () => commit(() => defaultLayout.items),
    undo: () =>
      setHistory((h) => {
        const last = h.at(-1);
        if (!last) return h;
        setLayout(last);
        return h.slice(0, -1);
      }),
  };
}
