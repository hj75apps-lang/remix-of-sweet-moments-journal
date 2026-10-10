import { useEffect, useState } from "react";
import { readRadioMetadata } from "@/services/radio-metadata";
import type { StreamMetadata } from "@/services/media-metadata";

/** Station-keyed metadata, paused while hidden/offline; no cross-station stale title. */
export function useRadioMetadata(stationId: string | undefined, stream: string, playing: boolean) {
  const [snapshot, setSnapshot] = useState<{ key: string; track: StreamMetadata | null } | null>(null);
  const key = `${stationId ?? ""}|${stream}`;
  useEffect(() => {
    if (!stationId || !stream || !playing) return;
    let disposed = false;
    let pending = false;
    let request: AbortController | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const read = async () => {
      if (disposed || pending || document.hidden || !navigator.onLine) return;
      pending = true;
      request = new AbortController();
      const currentRequest = request;
      try {
        const track = await readRadioMetadata(stream, currentRequest.signal);
        if (!disposed && !currentRequest.signal.aborted) {
          setSnapshot({ key, track });
          timer = setTimeout(() => void read(), track ? 45000 : 300000);
        }
      } finally { pending = false; }
    };
    const sync = () => {
      clearTimeout(timer); timer = undefined;
      if (document.hidden || !navigator.onLine) { request?.abort(); return; }
      void read();
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("online", sync); window.addEventListener("offline", sync);
    return () => {
      disposed = true; request?.abort(); clearTimeout(timer);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("online", sync); window.removeEventListener("offline", sync);
    };
  }, [stationId, stream, playing, key]);
  return snapshot?.key === key ? snapshot.track : null;
}