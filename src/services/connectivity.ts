/**
 * Bridge to the native Android plugin "SystemControls" (see android/SystemControlsPlugin.kt).
 * In a browser the plugin is absent: Wi-Fi falls back to the browser's online state,
 * Bluetooth has no browser equivalent.
 */
export interface ConnectivityState {
  wifiEnabled: boolean;
  wifiName: string;
  bluetoothEnabled: boolean;
  bluetoothDevice: string;
  /** Android system night mode, normally driven by the vehicle headlights on head units. */
  nightMode: boolean;
}

interface PluginListener { remove: () => Promise<void> | void }
interface SystemControlsPlugin {
  getState(): Promise<ConnectivityState>;
  /** Opens the system Wi-Fi panel (Android 10+ forbids apps from switching Wi-Fi directly). */
  openWifi(): Promise<void>;
  /** Asks the system to turn Bluetooth on, or opens Bluetooth settings to pair/disconnect. */
  toggleBluetooth(): Promise<void>;
  openBluetoothSettings(): Promise<void>;
  addListener(event: "stateChanged", cb: (s: ConnectivityState) => void): Promise<PluginListener> | PluginListener;
}

function plugin(): SystemControlsPlugin | null {
  if (typeof window === "undefined") return null;
  const cap = (window as unknown as { Capacitor?: { Plugins?: Record<string, unknown>; isNativePlatform?: () => boolean } }).Capacitor;
  if (!cap?.isNativePlatform?.()) return null;
  return (cap.Plugins?.["SystemControls"] as SystemControlsPlugin | undefined) ?? null;
}

export const isSystemControlsAvailable = () => plugin() !== null;
export const getConnectivity = () => plugin()?.getState() ?? Promise.resolve(null);
export const openWifi = () => plugin()?.openWifi() ?? Promise.resolve();
export const toggleBluetooth = () => plugin()?.toggleBluetooth() ?? Promise.resolve();
export const openBluetoothSettings = () => plugin()?.openBluetoothSettings() ?? Promise.resolve();

export function onConnectivityChanged(cb: (s: ConnectivityState) => void): () => void {
  const p = plugin();
  if (!p) return () => {};
  const h = Promise.resolve(p.addListener("stateChanged", cb));
  return () => { void h.then((l) => l.remove()); };
}
