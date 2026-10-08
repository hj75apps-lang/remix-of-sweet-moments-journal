export interface VehiclePosition { latitude: number; longitude: number; heading: number | null; speed: number | null; accuracy: number; timestamp: number }
interface Handle { remove(): Promise<void> | void }
interface GPSPlugin {
  startLocation(): Promise<void>;
  stopLocation(): Promise<void>;
  addListener(event: "locationChanged", cb: (data: { position?: VehiclePosition; unavailable?: boolean }) => void): Promise<Handle> | Handle;
}

/** One foreground GPS subscription. Last fix is retained by the root navigation state. */
export function watchVehicle(onPosition: (p: VehiclePosition) => void, onUnavailable: () => void): () => void {
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean; Plugins?: { LauncherSystem?: GPSPlugin } } }).Capacitor;
  const p = cap?.isNativePlatform?.() ? cap.Plugins?.LauncherSystem : null;
  let stopped = false;
  let handle: Handle | null = null;
  if (p) {
    void Promise.resolve(p.addListener("locationChanged", data => {
      if (stopped) return;
      if (data.position) onPosition(data.position); else onUnavailable();
    })).then(async h => {
      if (stopped) { void Promise.resolve(h.remove()).catch(() => undefined); return; }
      handle = h;
      try { await p.startLocation(); } catch { if (!stopped) onUnavailable(); }
    }).catch(() => { if (!stopped) onUnavailable(); });
    return () => {
      stopped = true;
      if (handle) void Promise.resolve(handle.remove()).catch(() => undefined);
      void p.stopLocation().catch(() => undefined);
    };
  }
  let id: number | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;
  const start = () => {
    if (stopped) return;
    if (!navigator.geolocation) { onUnavailable(); return; }
    id = navigator.geolocation.watchPosition(fix => {
      if (stopped) return;
      onPosition({ latitude: fix.coords.latitude, longitude: fix.coords.longitude, heading: fix.coords.heading, speed: fix.coords.speed, accuracy: fix.coords.accuracy, timestamp: fix.timestamp });
    }, () => {
      if (stopped) return;
      onUnavailable();
      if (id !== undefined) navigator.geolocation.clearWatch(id);
      retry = setTimeout(start, 15000);
    }, { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 });
  };
  start();
  return () => { stopped = true; clearTimeout(retry); if (id !== undefined) navigator.geolocation.clearWatch(id); };
}
