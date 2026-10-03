/**
 * Bridge to the native Android plugin "LauncherApps" (see android/LauncherAppsPlugin.kt).
 * In a normal browser the plugin is absent and `isNativeAvailable()` is false.
 */
export interface InstalledApp {
  packageName: string;
  label: string;
  /** PNG as base64 (no data: prefix). */
  icon: string;
}

interface PluginListener { remove: () => Promise<void> | void }
interface LauncherAppsPlugin {
  getInstalledApps(): Promise<{ apps: InstalledApp[] }>;
  launch(opts: { packageName: string }): Promise<void>;
  openAppInfo(opts: { packageName: string }): Promise<void>;
  addListener(event: "appsChanged", cb: () => void): Promise<PluginListener> | PluginListener;
}

function plugin(): LauncherAppsPlugin | null {
  if (typeof window === "undefined") return null;
  const cap = (window as unknown as { Capacitor?: { Plugins?: Record<string, unknown>; isNativePlatform?: () => boolean } }).Capacitor;
  if (!cap?.isNativePlatform?.()) return null;
  return (cap.Plugins?.["LauncherApps"] as LauncherAppsPlugin | undefined) ?? null;
}

export const isNativeAvailable = () => plugin() !== null;

export async function listInstalledApps(): Promise<InstalledApp[]> {
  const p = plugin();
  if (!p) return [];
  const { apps } = await p.getInstalledApps();
  return [...apps].sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}

export async function launchApp(packageName: string) {
  await plugin()?.launch({ packageName });
}

export async function openAppInfo(packageName: string) {
  await plugin()?.openAppInfo({ packageName });
}

/** Calls `cb` when an app is installed, removed or updated. Returns an unsubscribe. */
export function onAppsChanged(cb: () => void): () => void {
  const p = plugin();
  if (!p) return () => {};
  const handle = Promise.resolve(p.addListener("appsChanged", cb));
  return () => { void handle.then((h) => h.remove()); };
}
