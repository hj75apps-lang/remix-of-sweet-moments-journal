import { useTheme } from "@/hooks/use-theme";
import {
  Navigation, Music, CloudSun, LayoutGrid, Play, SkipBack, SkipForward,
  Volume2, Sun, Moon, Bluetooth, Wifi, MapPin, Map, Radio, Phone, Settings,
} from "lucide-react";
import { WidgetCard, UnavailableState } from "./widget-card";
import { cn } from "@/lib/utils";
import { VolumeControl } from "./volume-control";
import { ConnectivityControls } from "./connectivity-controls";

export function NavigationWidget() {
  return (
    <WidgetCard title="Navegação" icon={<Navigation className="size-4" />} className="bg-[image:var(--gradient-map)]">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div className="grid size-20 place-items-center rounded-full bg-primary/15 text-primary">
          <MapPin className="size-10" />
        </div>
        <UnavailableState message="Nenhum app de navegação conectado" hint="O mapa aparece quando o GPS e um provedor de mapas estiverem disponíveis." />
        <button type="button" className="min-h-14 rounded-2xl bg-primary px-8 font-semibold text-primary-foreground transition active:scale-95">
          Escolher app de navegação
        </button>
      </div>
    </WidgetCard>
  );
}

export { MediaWidget } from "./media-widget";
export { WeatherWidget } from "./weather-widget";

const favoriteApps = [
  { label: "Mapa", icon: Map },
  { label: "Rádios Online", icon: Radio },
  { label: "Telefone", icon: Phone },
  { label: "Ajustes", icon: Settings },
];

export function FavoriteAppsWidget() {
  return (
    <WidgetCard title="Apps favoritos" icon={<LayoutGrid className="size-4" />}>
      <div className="grid min-h-0 flex-1 grid-cols-4 gap-2">
        {favoriteApps.map(({ label, icon: Icon }) => (
          <button key={label} type="button" aria-label={`Abrir ${label}`}
            className="flex h-full min-h-0 min-w-0 flex-col items-center justify-center gap-[min(0.25rem,5cqh)] rounded-2xl bg-secondary text-[clamp(0.625rem,20cqh,0.75rem)] font-medium leading-tight transition hover:bg-accent active:scale-95">
            <Icon className="size-[clamp(1rem,35cqh,1.5rem)] shrink-0 text-primary" />
            <span className="max-w-full truncate px-1">{label}</span>
          </button>
        ))}
      </div>
    </WidgetCard>
  );
}

export function QuickControls() {
  const { mode, toggle } = useTheme();
  const dark = mode === "dark";
  return (
    <section aria-label="Controles rápidos" className="grid shrink-0 grid-cols-4 gap-2 rounded-3xl bg-card p-2 sm:gap-3">
      <VolumeControl />
      <ConnectivityControls />
      <button type="button" onClick={toggle} aria-pressed={dark} aria-label={dark ? "Mudar para modo diurno" : "Mudar para modo noturno"}
        className="flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 px-1 sm:flex-row sm:gap-2 rounded-2xl bg-secondary text-[0.625rem] sm:text-sm font-medium transition active:scale-95">
        {dark ? <Moon className="size-5 text-primary" /> : <Sun className="size-5 text-primary" />}
        <span className="truncate">Modo {dark ? "noturno" : "diurno"}</span>
      </button>
    </section>
  );
}
