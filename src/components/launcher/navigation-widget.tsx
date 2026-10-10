import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { Maximize2, MapPin, Navigation, Search, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLauncherSettings } from "@/hooks/use-launcher-settings";
import { useNavigationTheme } from "@/hooks/use-navigation-theme";
import { useNavigationState } from "@/contexts/navigation-context";
import { errorMessage, startNavigation } from "@/services/launcher-system";
import { useNavigationApps } from "@/services/navigation-apps";
import { formatDistance, formatDuration } from "@/services/navigation-state";

import LiveMap from "./live-map";

export function NavigationWidget() {
  const { settings, update } = useLauncherSettings();
  const { apps, ready } = useNavigationApps();
  const state = useNavigationState();
  const { acquireLocation } = state;
  const darkMap = useNavigationTheme();
  const [destination, setDestination] = useState("");
  const [opening, setOpening] = useState(false);
  const pending = useRef(false);
  const selected = apps.find((app) => app.id === settings.navApp);

  // The home map owns one foreground subscription; the root retains the last fix.
  useEffect(() => acquireLocation(), [acquireLocation]);

  const [fullscreen, setFullscreen] = useState(false);

  const openNavigator = async (target: string) => {
    if (pending.current || !ready) return;
    if (settings.navApp !== "system" && !selected) {
      toast.error("Escolha um navegador instalado nos ajustes.");
      return;
    }
    if (settings.navApp === "system") {
      toast.error("Escolha um navegador específico nos ajustes.");
      return;
    }
    pending.current = true;
    setOpening(true);
    try {
      await startNavigation(settings.navApp, target);
      if (target) update({ lastDestination: target });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      pending.current = false;
      setOpening(false);
    }
  };

  const handleWidgetClick = () => {
    if (settings.navApp === "system") {
      toast.error("Escolha um navegador específico nos ajustes.");
      return;
    }
    if (settings.navApp !== "system" && !selected) {
      toast.error("Escolha um navegador instalado nos ajustes.");
      return;
    }
    setFullscreen(true);
  };

  const navigateToDestination = async () => {
    const target = destination.trim();
    if (!target || pending.current || !ready) return;
    if (settings.navApp !== "system" && !selected) {
      toast.error("Escolha um navegador instalado nos ajustes.");
      return;
    }
    pending.current = true;
    setOpening(true);
    try {
      // A submitted destination explicitly opens the selected app, not a window request.
      await startNavigation(settings.navApp, target);
      update({ lastDestination: target });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      pending.current = false;
      setOpening(false);
    }
  };

  const distance = state.route?.remainingDistanceMeters ?? state.guidance?.remainingDistanceMeters;
  const duration = state.route?.remainingDurationSeconds ?? state.guidance?.remainingDurationSeconds;

  return (
    <section aria-label="Navegação" className="widget navigation-widget relative h-full min-h-0 overflow-hidden rounded-3xl border bg-card text-card-foreground shadow-card">
      <div className="absolute inset-0 bg-muted/50">
        <LiveMap dark={darkMap} position={state.position} visible animated={settings.animations} route={state.route} navigating={state.active} online={state.online} />
      </div>
      <Button type="button" variant="ghost" className="absolute inset-x-0 top-0 bottom-6 z-[1] h-auto w-full rounded-none hover:bg-transparent" disabled={!ready} aria-label="Abrir mapa no navegador configurado em tela cheia" title={selected ? `Abrir ${selected.label} em tela cheia` : "Abrir navegador em tela cheia"} onClick={handleWidgetClick} />
      {fullscreen && (
        <Suspense fallback={null}>
          {lazy(() => import("./fullscreen-navigation")).then ? (
            React.createElement(lazy(() => import("./fullscreen-navigation")).default || FullscreenNavigation, {
              state,
              animated: settings.animations,
              appLabel: selected?.label ?? "Navegador",
              onClose: () => setFullscreen(false),
              onOpenExternal: () => void openNavigator(destination),
              onSearch: () => void navigateToDestination(),
            })
          ) : null}
        </Suspense>
      )}
      <div className="navigation-overlay pointer-events-none absolute inset-0 z-10 flex min-h-0 flex-col justify-between gap-3 p-3 lg:p-4">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="navigation-status min-w-0 rounded-lg border bg-card px-3 py-2 text-sm shadow-card" role="status">
            {!state.online ? <><WifiOff className="mr-2 inline size-4" />Sem conexão</> : state.position ? <><MapPin className="mr-2 inline size-4 text-primary" />GPS ativo</> : "Obtendo localização…"}
          </div>
          <Button type="button" size="icon" variant="secondary" className="pointer-events-auto size-11 shrink-0 shadow-card" disabled={opening || !ready} title={selected ? `Abrir ${selected.label}` : "Abrir navegador"} aria-label="Abrir navegador configurado" onClick={() => void openNavigator("")}>
            <Maximize2 className="size-5" />
          </Button>
        </div>
        <div className="navigation-bottom flex min-w-0 flex-col gap-2">
          {state.guidance && <div className="navigation-maneuver rounded-lg border bg-card p-3 shadow-card">
            <p className="navigation-instruction break-words font-semibold"><Navigation className="mr-2 inline size-5 text-primary" />{state.guidance.title}</p>
            {state.guidance.text && <p className="navigation-street break-words text-sm text-muted-foreground">{state.guidance.text}</p>}
            {(distance !== undefined || duration !== undefined) && <p className="navigation-details mt-1 text-sm text-muted-foreground">{[formatDistance(distance), formatDuration(duration)].filter(Boolean).join(" · ")}</p>}
          </div>}
          <form className="navigation-search pointer-events-auto flex min-w-0 gap-2 rounded-lg border bg-card p-2 shadow-card" onSubmit={(event) => { event.preventDefault(); void navigateToDestination(); }}>
            <Input aria-label="Destino da navegação" placeholder="Para onde?" value={destination} onChange={(event) => setDestination(event.target.value)} maxLength={200} className="min-h-11 min-w-0 flex-1 bg-transparent" />
            <Button type="submit" size="icon" className="size-11 shrink-0" disabled={opening || !ready || !destination.trim()} aria-label="Iniciar navegação" title="Iniciar navegação"><Search className="size-5" /></Button>
          </form>
        </div>
      </div>
    </section>
  );
}
