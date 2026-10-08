import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { Maximize2, PanelsTopLeft, Navigation, Search, WifiOff, MapPin, BellRing, Route as RouteIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLauncherSettings } from "@/hooks/use-launcher-settings";
import { useTheme } from "@/hooks/use-theme";
import { errorMessage, isLauncherNative, resumeNavigation, startNavigation } from "@/services/launcher-system";
import { navigationWindowBounds, openNavigationWindow } from "@/services/navigation-window";
import { requestGuidanceAccess } from "@/services/navigation-guidance";
import { navigationId, useNavigationApps } from "@/services/navigation-apps";
import { useNavigationState } from "@/contexts/navigation-context";
import { formatDistance, formatDuration, formatEta } from "@/services/navigation-state";
import { FullscreenNavigation } from "./fullscreen-navigation";

const LiveMap = lazy(() => import("./live-map"));

export function NavigationWidget() {
  const { settings, update } = useLauncherSettings();
  const { mode } = useTheme();
  const state = useNavigationState();
  const { apps, ready } = useNavigationApps();
  const [dest, setDest] = useState(settings.lastDestination);
  const [searching, setSearching] = useState(false);
  const [visible, setVisible] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [native, setNative] = useState(false);
  const [openingWindow, setOpeningWindow] = useState(false);
  const section = useRef<HTMLElement | null>(null);
  const missing = ready && settings.navApp !== "system" && !apps.some((a) => a.id === settings.navApp);

  useEffect(() => setNative(isLauncherNative()), []);

  useEffect(() => {
    if (!visible) return;
    return state.acquireLocation();
  }, [visible, state.acquireLocation]);

  useEffect(() => {
    if (!section.current || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry?.isIntersecting ?? false), {
      threshold: 0.05,
    });
    observer.observe(section.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => setDest(settings.lastDestination), [settings.lastDestination]);

  useEffect(() => {
    if (missing) update({ navApp: "system" });
  }, [missing, update]);

  const open = async (destination?: string) => {
    try {
      if (destination === undefined && state.active && state.sourcePackage) {
        await resumeNavigation(state.sourcePackage, navigationId(state.sourcePackage));
      } else {
        await startNavigation(missing ? "system" : settings.navApp, destination ?? "");
        if (destination?.trim()) update({ lastDestination: destination.trim() });
      }
      setSearching(false);
      setFullscreen(false);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const openMap = async () => {
    if (!native) { setFullscreen(true); return; }
    if (openingWindow) return;
    const bounds = section.current ? navigationWindowBounds(section.current.getBoundingClientRect()) : null;
    if (!bounds) return;
    setOpeningWindow(true);
    try {
      const app = state.active && state.sourcePackage ? navigationId(state.sourcePackage) : settings.navApp;
      await openNavigationWindow(app, bounds);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      toast.error(message === "window_choose_app" ? "Escolha um navegador nos ajustes." :
        message === "not_installed" ? errorMessage(error) : "Esta central não disponibilizou a janela de navegação.");
    } finally { setOpeningWindow(false); }
  };

  const appLabel = apps.find((a) => a.id === settings.navApp)?.label ?? "Navegador";
  const g = state.guidance;
  const route = state.route;
  const distance = route?.remainingDistanceMeters ?? g?.remainingDistanceMeters;
  const duration = route?.remainingDurationSeconds ?? g?.remainingDurationSeconds;
  const eta = route?.etaEpochMs ?? g?.etaEpochMs;

  return (
    <>
      <section
        ref={section}
        aria-label="Navegação"
        className="widget navigation-widget relative h-full min-h-0 overflow-hidden rounded-3xl border border-border bg-card shadow-card"
      >
        <ClientOnly fallback={<div className="absolute inset-0 bg-muted" />}>
          <Suspense fallback={<div className="absolute inset-0 bg-muted" />}>
            <LiveMap dark={mode === "dark"} position={state.position} visible={visible} animated={settings.animations} route={route} />
          </Suspense>
        </ClientOnly>

        <Button
          type="button"
          variant="ghost"
          onClick={() => void openMap()}
          disabled={openingWindow}
          aria-label={native ? "Abrir navegador neste espaço" : state.active ? "Abrir navegação ativa" : "Abrir mapa em tela cheia"}
          className="navigation-map-target absolute inset-0 z-[400] h-full w-full rounded-none p-0"
        />

        <div className="navigation-overlay pointer-events-none absolute inset-0 z-[500] flex flex-col justify-between gap-2 p-3">
          <div className="flex min-h-0 items-start justify-between gap-2">
            {g || state.active ? (
              <div className="navigation-maneuver flex min-w-0 flex-1 items-center gap-2 rounded-2xl bg-primary p-3 text-primary-foreground shadow-card">
                {g?.icon ? (
                  <img src={g.icon} alt="" className="navigation-arrow size-10 shrink-0" />
                ) : (
                  <Navigation className="navigation-arrow size-8 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="navigation-instruction break-words text-base font-bold leading-tight">{g?.title ?? "Navegação ativa"}</p>
                  {g?.text && <p className="navigation-street mt-1 break-words text-sm leading-snug">{g.text}</p>}
                  {distance !== undefined && <p className="navigation-details mt-1 text-sm font-semibold">{formatDistance(distance)}</p>}
                </div>
              </div>
            ) : (
              <div role="status" className="navigation-status flex min-w-0 flex-wrap items-center gap-2 rounded-xl bg-popover/95 px-3 py-2 text-xs text-popover-foreground">
                {state.locating && <span className="flex items-center gap-1"><MapPin className="size-4 shrink-0" />Obtendo localização...</span>}
                {!state.online && <span className="flex items-center gap-1"><WifiOff className="size-4 shrink-0" />Sem internet</span>}
                {!state.locating && state.online && <span>{appLabel}</span>}
              </div>
            )}
            <span className="navigation-expand grid size-10 shrink-0 place-items-center rounded-full bg-popover/95 text-popover-foreground">
              {native ? <PanelsTopLeft className="size-4" /> : <Maximize2 className="size-4" />}
            </span>
          </div>

          <div className="navigation-bottom flex min-w-0 flex-col gap-2">
            {(g || state.active) && (
              <div className="flex flex-wrap items-center gap-2">
                {eta && <span className="rounded-lg bg-popover/95 px-2 py-1 text-xs text-popover-foreground">Chegada {formatEta(eta)}</span>}
                {duration !== undefined && <span className="rounded-lg bg-popover/95 px-2 py-1 text-xs text-popover-foreground">{formatDuration(duration)}</span>}
                {!state.online && <span className="rounded-lg bg-popover/95 px-2 py-1 text-xs text-popover-foreground">Sem internet</span>}
              </div>
            )}

            {route?.progress !== undefined && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-popover/70" aria-label={`Progresso ${Math.round(route.progress * 100)}%`}>
                <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${Math.round(route.progress * 100)}%` }} />
              </div>
            )}

            {state.active && route?.points?.length ? (
              <div className="navigation-route-badge self-start rounded-xl bg-popover/95 px-2 py-1 text-xs text-popover-foreground">
                <RouteIcon className="mr-1 inline size-3.5" />Rota ativa
              </div>
            ) : null}

            {missing && !state.active && (
              <div className="pointer-events-auto rounded-xl bg-popover/95 p-2 text-popover-foreground">
                <p className="text-sm">Escolha outro navegador</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {apps.map((a) => (
                    <Button key={a.id} size="sm" variant="secondary" onClick={() => update({ navApp: a.id })}>{a.label}</Button>
                  ))}
                  <Button size="sm" onClick={() => update({ navApp: "system" })}>Perguntar sempre</Button>
                </div>
              </div>
            )}

            {state.access === false && (
              <Button
                type="button"
                size="icon"
                variant="secondary"
                aria-label="Permitir instruções de navegação"
                title="Permitir instruções de navegação"
                onClick={() => void requestGuidanceAccess()}
                className="navigation-permission pointer-events-auto size-11 self-start rounded-full"
              >
                <BellRing className="size-5" />
              </Button>
            )}

            {!state.active && !missing && (
              searching ? (
                <form
                  className="navigation-search pointer-events-auto flex min-w-0 gap-1 rounded-xl bg-popover/95 p-1.5"
                  onSubmit={(e) => { e.preventDefault(); if (dest.trim()) void open(dest); }}
                >
                  <Input autoFocus value={dest} onChange={(e) => setDest(e.target.value.slice(0, 200))} placeholder="Para onde?" aria-label="Destino" className="min-h-11 min-w-0 flex-1 border-0 bg-transparent text-base" />
                  <Button type="submit" size="icon" disabled={!dest.trim()} aria-label="Iniciar navegação" className="size-11 shrink-0">
                    <Search className="size-5" />
                  </Button>
                </form>
              ) : (
                <Button type="button" variant="secondary" className="navigation-destination pointer-events-auto min-h-11 self-start rounded-xl bg-popover/95 text-popover-foreground" onClick={() => setSearching(true)}>
                  <Search className="size-5" /><span>Para onde?</span>
                </Button>
              )
            )}
          </div>
        </div>
      </section>

      {fullscreen && (
        <FullscreenNavigation
          state={state}
          animated={settings.animations}
          appLabel={appLabel}
          onClose={() => setFullscreen(false)}
          onOpenExternal={() => void open()}
          onSearch={() => { setFullscreen(false); setSearching(true); }}
        />
      )}
    </>
  );
}
