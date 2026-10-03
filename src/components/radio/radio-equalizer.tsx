import type { EqGains, EqStatus } from "@/hooks/use-radio-player";
import { Switch } from "@/components/ui/switch";

interface Props {
  enabled: boolean;
  status: EqStatus;
  gains: EqGains;
  onToggle: (v: boolean) => void;
  onGain: (band: keyof EqGains, value: number) => void;
}

const BANDS: { key: keyof EqGains; label: string }[] = [
  { key: "bass", label: "Graves" },
  { key: "mid", label: "Médios" },
  { key: "treble", label: "Agudos" },
];

/** Equalizer panel; processing only applies where the station allows it. */
export function RadioEqualizer({ enabled, status, gains, onToggle, onGain }: Props) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 py-3">
      <label className="flex min-h-11 items-center justify-between gap-3 rounded-2xl bg-secondary px-3 text-sm font-semibold">
        Equalizador
        <Switch checked={enabled} onCheckedChange={onToggle} aria-label="Ativar equalizador" />
      </label>
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {!enabled && "Desligado: o som sai exatamente como a rádio transmite."}
        {enabled && status === "active" && "Ativo nesta rádio."}
        {enabled && status === "unsupported" && "Esta rádio não permite ajuste de som. Ela continua tocando normalmente, sem equalização."}
        {enabled && status === "off" && "Será aplicado quando uma rádio compatível tocar."}
      </p>
      <div className="grid min-h-0 flex-1 grid-cols-3 gap-3">
        {BANDS.map(({ key, label }) => (
          <div key={key} className="flex min-h-0 flex-col items-center gap-2 rounded-2xl bg-secondary/60 p-2">
            <span className="text-xs tabular-nums text-muted-foreground">{gains[key] > 0 ? "+" : ""}{gains[key]} dB</span>
            <input
              type="range" min={-12} max={12} step={1} value={gains[key]} disabled={!enabled}
              aria-label={`${label}, em decibéis`}
              onChange={(e) => onGain(key, Number(e.target.value))}
              className="min-h-16 w-8 flex-1 cursor-pointer accent-primary disabled:opacity-40 [writing-mode:vertical-lr] [direction:rtl]"
            />
            <span className="text-xs font-semibold">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
