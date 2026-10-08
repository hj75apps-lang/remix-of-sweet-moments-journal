import { useLauncherSettings } from "@/hooks/use-launcher-settings";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVoiceControl } from "@/contexts/voice-control-context";

/** Top bar: minimized without wifi, bluetooth, date and time. */
export function StatusBar() {
  const { settings } = useLauncherSettings();
  const voice = useVoiceControl();

  return (
    <header
      className="flex h-12 shrink-0 items-center justify-end gap-2 px-2 text-xs sm:h-14 sm:px-4 sm:text-sm"
      role="banner"
    >
      <div className="flex min-w-0 items-center justify-end gap-2">
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
