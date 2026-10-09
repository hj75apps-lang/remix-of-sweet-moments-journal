import { ArrowLeft, ExternalLink, MapPin, Navigation, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigationTheme } from "@/hooks/use-navigation-theme";
import type { NavigationState } from "@/services/navigation-state";
import { formatDistance, formatDuration, formatEta } from "@/services/navigation-state";
import LiveMap from "./live-map";

interface FullscreenNavigationProps {
  state: NavigationState;
  animated: boolean;
  appLabel: string;
  onClose: () => void;
  onOpenExternal: () => void;
  onSearch: () => void;
}

export function FullscreenNavigation({
  state,
  animated,
  appLabel,
  onClose,
  onOpenExternal,
  onSearch,
}: FullscreenNavigationProps) {
  const darkMap = useNavigationTheme();
  const g = state.guidance;
  const route = state.route;
  return (
    <div className="fixed inset-0 z-[1000] bg-background text-foreground" role="dialog" aria-modal="true" aria-label="Navegação em tela cheia">
      <LiveMap dark={darkMap} position={state.position} visible animated={animated} route={route} />
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 md:p-6">
        <div className="pointer-events-auto flex items-start justify-between gap-3">
          <Button type="button" size="icon" variant="secondary" onClick={onClose} aria-label="Voltar para a Launcher" className="size-12 rounded-full bg-popover/95 shadow-card">
            <ArrowLeft className="size-6" />
          </Button>
          <div className="max-w-[min(80vw,32rem)] rounded-2xl bg-popover/95 px-4 py-3 shadow-card">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {state.online ? <Navigation className="size-4" /> : <WifiOff className="size-4" />}
              <span>{appLabel}</span>
            </div>
            {g ? (
              <>
                <p className="mt-1 text-lg font-bold">{g.title}</p>
                {g.text && <p className="text-sm">{g.text}</p>}
              </>
            ) : (
              <p className="mt-1 text-base font-semibold">{state.locating ? "Obtendo localização..." : "Nenhuma rota ativa"}</p>
            )}
          </div>
        </div>
        <div className="pointer-events-auto flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-[min(90vw,42rem)] rounded-2xl bg-popover/95 p-4 shadow-card">
            {route?.remainingDistanceMeters !== undefined && (
              <p className="text-lg font-semibold">{formatDistance(route.remainingDistanceMeters)}</p>
            )}
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {(route?.etaEpochMs || g?.etaEpochMs) && <span>Chegada {formatEta(route?.etaEpochMs ?? g?.etaEpochMs)}</span>}
              {(route?.remainingDurationSeconds || g?.remainingDurationSeconds) && <span>{formatDuration(route?.remainingDurationSeconds ?? g?.remainingDurationSeconds)}</span>}
              {state.position && <span><MapPin className="mr-1 inline size-3" />GPS ±{Math.round(state.position.accuracy)} m</span>}
            </div>
            {route?.progress !== undefined && (
              <div className="mt-3 h-1.5 w-64 max-w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${Math.round(route.progress * 100)}%` }} />
              </div>
            )}
          </div>
          <Button type="button" size="lg" onClick={state.active ? onOpenExternal : onSearch} className="min-h-14 rounded-2xl px-6 shadow-card">
            <ExternalLink className="size-5" />
            {state.active ? `Abrir ${appLabel}` : "Para onde?"}
          </Button>
        </div>
      </div>
    </div>
  );
}
