import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVoiceControl } from "@/contexts/voice-control-context";

/** Match the shared shell's bottom inset without reserving an empty toolbar. */
export function StatusBar() {
  return <header className="h-2 shrink-0 sm:h-4" role="banner" />;
}

/** Keep the global voice action in the dock, outside the page's top inset. */
export function VoiceControlButton() {
  const voice = useVoiceControl();
  return (
          <Button
            type="button"
            size="icon"
            variant={voice.listening ? "default" : "ghost"}
            onClick={voice.show}
            aria-label={voice.listening ? "Ouvindo comando de voz" : "Ativar comando de voz"}
            title={voice.listening ? "Ouvindo…" : "Comando de voz"}
            className="size-11 shrink-0 rounded-full md:mt-auto"
          >
            {voice.listening ? <Mic className="animate-pulse" /> : <MicOff />}
          </Button>
  );
}
