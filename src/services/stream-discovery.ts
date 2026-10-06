export interface DiscoveredStation {
  name: string;
  homepage: string;
  favicon: string;
  sources: string[];
  /** "blocked" when the site refused automated access (e.g. bot protection). */
  status: "found" | "none" | "blocked";
}

const STREAM_RE =
  /(stream|:\d{4,5}\/|\.mp3|\.aac|\.m3u8|\.pls|\.m3u\b|listen|live|icecast|shoutcast|zeno\.fm|;)/i;
const ASSET_RE =
  /\.(css|js|png|jpe?g|gif|svg|webp|woff2?|ico|json|xml)(\?|$)|fonts\.|facebook|instagram|twitter|whatsapp|youtube|google|spreaker|\/feed\//i;
const PLAYER_RE = /(player|popup|ouvir|ao-?vivo|radio)/i;

export function isPublicHttps(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) return false;
  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host.includes(".") || host === "localhost" || host.endsWith(".local")) return false;
  if (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:"))
    return false;
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return !/^\d+$/.test(host);
  const octets = ipv4.slice(1).map(Number);
  if (octets.some((part) => part > 255)) return false;
  const [a = 0, b = 0] = octets;
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

export type DiscoveryRequest = (url: string, timeout?: number, probe?: boolean) => Promise<Response | null>;

function links(html: string, base: string): string[] {
  const out = new Set<string>();
  const re = /(?:https?:)?\/\/[^\s"'<>()\\]+|(?:src|href)=["']([^"']+)["']/gi;
  for (const m of html.matchAll(re)) {
    const raw = (m[1] ?? m[0]).replace(/&amp;/g, "&").replace(/\\\//g, "/");
    try {
      out.add(new URL(raw, base).href);
    } catch {
      /* ignore */
    }
  }
  return [...out];
}

/** Confirms the URL answers with audio (or an HLS/playlist manifest). */
async function isAudio(url: string, get: DiscoveryRequest): Promise<boolean> {
  const res = await get(url, 6000, true);
  if (!res?.ok) {
    await res?.body?.cancel().catch(() => {});
    return false;
  }
  const type = (res.headers.get("content-type") ?? "").toLowerCase();
  await res.body?.cancel().catch(() => {});
  return /audio|mpegurl|ogg|aac|octet-stream|scpls/.test(type);
}

function meta(html: string, key: RegExp): string {
  return html.match(key)?.[1]?.trim() ?? "";
}

const GENERIC = /^(in[ií]cio|home|p[aá]gina inicial|ao vivo|bem[- ]vindo.*)$/i;
/** "Inicio - Rádio Executiva" -> "Rádio Executiva". */
function pickTitle(t: string): string {
  const parts = t
    .replace(/&#8211;|&amp;/g, "-")
    .split(/\s+[|–—-]\s+/)
    .map((p) => p.trim())
    .filter((p) => p && !GENERIC.test(p));
  return parts[0] ?? t.trim();
}

export async function discoverWebsite(input: string, get: DiscoveryRequest): Promise<DiscoveredStation> {
    const start = /^https?:\/\//i.test(input) ? input : `https://${input}`;
    let origin: URL;
    try {
      origin = new URL(start);
    } catch {
      return { name: "", homepage: start, favicon: "", sources: [], status: "none" };
    }
    if (!isPublicHttps(origin.href)) {
      return { name: "", homepage: start, favicon: "", sources: [], status: "none" };
    }

    const first = await get(origin.href);
    const html = first?.ok ? await first.text() : "";
    if (!html || /cf-error-details|Attention Required|cf-chl/i.test(html)) {
      return {
        name: origin.hostname,
        homepage: origin.href,
        favicon: "",
        sources: [],
        status: "blocked",
      };
    }
    const siteName = pickTitle(
      meta(html, /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)/i),
    );
    const name =
      (
        (siteName && !GENERIC.test(siteName) ? siteName : "") ||
        pickTitle(meta(html, /<title[^>]*>([^<]+)/i))
      ).slice(0, 80) || origin.hostname;
    const favicon = meta(
      html,
      /<meta[^>]+property=["']og:image["'][^>]+content=["'](https:[^"']+)/i,
    );

    const candidates = new Set<string>();
    const pages = new Set<string>();
    const collect = (h: string, base: string) => {
      for (const l of links(h, base)) {
        if (ASSET_RE.test(l) && !/\.m3u8|\.pls|\.m3u/i.test(l)) continue;
        if (STREAM_RE.test(l) && !/\.html?$/i.test(l)) candidates.add(l);
        else if (PLAYER_RE.test(l) && pages.size < 8) pages.add(l);
      }
    };
    collect(html, origin.href);
    // Player pages often hold the stream address.
    const subs = await Promise.all(
      [...pages].slice(0, 4).map(async (p) => {
        const r = await get(p, 6000);
        return r?.ok && /html|text/.test(r.headers.get("content-type") ?? "")
          ? { p, h: await r.text() }
          : null;
      }),
    );
    for (const s of subs) if (s) collect(s.h.slice(0, 400_000), s.p);

    const list = [...candidates].filter(isPublicHttps).slice(0, 8);
    const checks = await Promise.all(list.map(async (u) => ((await isAudio(u, get)) ? u : null)));
    const sources = checks.filter((u): u is string => !!u).slice(0, 4);
    return {
      name,
      homepage: origin.href,
      favicon,
      sources,
      status: sources.length ? "found" : "none",
    };
}
