import { useEffect, useSyncExternalStore } from "react";

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
}

type Control = "play" | "pause" | "next" | "previous";
type SteeringControl = Control | "toggle";
interface NativePlugin {
  getCurrent(): Promise<{ media: NowPlaying | null }>;
  control(opts: { action: Control }): Promise<void>;
  updateRadioSession(opts: { title: string; artist: string; playing: boolean }): Promise<void>;
  hasPermission(): Promise<{ granted: boolean }>;
  requestPermission(): Promise<void>;
  addListener(event: "mediaChanged", cb: (d: { media: NowPlaying | null }) => void): Promise<{ remove: () => void }> | { remove: () => void };
  addListener(event: "steeringControl", cb: (d: { action: SteeringControl }) => void): Promise<{ remove: () => void }> | { remove: () => void };
}

function native(): NativePlugin | null {
  if (typeof window === "undefined") return null;
  const cap = (window as unknown as { Capacitor?: { Plugins?: Record<string, unknown>; isNativePlatform?: () => boolean } }).Capacitor;
  if (!cap?.isNativePlatform?.()) return null;
  return (cap.Plugins?.["NowPlaying"] as NativePlugin | undefined) ?? null;
}

// In-app radio publishes here; native media sessions arrive via the plugin.
let radio: (NowPlaying & { controls?: { toggle: () => void; next: () => void; prev: () => void } }) | null = null;
let system: NowPlaying | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export function publishRadio(v: typeof radio) {
  radio = v;
  startNative();
  void native()?.updateRadioSession({
    title: v?.title ?? "",
    artist: v?.artist || "Rádio ao vivo",
    playing: v?.playing ?? false,
  }).catch(() => {});
  emit();
}

function current() {
  // The source actually playing wins; otherwise the last known one.
  if (radio?.playing) return radio;
  if (system?.playing) return system;
  return radio ?? system;
}

let started = false;
let listenerCleanup: (() => void) | null = null;
let consumers = 0;
function startNative() {
  const p = native();
  if (!p || started) return;
  started = true;
  void p.getCurrent().then((r) => { system = r.media; emit(); }).catch(() => {});
  const mediaListener = Promise.resolve(p.addListener("mediaChanged", (d) => { system = d.media; emit(); }));
  const steeringListener = Promise.resolve(p.addListener("steeringControl", ({ action }) => {
    const controls = radio?.controls;
    if (!controls) return;
    if (action === "next") controls.next();
    else if (action === "previous") controls.prev();
    else if (action === "toggle") controls.toggle();
    else if (action === "play" && !radio?.playing) controls.toggle();
    else if (action === "pause" && radio?.playing) controls.toggle();
  }));
  listenerCleanup = () => {
    void mediaListener.then((listener) => listener.remove());
    void steeringListener.then((listener) => listener.remove());
    started = false;
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
  const media = useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, current, () => null);
  const control = (action: Control) => {
    if (media && media === radio && radio.controls) {
      if (action === "next") radio.controls.next();
      else if (action === "previous") radio.controls.prev();
      else radio.controls.toggle();
      return;
    }
    void native()?.control({ action });
  };
  return { media, control, nativeAvailable: native() !== null, requestPermission: () => native()?.requestPermission() };
}
