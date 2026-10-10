import { Capacitor } from "@capacitor/core";
import { network } from "./radio-network";
import { isPublicHttps } from "./stream-discovery";
import { parseIcyMetadata, type StreamMetadata } from "./media-metadata";

const MAX_BYTES = 256000;

/** Optional, bounded side-read. Never touches the actual audio or its CORS settings. */
export async function readRadioMetadata(url: string, signal: AbortSignal): Promise<StreamMetadata | null> {
  if (!isPublicHttps(url) || signal.aborted) return null;
  // Playlists contain no inline ICY blocks. Do not repeatedly download them.
  if (/\.(m3u8?|pls)(?:[?#]|$)/i.test(url)) return null;
  if (Capacitor.isNativePlatform()) {
    try {
      const result = await network.readMetadata({ url });
      return signal.aborted ? null : parseIcyMetadata(result.block);
    } catch { return null; }
  }
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal.addEventListener("abort", cancel, { once: true });
  const timeout = setTimeout(cancel, 8000);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const res = await fetch(url, { mode: "cors", credentials: "omit", cache: "no-store", headers: { "Icy-MetaData": "1" }, signal: controller.signal });
    const interval = Number(res.headers.get("icy-metaint"));
    if (!res.ok || !Number.isInteger(interval) || interval < 1 || interval > MAX_BYTES - 4081 || !res.body) return null;
    reader = res.body.getReader();
    let total = 0;
    let remaining = interval;
    let length: number | null = null;
    const block: number[] = [];
    while (!controller.signal.aborted && total < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const byte of value) {
        if (++total > MAX_BYTES) return null;
        if (remaining > 0) { remaining -= 1; continue; }
        if (length === null) { length = byte * 16; if (!length) return null; continue; }
        block.push(byte);
        if (block.length === length) return parseIcyMetadata(new TextDecoder().decode(new Uint8Array(block)));
      }
    }
  } catch { /* CORS or absent metadata never blocks listening. */ }
  finally {
    cancel(); clearTimeout(timeout); signal.removeEventListener("abort", cancel);
    await reader?.cancel().catch(() => undefined);
  }
  return null;
}