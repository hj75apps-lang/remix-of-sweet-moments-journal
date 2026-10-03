import { Volume1, Volume2, VolumeX } from "lucide-react";
import { useRef } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { useRadio } from "@/contexts/radio-player-context";

/** Quick-control volume: adjusts the app's sound (Rádios Online) with mute toggle. */
export function VolumeControl() {
  const { volume, setVolume } = useRadio();
  const last = useRef(volume || 0.8);
  const pct = Math.round(volume * 100);
  const Icon = pct === 0 ? VolumeX : pct < 50 ? Volume1 : Volume2;
  const toggleMute = () => {
    if (volume > 0) { last.current = volume; setVolume(0); } else setVolume(last.current || 0.8);
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label={`Volume ${pct}%`}
          className="flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 px-1 sm:flex-row sm:gap-2 rounded-2xl bg-secondary text-[0.625rem] sm:text-sm font-medium transition active:scale-95">
          <Icon className="size-5 shrink-0 text-primary" /> <span className="truncate">Volume {pct}%</span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" className="w-72 rounded-3xl p-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={toggleMute} aria-label={pct === 0 ? "Ativar som" : "Silenciar"}
            className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary text-primary transition active:scale-95">
            <Icon className="size-5" />
          </button>
          <Slider value={[pct]} min={0} max={100} step={1} aria-label="Volume"
            onValueChange={([v]) => setVolume((v ?? 0) / 100)} className="flex-1" />
          <span className="w-10 text-right text-sm font-semibold tabular-nums">{pct}%</span>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Controla o som do app. O volume de outros apps depende do app Android.</p>
      </PopoverContent>
    </Popover>
  );
}
