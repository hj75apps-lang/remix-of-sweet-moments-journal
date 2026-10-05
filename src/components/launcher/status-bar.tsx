import { Wifi, WifiOff, Bluetooth, MapPin, Mic, MicOff } from "lucide-react";
import { useClock, useOnline } from "@/hooks/use-clock";
import { Button } from "@/components/ui/button";
import { useVoiceControl } from "@/contexts/voice-control-context";

/** Top bar: only shows states the device actually reports. */
export function StatusBar() {
  const now = useClock();
  const online = useOnline();
  const voice = useVoiceControl();
  const time = now?.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) ?? "--:--";
  const date = now?.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" }) ?? "";

  return (
    <header className="grid h-10 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 text-xs sm:px-6 sm:text-sm" role="banner">
      <div className="flex min-w-0 items-center gap-2 text-muted-foreground sm:gap-4">
        <span className="flex items-center gap-1.5" aria-label={online ? "Internet conectada" : "Sem internet"}>
          {online === false ? <WifiOff className="size-4 text-destructive" /> : <Wifi className="size-4" />}
          <span className="hidden sm:inline">{online === null ? "…" : online ? "Online" : "Offline"}</span>
        </span>
        <span className="flex items-center gap-1.5 opacity-50" aria-label="Bluetooth indisponível no modo web">
          <Bluetooth className="size-4" /> —
        </span>
        <span className="hidden items-center gap-1.5 opacity-50 sm:flex" aria-label="GPS indisponível no modo web">
          <MapPin className="size-4" /> —
        </span>
      </div>
      <time className="font-display text-base sm:text-lg font-semibold tabular-nums" aria-live="off">{time}</time>
      <div className="flex min-w-0 items-center justify-end gap-2">
        <span className="truncate text-right capitalize text-muted-foreground">{date}</span>
        {voice.available && (
          <Button
            type="button"
            size="icon"
            variant={voice.listening ? "default" : "ghost"}
            onClick={voice.activate}
            disabled={voice.listening}
            aria-label={voice.listening ? "Ouvindo comando de voz" : "Ativar comando de voz"}
            title={voice.listening ? "Ouvindo…" : "Comando de voz"}
            className="size-9 shrink-0 rounded-full"
          >
            {voice.listening ? <Mic className="animate-pulse" /> : <MicOff />}
          </Button>
        )}
      </div>
    </header>
  );
}
