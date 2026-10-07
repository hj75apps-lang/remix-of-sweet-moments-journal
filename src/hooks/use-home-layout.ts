import { useCallback, useEffect, useRef, useState } from "react";
import { readStored, writeStored } from "@/services/storage";
import type { HomeItem, HomeLayout, ItemSize } from "@/types/home";

const STORAGE_KEY = "sal.home-layout";
const MAX_HISTORY = 20;

export const defaultLayout: HomeLayout = {
  version: 2,
  items: [
    { id: "w-nav", type: "WIDGET", ref: "navigation", size: { w: 4, h: 4 } },
    { id: "w-clock", type: "WIDGET", ref: "clock", size: { w: 2, h: 1 } },
    { id: "w-weather", type: "WIDGET", ref: "weather", size: { w: 2, h: 1 } },
    { id: "w-media", type: "WIDGET", ref: "media", size: { w: 2, h: 2 } },
  ],
};

function isValid(value: unknown): value is HomeLayout {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<HomeLayout>;
  if (candidate.version !== 2 || !Array.isArray(candidate.items) || candidate.items.length > 24) return false;
  const ids = new Set<string>();
  return candidate.items.every((item) => {
    if (!item || typeof item !== "object") return false;
    const entry = item as Partial<HomeItem>;
    if (typeof entry.id !== "string" || !entry.id || entry.id.length > 120 || ids.has(entry.id)) return false;
    ids.add(entry.id);
    if (typeof entry.ref !== "string") return false;
    const validRef =
      entry.type === "WIDGET"
        ? entry.ref in widgetRefs
        : entry.type === "APP"
          ? entry.ref in appRefs
          : false;
    const w = entry.size?.w;
    const h = entry.size?.h;
    return validRef &&
      typeof w === "number" && Number.isInteger(w) && w >= 1 && w <= 6 &&
      typeof h === "number" && Number.isInteger(h) && h >= 1 && h <= 4;
  });
}

const widgetRefs = { navigation: true, media: true, weather: true, favorites: true, clock: true };
const appRefs = { map: true, music: true, radio: true, phone: true, settings: true };

/** Home layout state with persistence and undo. */
export function useHomeLayout() {
  const [layout, setLayout] = useState<HomeLayout>(defaultLayout);
  const [history, setHistory] = useState<HomeLayout[]>([]);
  const [loaded, setLoaded] = useState(false);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  useEffect(() => {
    try {
      const stored = readStored(STORAGE_KEY, defaultLayout, {
        schema: 2,
        validate: isValid,
        migrateLegacy: (value) => (isValid(value) ? value : null),
      });
      setLayout(stored);
    } catch {
      /* corrupted layout: keep default */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) writeStored(STORAGE_KEY, layout, 2);
  }, [layout, loaded]);

  const commit = useCallback((next: (items: HomeItem[]) => HomeItem[]) => {
    const previous = layoutRef.current;
    const updated = { ...previous, items: next(previous.items) };
    layoutRef.current = updated;
    setHistory((entries) => [...entries.slice(-MAX_HISTORY + 1), previous]);
    setLayout(updated);
  }, []);

  const undo = useCallback(() => {
    const last = history[history.length - 1];
    if (!last) return;
    layoutRef.current = last;
    setLayout(last);
    setHistory((entries) => entries.slice(0, -1));
  }, [history]);

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
    resize: (id: string, size: ItemSize) =>
      commit((items) => items.map((i) => (i.id === id ? { ...i, size } : i))),
    add: (item: Omit<HomeItem, "id">) =>
      commit((items) => [
        ...items,
        { ...item, id: `${item.ref}-${crypto.randomUUID().slice(0, 8)}` },
      ]),
    reset: () => commit(() => defaultLayout.items),
    undo,
  };
}
