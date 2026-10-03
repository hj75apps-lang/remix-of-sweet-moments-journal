import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface DiscoveredStation {
  name: string;
  homepage: string;
  favicon: string;
  sources: string[];
  /** "blocked" when the site refused automated access (e.g. bot protection). */
  status: "found" | "none" | "blocked";
}

const UA = "Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36";
const STREAM_RE = /(stream|:\d{4,5}\/|\.mp3|\.aac|\.m3u8|\.pls|\.m3u\b|listen|live|icecast|shoutcast|zeno\.fm|;)/i;
const ASSET_RE = /\.(css|js|png|jpe?g|gif|svg|webp|woff2?|ico|json|xml)(\?|$)|fonts\.|facebook|instagram|twitter|whatsapp|youtube|google|spreaker|\/feed\//i;
const PLAYER_RE = /(player|popup|ouvir|ao-?vivo|radio)/i;

async function get(url: string, ms = 8000): Promise<Response | null> {
  try {
    return await fetch(url, { headers: { "user-agent": UA, accept: "*/*" }, redirect: "follow", signal: AbortSignal.timeout(ms) });
  } catch { return null; }
}

function links(html: string, base: string): string[] {
  const out = new Set<string>();
  const re = /(?:https?:)?\/\/[^\s"'<>()\\]+|(?:src|href)=["']([^"']+)["']/gi;
  for (const m of html.matchAll(re)) {
    const raw = (m[1] ?? m[0]).replace(/&amp;/g, "&").replace(/\\\//g, "/");
    try { out.add(new URL(raw, base).href); } catch { /* ignore */ }
  }
  return [...out];
}

/** Confirms the URL answers with audio (or an HLS/playlist manifest). */
async function isAudio(url: string): Promise<boolean> {
  const res = await get(url, 6000);
  if (!res?.ok) { await res?.body?.cancel().catch(() => {}); return false; }
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
  const parts = t.replace(/&#8211;|&amp;/g, "-").split(/\s+[|–—-]\s+/).map((p) => p.trim()).filter((p) => p && !GENERIC.test(p));
  return parts[0] ?? t.trim();
}

/** Finds the live stream of a radio from its website (scans the page and its player pages). */
export const discoverStream = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ url: z.string().trim().min(4).max(300) }).parse(d))
  .handler(async ({ data }): Promise<DiscoveredStation> => {
    const start = /^https?:\/\//i.test(data.url) ? data.url : `https://${data.url}`;
    let origin: URL;
    try { origin = new URL(start); } catch { return { name: "", homepage: start, favicon: "", sources: [], status: "none" }; }
    if (!/\./.test(origin.hostname) || /^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(origin.hostname)) {
      return { name: "", homepage: start, favicon: "", sources: [], status: "none" };
    }

    const first = await get(origin.href);
    const html = first?.ok ? await first.text() : "";
    if (!html || /cf-error-details|Attention Required|cf-chl/i.test(html)) {
      return { name: origin.hostname, homepage: origin.href, favicon: "", sources: [], status: "blocked" };
    }
    const siteName = pickTitle(meta(html, /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)/i));
    const name = ((siteName && !GENERIC.test(siteName) ? siteName : "") ||
      pickTitle(meta(html, /<title[^>]*>([^<]+)/i))).slice(0, 80) || origin.hostname;
    const favicon = meta(html, /<meta[^>]+property=["']og:image["'][^>]+content=["'](https:[^"']+)/i);

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
    const subs = await Promise.all([...pages].slice(0, 8).map(async (p) => {
      const r = await get(p, 6000);
      return r?.ok && /html|text/.test(r.headers.get("content-type") ?? "") ? { p, h: await r.text() } : null;
    }));
    for (const s of subs) if (s) collect(s.h.slice(0, 400_000), s.p);

    const list = [...candidates].filter((u) => u.startsWith("https://")).slice(0, 15);
    const checks = await Promise.all(list.map(async (u) => ((await isAudio(u)) ? u : null)));
    const sources = checks.filter((u): u is string => !!u).slice(0, 4);
    return { name, homepage: origin.href, favicon, sources, status: sources.length ? "found" : "none" };
  });
