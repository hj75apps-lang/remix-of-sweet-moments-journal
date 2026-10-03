import { useEffect, useState } from "react";
import { Bluetooth, BluetoothOff, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getConnectivity, isSystemControlsAvailable, onConnectivityChanged, openWifi, toggleBluetooth,
  type ConnectivityState,
} from "@/services/connectivity";

const btn = "flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 px-1 sm:flex-row sm:gap-2 rounded-2xl text-[0.625rem] sm:text-sm font-medium transition active:scale-95";

function useConnectivity() {
  const [native, setNative] = useState<ConnectivityState | null>(null);
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    void getConnectivity().then(setNative).catch(() => setNative(null));
    const stop = onConnectivityChanged(setNative);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); stop(); };
  }, []);
  return { native, online };
}

/** Wi-Fi and Bluetooth quick controls: real system state on Android, honest fallback in the browser. */
export function ConnectivityControls() {
  const { native, online } = useConnectivity();
  const wifiOn = native ? native.wifiEnabled : online;
  const wifiLabel = native ? (native.wifiEnabled ? native.wifiName || "Wi-Fi ligado" : "Wi-Fi desligado") : online ? "Online" : "Sem internet";
  const btOn = native?.bluetoothEnabled ?? false;
  const btLabel = native ? (native.bluetoothEnabled ? native.bluetoothDevice || "Bluetooth ligado" : "Bluetooth desligado") : "Bluetooth";

  const onWifi = () => {
    if (isSystemControlsAvailable()) void openWifi().catch(() => toast.error("Não foi possível abrir o Wi-Fi."));
    else toast.info(online ? "Conectado à internet. Ligar ou trocar de Wi-Fi só funciona no app Android." : "Sem internet. Ligar ou trocar de Wi-Fi só funciona no app Android.");
  };
  const onBt = () => {
    if (isSystemControlsAvailable()) void toggleBluetooth().catch(() => toast.error("Não foi possível abrir o Bluetooth."));
    else toast.info("Ligar o Bluetooth e conectar aparelhos só funciona no app Android.");
  };
  const WifiIcon = wifiOn ? Wifi : WifiOff;
  const BtIcon = native && !btOn ? BluetoothOff : Bluetooth;

  return (
    <>
      <button type="button" onClick={onBt} aria-pressed={native ? btOn : undefined} aria-label={`Bluetooth: ${btLabel}`}
        className={cn(btn, btOn ? "bg-primary text-primary-foreground" : "bg-secondary")}>
        <BtIcon className={cn("size-5 shrink-0", !btOn && "text-primary")} /> <span className="truncate">{btLabel}</span>
      </button>
      <button type="button" onClick={onWifi} aria-pressed={native ? wifiOn : undefined} aria-label={`Wi-Fi: ${wifiLabel}`}
        className={cn(btn, native && wifiOn ? "bg-primary text-primary-foreground" : "bg-secondary")}>
        <WifiIcon className={cn("size-5 shrink-0", !(native && wifiOn) && "text-primary")} /> <span className="truncate">{wifiLabel}</span>
      </button>
    </>
  );
}
