import { Capacitor, registerPlugin } from "@capacitor/core";
import { CapacitorUpdater } from "@capgo/capacitor-updater";
import { createOtaEngine, initialOtaState, type OtaState, type OtaAdapter } from "./ota-engine";

const policy = registerPlugin<Pick<OtaAdapter, "info" | "check" | "stage" | "claimStartup" | "confirmed">>("LauncherOta");
let state = initialOtaState;
const subscribers = new Set<() => void>();
const emit = (next: OtaState) => { state = next; for (const listener of subscribers) listener(); };
const adapter: OtaAdapter = {
  info: () => policy.info(), check: () => policy.check(), stage: (p) => policy.stage(p),
  claimStartup: () => policy.claimStartup(), confirmed: (p) => policy.confirmed(p),
  current: () => CapacitorUpdater.current(), download: (p) => CapacitorUpdater.download(p),
  set: async (p) => { await CapacitorUpdater.set(p); }, notifyReady: async () => { await CapacitorUpdater.notifyAppReady(); },
  list: () => CapacitorUpdater.list(), remove: async (p) => { await CapacitorUpdater.delete(p); },
};
const engine = createOtaEngine(adapter, emit);
let started: Promise<boolean> | undefined;
export const otaSnapshot = () => state;
export const otaServerSnapshot = () => initialOtaState;
export const subscribeOta = (listener: () => void) => { subscribers.add(listener); return () => { subscribers.delete(listener); }; };
export const nativeOta = () => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("LauncherOta");
export const checkOta = () => nativeOta() ? engine.check(navigator.onLine, !document.hidden, true) : Promise.resolve();

/** Root mount only; cleanup never clears updater/native preferences or user data. */
export function mountOta(): () => void {
  if (!nativeOta()) return () => {};
  let gone = false;
  let ready = false;
  let confirming = false;
  started ??= engine.start();
  const confirmShell = async () => {
    if (gone || ready || confirming) return;
    if (!document.querySelector('nav[aria-label="Menu principal"]')) return;
    confirming = true;
    try { await engine.ready(); ready = true; await engine.check(navigator.onLine, !document.hidden); }
    catch (error) { emit({ ...state, status: "error", message: error instanceof Error ? error.message : "Inicialização ainda não confirmada." }); }
    finally { confirming = false; }
  };
  const timer = window.setInterval(() => { if (!ready) void confirmShell(); }, 500);
  void started.then((switching) => { if (!switching) void confirmShell(); });
  const check = () => { if (ready) void engine.check(navigator.onLine, !document.hidden); };
  const periodic = window.setInterval(check, 6 * 60 * 60_000);
  const online = () => { if (ready) void engine.check(true, !document.hidden, true); };
  document.addEventListener("visibilitychange", check);
  window.addEventListener("online", online);
  return () => { gone = true; clearInterval(timer); clearInterval(periodic); document.removeEventListener("visibilitychange", check); window.removeEventListener("online", online); };
}