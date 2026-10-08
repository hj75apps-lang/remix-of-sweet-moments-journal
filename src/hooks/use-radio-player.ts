import { useCallback, useEffect, useRef, useState } from "react";
import type Hls from "hls.js";
import type { RadioStation } from "@/services/radio-browser";
import { normalizeRadioStations, radioGain } from "@/services/radio-preferences";
import {
  reconnectDelay,
  resolveSource,
  streamKind,
  canPlayNatively,
} from "@/services/radio-stream";

export type PlayerStatus = "idle" | "loading" | "playing" | "paused" | "reconnecting" | "error";
export type EqStatus = "off" | "active" | "unsupported";
export interface EqGains {
  bass: number;
  mid: number;
  treble: number;
}

const FAV_KEY = "sal.radio-favorites";
const VOL_KEY = "sal.radio-volume";
const EQ_KEY = "sal.radio-eq";
const START_TIMEOUT_MS = 12000;

function safeSetItem(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* optional local preference */ }
}

interface Graph {
  ctx: AudioContext;
  bass: BiquadFilterNode;
  mid: BiquadFilterNode;
  treble: BiquadFilterNode;
}

/** Checks the stream host allows cross-origin reads (needed for Web Audio processing). */
async function allowsCors(url: string): Promise<boolean> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(url, { mode: "cors", signal: ctrl.signal });
    ctrl.abort();
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

interface Options {
  onNext?: () => void;
  onPrev?: () => void;
}

/**
 * Live radio engine. Plays on a plain <audio> element by default (works with any
 * host). The equalizer uses a second, CORS-enabled element routed through Web
 * Audio — only when the host allows it, so no station is ever silenced.
 */
export function useRadioPlayer(options: Options = {}) {
  const plainRef = useRef<HTMLAudioElement | null>(null);
  const eqElRef = useRef<HTMLAudioElement | null>(null);
  const graphRef = useRef<Graph | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const activeRef = useRef<HTMLAudioElement | null>(null);
  const tokenRef = useRef(0);
  const attemptRef = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelAttachRef = useRef<(() => void) | null>(null);
  const wantPlayRef = useRef(false);
  const optsRef = useRef(options);
  optsRef.current = options;

  const [station, setStation] = useState<RadioStation | null>(null);
  const stationRef = useRef<RadioStation | null>(null);
  const [status, setStatus] = useState<PlayerStatus>("idle");
  const [sourceIndex, setSourceIndex] = useState(0);
  const [audioConfirmed, setAudioConfirmed] = useState(false);
  const [volume, setVolumeState] = useState(0.8);
  const [favorites, setFavorites] = useState<RadioStation[]>([]);
  const [eqEnabled, setEqEnabled] = useState(false);
  const eqEnabledRef = useRef(false);
  const [eqStatus, setEqStatus] = useState<EqStatus>("off");
  const [gains, setGains] = useState<EqGains>({ bass: 0, mid: 0, treble: 0 });

  const stopAll = useCallback(() => {
    cancelAttachRef.current?.();
    cancelAttachRef.current = null;
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
    activeRef.current = null;
    hlsRef.current?.destroy();
    hlsRef.current = null;
    for (const el of [plainRef.current, eqElRef.current]) {
      if (!el) continue;
      el.pause();
      el.removeAttribute("src");
      el.load();
    }
  }, []);

  const ensureGraph = useCallback(() => {
    if (graphRef.current || !eqElRef.current) return graphRef.current;
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    const ctx = new Ctx();
    const src = ctx.createMediaElementSource(eqElRef.current);
    const bass = Object.assign(ctx.createBiquadFilter(), { type: "lowshelf" as BiquadFilterType });
    bass.frequency.value = 120;
    const mid = Object.assign(ctx.createBiquadFilter(), { type: "peaking" as BiquadFilterType });
    mid.frequency.value = 1000;
    mid.Q.value = 0.9;
    const treble = Object.assign(ctx.createBiquadFilter(), {
      type: "highshelf" as BiquadFilterType,
    });
    treble.frequency.value = 6000;
    src.connect(bass).connect(mid).connect(treble).connect(ctx.destination);
    graphRef.current = { ctx, bass, mid, treble };
    return graphRef.current;
  }, []);

  /** Attach one URL to an element; resolves when audio actually advances. */
  const attach = useCallback(
    async (el: HTMLAudioElement, url: string, token: number): Promise<boolean> => {
      if (token !== tokenRef.current || !wantPlayRef.current) return false;
      hlsRef.current?.destroy();
      hlsRef.current = null;
      if (streamKind(url) === "hls" && !canPlayNatively("hls", el)) {
        const { default: HlsCtor } = await import("hls.js");
        if (token !== tokenRef.current || !HlsCtor.isSupported()) return false;
        const hls = new HlsCtor({ lowLatencyMode: false });
        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(el);
      } else {
        el.src = url;
      }
      return new Promise<boolean>((resolve) => {
        let done = false;
        const finish = (ok: boolean) => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          el.removeEventListener("timeupdate", onTime);
          el.removeEventListener("error", onErr);
          if (cancelAttachRef.current === cancel) cancelAttachRef.current = null;
          resolve(ok);
        };
        const cancel = () => finish(false);
        const onTime = () => el.currentTime > 0 && finish(true);
        const onErr = () => finish(false);
        const timer = setTimeout(() => finish(false), START_TIMEOUT_MS);
        el.addEventListener("timeupdate", onTime);
        el.addEventListener("error", onErr);
        cancelAttachRef.current = cancel;
        el.play().catch(() => finish(false));
      });
    },
    [],
  );

  const start = useCallback(
    async (s: RadioStation, token: number) => {
      if (token !== tokenRef.current || !wantPlayRef.current || !plainRef.current || !eqElRef.current) return;
      stopAll();
      setStatus(attemptRef.current ? "reconnecting" : "loading");
      setAudioConfirmed(false);
      for (let i = 0; i < s.sources.length; i++) {
        const candidates = await resolveSource(s.sources[i]!);
        if (token !== tokenRef.current || !wantPlayRef.current) return;
        for (const url of candidates) {
          if (token !== tokenRef.current) return;
          setSourceIndex(i);
          let el = plainRef.current!;
          if (eqEnabledRef.current && (await allowsCors(url)) && token === tokenRef.current) {
            let graph: Graph | null = null;
            try { graph = ensureGraph(); } catch { /* unavailable Web Audio: retain plain playback */ }
            if (graph) {
              void graph.ctx.resume().catch(() => undefined);
              el = eqElRef.current!;
            }
          }
          if (token !== tokenRef.current || !wantPlayRef.current) return;
          let ok = await attach(el, url, token);
          if (!ok && el === eqElRef.current && token === tokenRef.current) {
            el.pause();
            el.removeAttribute("src");
            el.load();
            el = plainRef.current!; // processing failed: keep normal playback
            ok = await attach(el, url, token);
          }
          if (token !== tokenRef.current) return;
          if (ok) {
            activeRef.current = el;
            attemptRef.current = 0;
            setEqStatus(
              eqEnabledRef.current ? (el === eqElRef.current ? "active" : "unsupported") : "off",
            );
            setAudioConfirmed(true);
            setStatus("playing");
            return;
          }
        }
      }
      if (token !== tokenRef.current || !wantPlayRef.current) return;
      // Every source failed: bounded reconnect.
      const delay = reconnectDelay(attemptRef.current);
      if (delay === null || !wantPlayRef.current) {
        attemptRef.current = 0;
        stopAll();
        setStatus("error");
        return;
      }
      attemptRef.current += 1;
      setStatus("reconnecting");
      retryTimer.current = setTimeout(
        () => token === tokenRef.current && void start(s, token),
        delay,
      );
    },
    [attach, ensureGraph, stopAll],
  );

  const play = useCallback(
    (s: RadioStation) => {
      const token = ++tokenRef.current; // newer taps cancel older loads
      attemptRef.current = 0;
      wantPlayRef.current = true;
      stationRef.current = s;
      setStation(s);
      void start(s, token);
    },
    [start],
  );

  const reconnect = useCallback(() => {
    const s = stationRef.current;
    if (!s || !wantPlayRef.current) return;
    void start(s, ++tokenRef.current);
  }, [start]);

  const toggle = useCallback(() => {
    const s = stationRef.current;
    if (!s) return;
    if (wantPlayRef.current && status !== "error") {
      wantPlayRef.current = false;
      tokenRef.current++;
      stopAll();
      setStatus("paused");
    } else play(s); // reconnect to the live point
  }, [play, status, stopAll]);

  // Elements + stall/drop detection + storage restore.
  useEffect(() => {
    const plain = new Audio();
    const eq = new Audio();
    eq.crossOrigin = "anonymous";
    plainRef.current = plain;
    eqElRef.current = eq;
    let stallTimer: ReturnType<typeof setTimeout> | null = null;
    const onDrop = (e: Event) => {
      if (e.target !== activeRef.current || !wantPlayRef.current) return;
      setStatus("reconnecting");
      if (stallTimer) clearTimeout(stallTimer);
      stallTimer = setTimeout(
        () => reconnectRef.current(),
        e.type === "error" || e.type === "ended" ? 0 : 6000,
      );
    };
    const onResume = (e: Event) => {
      if (e.target !== activeRef.current) return;
      if (stallTimer) clearTimeout(stallTimer);
      if (wantPlayRef.current) setStatus("playing");
    };
    for (const el of [plain, eq]) {
      ["waiting", "stalled", "error", "ended"].forEach((t) => el.addEventListener(t, onDrop));
      el.addEventListener("playing", onResume);
    }
    const onOnline = () => wantPlayRef.current && reconnectRef.current();
    window.addEventListener("online", onOnline);
    try {
      const v = localStorage.getItem(VOL_KEY);
      if (v !== null && Number(v) >= 0 && Number(v) <= 1) setVolumeState(Number(v));
      const rawFavs = JSON.parse(localStorage.getItem(FAV_KEY) ?? "[]") as unknown;
      setFavorites(normalizeRadioStations(rawFavs, 200));
      const g = JSON.parse(localStorage.getItem(EQ_KEY) ?? "null") as
        (EqGains & { enabled: boolean }) | null;
      if (g && typeof g === "object") {
        setGains({ bass: radioGain(g.bass), mid: radioGain(g.mid), treble: radioGain(g.treble) });
        setEqEnabled(g.enabled === true);
        eqEnabledRef.current = g.enabled === true;
      }
    } catch {
      /* ignore corrupt storage */
    }
    return () => {
      window.removeEventListener("online", onOnline);
      if (stallTimer) clearTimeout(stallTimer);
      tokenRef.current += 1;
      wantPlayRef.current = false;
      stopAll();
      for (const el of [plain, eq]) {
        ["waiting", "stalled", "error", "ended"].forEach((type) => el.removeEventListener(type, onDrop));
        el.removeEventListener("playing", onResume);
      }
      void graphRef.current?.ctx.close().catch(() => undefined);
      graphRef.current = null;
      plainRef.current = null;
      eqElRef.current = null;
    };
  }, [stopAll]);
  const reconnectRef = useRef(reconnect);
  reconnectRef.current = reconnect;

  useEffect(() => {
    if (plainRef.current) plainRef.current.volume = volume;
    if (eqElRef.current) eqElRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    const g = graphRef.current;
    if (!g) return;
    g.bass.gain.value = gains.bass;
    g.mid.gain.value = gains.mid;
    g.treble.gain.value = gains.treble;
  }, [gains, eqStatus]);

  // Lock screen / car controls via Media Session.
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    if (station) {
      ms.metadata = new MediaMetadata({
        title: station.name,
        artist: "Rádio ao vivo",
        album: station.state || "Smart Auto Launcher",
        artwork: station.favicon ? [{ src: station.favicon, sizes: "512x512" }] : [],
      });
    }
    ms.playbackState = status === "playing" ? "playing" : status === "paused" ? "paused" : "none";
    const set = (a: MediaSessionAction, h: (() => void) | null) => {
      try {
        ms.setActionHandler(a, h);
      } catch {
        /* unsupported */
      }
    };
    set("play", () => stationRef.current && play(stationRef.current));
    set("pause", () => {
      wantPlayRef.current = false;
      tokenRef.current++;
      stopAll();
      setStatus("paused");
    });
    set("nexttrack", () => optsRef.current.onNext?.());
    set("previoustrack", () => optsRef.current.onPrev?.());
    return () => {
      set("play", null);
      set("pause", null);
      set("nexttrack", null);
      set("previoustrack", null);
    };
  }, [station, status, play, stopAll]);

  const persistEq = (enabled: boolean, g: EqGains) =>
    safeSetItem(EQ_KEY, JSON.stringify({ ...g, enabled }));

  const setEq = useCallback((enabled: boolean) => {
    setEqEnabled(enabled);
    eqEnabledRef.current = enabled;
    setGains((g) => {
      persistEq(enabled, g);
      return g;
    });
    if (!enabled) setEqStatus("off");
    if (stationRef.current && wantPlayRef.current) reconnectRef.current();
  }, []);

  const setGain = useCallback((band: keyof EqGains, value: number) => {
    setGains((g) => {
      const n = { ...g, [band]: radioGain(value) };
      persistEq(eqEnabledRef.current, n);
      return n;
    });
  }, []);

  const setVolume = useCallback((v: number) => {
    const next = Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0.8));
    setVolumeState(next);
    safeSetItem(VOL_KEY, String(next));
  }, []);

  const toggleFavorite = useCallback((s: RadioStation) => {
    setFavorites((prev) => {
      const next = prev.some((f) => f.id === s.id)
        ? prev.filter((f) => f.id !== s.id)
        : [...prev, s];
      safeSetItem(FAV_KEY, JSON.stringify(next.slice(-200)));
      return next;
    });
  }, []);

  return {
    station,
    status,
    sourceIndex,
    audioConfirmed,
    volume,
    favorites,
    eqEnabled,
    eqStatus,
    gains,
    play,
    toggle,
    setVolume,
    toggleFavorite,
    setEq,
    setGain,
  };
}
