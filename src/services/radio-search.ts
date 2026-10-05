import type { RadioStation } from "./radio-browser";
import { stationAliases } from "./radio-catalog";

/** Lowercase, strip accents and punctuation: "Rádio Antena-1" -> "radio antena 1". */
export function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const STOP = new Set(["radio", "fm", "am", "web", "a", "o", "de", "da", "do"]);

/** Optimal string alignment distance (Levenshtein + adjacent swaps). */
export function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [
    i,
    ...Array<number>(b.length).fill(0),
  ]);
  for (let j = 1; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        v = Math.min(v, d[i - 2]![j - 2]! + 1);
      d[i]![j] = v;
    }
  }
  return d[a.length]![b.length]!;
}

const allowedTypos = (len: number) => (len >= 7 ? 2 : len >= 4 ? 1 : 0);

/** Expands a query with known alternative names in both directions. */
export function expandQuery(query: string): string[] {
  const q = normalizeText(query);
  if (!q) return [];
  const out = new Set([q]);
  for (const [canonical, alts] of Object.entries(stationAliases)) {
    const names = [canonical, ...alts].map(normalizeText);
    if (names.includes(q)) names.forEach((n) => out.add(n));
  }
  return [...out];
}

function tokenScore(qt: string, words: string[], joined: string): number {
  if (joined.includes(qt)) return 3;
  let best = 0;
  for (const w of words) {
    if (w.startsWith(qt)) return 2.5;
    const limit = allowedTypos(qt.length);
    const prefix = w.slice(0, Math.max(qt.length, 1));
    if (limit && Math.min(editDistance(qt, w), editDistance(qt, prefix)) <= limit)
      best = Math.max(best, 1.5);
  }
  return best;
}

/** 0 = no match. Every meaningful query word must match a name word (typos tolerated). */
function urlKey(u: string): string {
  return u
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");
}

export function matchScore(station: RadioStation, query: string): number {
  const raw = query.trim();
  if (
    !/\s/.test(raw) &&
    /[a-z]/i.test(raw) &&
    (/:\/\//.test(raw) || /\.[a-z]{2,}(\/|$|:)/i.test(raw))
  ) {
    const key = urlKey(raw);
    const hit = [...station.sources, station.homepage ?? ""].some(
      (u) => u && urlKey(u).includes(key),
    );
    return hit ? 5 : 0;
  }
  const freq = raw.replace(",", ".").match(/^(\d{2,3}(?:\.\d)?)\s*(fm|am|mhz|khz)?$/i)?.[1];
  if (freq) {
    const f =
      station.frequency || station.name.match(/\b(\d{2,3}[.,]\d)\b/)?.[1]?.replace(",", ".") || "";
    if (
      f &&
      (f === freq || f.startsWith(freq + ".") || f.replace(".", "") === freq.replace(".", ""))
    )
      return 5;
  }
  // Frequency inside a longer query ("cultura fm 90,7"): station must carry that frequency.
  const inner = raw.replace(/(\d),(\d)/g, "$1.$2").match(/\b(\d{2,3}\.\d)\b/)?.[1];
  if (inner && raw.trim() !== inner) {
    const f =
      station.frequency ||
      station.name.replace(/(\d),(\d)/g, "$1.$2").match(/\b(\d{2,3}\.\d)\b/)?.[1] ||
      "";
    if (f !== inner) return 0;
  }
  const variants = expandQuery(query);
  if (!variants.length) return 1;
  const name = normalizeText(station.name);
  const words = name.split(" ");
  const tags = station.tags.map(normalizeText).join(" ");
  const place = normalizeText(
    [station.state, station.city ?? "", station.frequency ?? ""].join(" "),
  );
  const placeWords = place.split(" ").filter(Boolean);
  let best = 0;
  for (const v of variants) {
    const tokens = v.split(" ").filter((t) => !STOP.has(t));
    const list = tokens.length ? tokens : v.split(" ");
    let total = 0;
    let ok = true;
    for (const t of list) {
      const s = Math.max(
        tokenScore(t, words, name),
        tags.includes(t) ? 1 : 0,
        place ? tokenScore(t, placeWords, place) * 0.8 : 0,
      );
      if (!s) {
        ok = false;
        break;
      }
      total += s;
    }
    if (ok) best = Math.max(best, total / list.length + (name.startsWith(v) ? 1 : 0));
  }
  return best;
}

export interface StationFilters {
  state?: string | undefined;
  genre?: string | undefined;
  codec?: string | undefined;
}

export function applyFilters(list: RadioStation[], f: StationFilters): RadioStation[] {
  return list.filter(
    (s) =>
      (!f.state || s.state === f.state) &&
      (!f.genre || s.tags.some((t) => normalizeText(t) === normalizeText(f.genre!))) &&
      (!f.codec || s.codec.toUpperCase().startsWith(f.codec.toUpperCase())),
  );
}

/** Merge stations with the same normalized name: streams become alternative sources. */
export function mergeStations(...lists: RadioStation[][]): RadioStation[] {
  const byName = new Map<string, RadioStation>();
  for (const s of lists.flat()) {
    const key = normalizeText(s.name);
    const prev = byName.get(key);
    if (!prev) {
      byName.set(key, { ...s, sources: [...s.sources] });
      continue;
    }
    for (const src of s.sources) if (!prev.sources.includes(src)) prev.sources.push(src);
    prev.verified = prev.verified || s.verified;
    if (!prev.favicon) prev.favicon = s.favicon;
  }
  return [...byName.values()];
}

export function searchStations(
  list: RadioStation[],
  query: string,
  filters: StationFilters = {},
): RadioStation[] {
  const filtered = applyFilters(list, filters);
  if (!normalizeText(query)) return filtered;
  return filtered
    .map((s) => ({ s, score: matchScore(s, query) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.s);
}

export function facetValues(list: RadioStation[]) {
  const count = (vals: string[]) => {
    const m = new Map<string, number>();
    vals.filter(Boolean).forEach((v) => m.set(v, (m.get(v) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([v]) => v);
  };
  return {
    states: count(list.map((s) => s.state)).slice(0, 27),
    genres: count(list.flatMap((s) => s.tags.map((t) => t.toLowerCase()))).slice(0, 16),
  };
}
