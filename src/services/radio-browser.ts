import { verifiedStations } from "./radio-catalog";
import { mergeStations, expandQuery, normalizeText } from "./radio-search";

/** A station; `sources` lists the main stream first, then alternatives. */
export interface RadioStation {
  id: string;
  name: string;
  sources: string[];
  favicon: string;
  tags: string[];
  state: string;
  bitrate: number;
  codec: string;
  verified?: boolean | undefined;
  /** City, when known (Radio Browser has no separate city field; filled for custom stations). */
  city?: string | undefined;
  /** Dial frequency such as "106.7 FM", when known. */
  frequency?: string | undefined;
  homepage?: string | undefined;
  /** Added manually by the user. */
  custom?: boolean | undefined;
}

interface RawStation {
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  favicon: string;
  tags: string;
  state: string;
  bitrate: number;
  codec: string;
  homepage?: string;
}

/** Radio Browser mirrors, tried in order; the last one that answered goes first. */
export const RADIO_SERVERS = [
  "https://de1.api.radio-browser.info",
  "https://de2.api.radio-browser.info",
  "https://fi1.api.radio-browser.info",
  "https://nl1.api.radio-browser.info",
  "https://at1.api.radio-browser.info",
];
let preferred = 0;

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

/** GET a path from the first mirror that responds; throws only if all fail. */
export async function fetchFromMirrors<T>(path: string, fetcher: Fetcher = fetch, timeoutMs = 6000): Promise<T> {
  const order = [...RADIO_SERVERS.slice(preferred), ...RADIO_SERVERS.slice(0, preferred)];
  let lastError: unknown;
  for (const base of order) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetcher(`${base}${path}`, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as T;
      preferred = RADIO_SERVERS.indexOf(base);
      return data;
    } catch (e) {
      lastError = e;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Diretório de rádios indisponível");
}

export function normalizeRaw(raw: RawStation[]): RadioStation[] {
  return raw
    .map((s) => {
      const sources = [s.url_resolved, s.url].filter((u, i, a) => u?.startsWith("https://") && a.indexOf(u) === i);
      return {
        id: s.stationuuid,
        name: s.name.trim(),
        sources,
        favicon: s.favicon?.startsWith("https://") ? s.favicon : "",
        tags: s.tags ? s.tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 4) : [],
        state: s.state?.trim() ?? "",
        bitrate: s.bitrate,
        codec: s.codec,
        homepage: s.homepage ?? "",
        frequency: s.name.match(/\b(\d{2,3}[.,]\d)\b/)?.[1]?.replace(",", ".") ?? "",
      };
    })
    .filter((s) => s.name && s.sources.length);
}

const BASE_PARAMS = "countrycode=BR&hidebroken=true&order=clickcount&reverse=true";

export interface CatalogResult {
  stations: RadioStation[];
  /** true when the directory was unreachable and only the verified catalog is shown. */
  offlineCatalog: boolean;
}

/** Top Brazilian stations merged with the verified complementary catalog. */
export async function fetchCatalog(fetcher?: Fetcher): Promise<CatalogResult> {
  try {
    const raw = await fetchFromMirrors<RawStation[]>(`/json/stations/search?${BASE_PARAMS}&limit=500`, fetcher);
    return { stations: mergeStations(normalizeRaw(raw), verifiedStations), offlineCatalog: false };
  } catch {
    return { stations: verifiedStations, offlineCatalog: true };
  }
}

/** True when the query looks like a web address (domain or URL), not a frequency like "106.7". */
export function looksLikeUrl(query: string): boolean {
  const q = query.trim();
  return !/\s/.test(q) && /[a-z]/i.test(q) && (/:\/\//.test(q) || /\.[a-z]{2,}(\/|$|:)/i.test(q));
}

/** Server-side search by name (incl. alternative names), state/city or web address. */
export async function fetchByName(query: string, fetcher?: Fetcher): Promise<RadioStation[]> {
  const paths: string[] = [];
  if (looksLikeUrl(query)) {
    const host = query.trim().replace(/^[a-z]+:\/\//i, "").split(/[/:?#]/)[0] ?? "";
    if (host) paths.push(`/json/stations/search?${BASE_PARAMS}&limit=60&name=${encodeURIComponent(host.replace(/^www\./, "").split(".")[0] ?? host)}`);
  } else {
    const variants = expandQuery(query).filter((v) => v.length >= 3).slice(0, 3);
    const words = normalizeText(query).split(" ").filter((w) => !/^\d+$/.test(w) && !["fm","am","radio"].includes(w)).join(" ");
    if (words.length >= 3 && !variants.includes(words)) variants.push(words);
    for (const v of variants) paths.push(`/json/stations/search?${BASE_PARAMS}&limit=60&name=${encodeURIComponent(v)}`);
    if (/[a-z]{3,}/i.test(query)) paths.push(`/json/stations/search?${BASE_PARAMS}&limit=60&state=${encodeURIComponent(query.trim())}`);
  }
  const results = await Promise.allSettled(paths.map((p) => fetchFromMirrors<RawStation[]>(p, fetcher)));
  return normalizeRaw(results.flatMap((r) => (r.status === "fulfilled" ? r.value : [])));
}
