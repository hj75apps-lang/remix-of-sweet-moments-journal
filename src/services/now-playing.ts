import { useEffect, useSyncExternalStore } from "react";
import { selectMedia } from "./media-selection";
import { normalizeNativeMedia, type MediaStatus } from "./media-metadata";

/** What is playing right now, from any source. */
export interface NowPlaying {
  title: string;
  artist: string;
  album: string;
  /** App or source name: "Spotify", "Chrome", "Rádio", "USB"… */
  sourceName: string;
  /** Android package, when it comes from another app. */
  packageName: string;
  /** Image URL or data: URL; empty when the source gives none. */
  artwork: string;
  playing: boolean;
  /** Milliseconds; 0 when unknown (e.g. live radio). */
  duration: number;
  position: number;
  kind: "app" | "radio";
  status?: MediaStatus;
  stationName?: string;
  frequency?: string;
  sourceIcon?: string;
}

type Control = "play" | "pause" | "next" | "previous" | "forward" | "rewind";
type SteeringControl = Control | "toggle";
interface NativePlugin {
  getCurrent(): Promise<{ media: NowPlaying | null }>;
  control(opts: { action: Control; packageName?: string }): Promise<void>;
  updateRadioSession(opts: { title: string; artist: string; playing: boolean }): Promise<void>;
  hasPermission(): Promise<{ granted: boolean }>;
  requestPermission(): Promise<void>;
  addListener(
    event: "mediaChanged",
    cb: (d: { media: NowPlaying | null }) => void,
  ): Promise<{ remove: () => void }> | { remove: () => void };
  addListener(
    event: "steeringControl",
    cb: (d: { action: SteeringControl }) => void,
  ): Promise<{ remove: () => void }> | { remove: () => void };
}

function native(): NativePlugin | null {
  if (typeof window === "undefined") return null;
  const cap = (
    window as unknown as {
      Capacitor?: { Plugins?: Record<string, unknown>; isNativePlatform?: () => boolean };
    }
  ).Capacitor;
  if (!cap?.isNativePlatform?.()) return null;
  return (cap.Plugins?.["NowPlaying"] as NativePlugin | undefined) ?? null;
}

// In-app radio publishes here; native media sessions arrive via the plugin.
let radio:
  (NowPlaying & { controls?: { toggle: () => void; next: () => void; prev: () => void } }) | null =
  null;
let system: NowPlaying | null = null;
let lastSource: "radio" | "system" = "radio";
let permission: boolean | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export function publishRadio(v: typeof radio) {
  if (v?.playing && !radio?.playing) lastSource = "radio";
  radio = v;
  startNative();
  void native()
    ?.updateRadioSession({
      title: v?.title || v?.stationName || "",
      artist: v?.artist || "Rádio ao vivo",
      playing: v?.playing ?? false,
    })
    .catch(() => {});
  emit();
}

function current() {
  return selectMedia(radio, system, lastSource);
}

function sameMedia(a: NowPlaying | null, b: NowPlaying | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.title === b.title && a.artist === b.artist && a.album === b.album &&
    a.sourceName === b.sourceName && a.packageName === b.packageName &&
    a.artwork === b.artwork && a.playing === b.playing && a.duration === b.duration &&
    a.position === b.position && a.kind === b.kind && a.status === b.status && a.sourceIcon === b.sourceIcon;
}

function receiveSystem(media: NowPlaying | null) {
  media = normalizeNativeMedia(media);
  if (sameMedia(system, media)) return;
  if (media?.playing && (!system?.playing || media.packageName !== system.packageName)) lastSource = "system";
  system = media;
  emit();
}

let started = false;
let listenerCleanup: (() => void) | null = null;
let consumers = 0;
let refreshNative: (() => Promise<void>) | null = null;
function startNative() {
  const p = native();
  if (!p || started) return;
  started = true;
  let disposed = false;
  let pending = false;
  let revision = 0;
  const refresh = async () => {
    if (disposed || pending) return;
    pending = true;
    const requestRevision = revision;
    try {
      const access = await p.hasPermission();
      if (disposed) return;
      if (permission !== access.granted) { permission = access.granted; emit(); }
      if (!access.granted) { receiveSystem(null); return; }
      const result = await p.getCurrent();
      // A callback received during this read is newer than the captured snapshot.
      if (!disposed && requestRevision === revision) receiveSystem(result.media);
    } catch {
      /* Retry on the next refresh; keep last-known metadata. */
    } finally {
      pending = false;
    }
  };
  refreshNative = refresh;
  void refresh();
  let timer: ReturnType<typeof setInterval> | undefined;
  const onResume = () => {
    clearInterval(timer);
    timer = undefined;
    if (document.hidden) return;
    void refresh();
    timer = setInterval(() => void refresh(), 5000);
  };
  // Native events and explicit controls remain active even while hidden.
  onResume();
  window.addEventListener("focus", onResume);
  document.addEventListener("visibilitychange", onResume);
  const mediaListener = Promise.resolve(
    p.addListener("mediaChanged", (d) => {
      if (!disposed) {
        revision += 1;
        receiveSystem(d.media);
      }
    }),
  );
  const steeringListener = Promise.resolve(
    p.addListener("steeringControl", ({ action }) => {
      const controls = radio?.controls;
      if (!controls) return;
      if (action === "next") controls.next();
      else if (action === "previous") controls.prev();
      else if (action === "toggle") controls.toggle();
      else if (action === "play" && !radio?.playing) controls.toggle();
      else if (action === "pause" && radio?.playing) controls.toggle();
    }),
  );
  listenerCleanup = () => {
    disposed = true;
    clearInterval(timer);
    window.removeEventListener("focus", onResume);
    document.removeEventListener("visibilitychange", onResume);
    void mediaListener.then((listener) => listener.remove());
    void steeringListener.then((listener) => listener.remove());
    started = false;
    refreshNative = null;
  };
}

export function useNowPlaying() {
  useEffect(() => {
    consumers += 1;
    startNative();
    return () => {
      consumers -= 1;
      if (consumers === 0) listenerCleanup?.();
    };
  }, []);
  const media = useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    current,
    () => null,
  );
  const access = useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, () => permission, () => null);
  const control = async (action: Control) => {
    const selected = current();
    if (selected && selected === radio && radio.controls) {
      if (action === "next") radio.controls.next();
      else if (action === "previous") radio.controls.prev();
      else if ((action === "play" && !radio.playing) || (action === "pause" && radio.playing)) radio.controls.toggle();
      return;
    }
    await native()?.control({ action, packageName: selected?.packageName ?? "" });
    await refreshNative?.();
  };
  return {
    media,
    control,
    nativeAvailable: native() !== null,
    permission: access,
    requestPermission: () => native()?.requestPermission(),
  };
}
