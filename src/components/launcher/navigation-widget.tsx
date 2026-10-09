import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLauncherSettings } from "@/hooks/use-launcher-settings";
import { errorMessage, isLauncherNative, resumeNavigation, startNavigation } from "@/services/launcher-system";
import { navigationWindowBounds, openNavigationWindow } from "@/services/navigation-window";
import { navigationId, useNavigationApps } from "@/services/navigation-apps";
import { useNavigationState } from "@/contexts/navigation-context";

const FullscreenNavigation = lazy(() => import("./fullscreen-navigation").then((module) => ({ default: module.FullscreenNavigation })));

export function NavigationWidget() {
  const { settings, update } = useLauncherSettings();
  const state = useNavigationState();
  const { apps, ready } = useNavigationApps();
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

  useEffect(() => {
    if (missing) update({ navApp: "system" });
  }, [missing, update]);

  // Abertura automática e embutimento via Torque Hammer window na moldura transparente ao iniciar
  useEffect(() => {
    if (!ready || missing || settings.navApp === "system") return;
    const marker = "sal.auto-launch-nav-" + settings.navApp;
    try {
      if (sessionStorage.getItem(marker)) return;
      sessionStorage.setItem(marker, "1");
    } catch {
      // fallback
    }
    const timer = setTimeout(() => {
      if (section.current && isLauncherNative()) {
        const bounds = navigationWindowBounds(section.current.getBoundingClientRect());
        if (bounds) {
          void openNavigationWindow(settings.navApp, bounds).catch(() => {
            void startNavigation(settings.navApp, "");
          });
          return;
        }
      }
      void startNavigation(settings.navApp, "").catch(() => {});
    }, 600);
    return () => clearTimeout(timer);
  }, [ready, missing, settings.navApp]);

  const open = async (destination?: string) => {
    try {
      if (destination === undefined && state.active && state.sourcePackage) {
        await resumeNavigation(state.sourcePackage, navigationId(state.sourcePackage));
      } else {
        await startNavigation(missing ? "system" : settings.navApp, destination ?? "");
        if (destination?.trim()) update({ lastDestination: destination.trim() });
      }
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

  return (
    <>
      <section
        ref={section}
        aria-label="Moldura Transparente de Navegação"
        className="widget navigation-widget relative h-full min-h-0 overflow-hidden rounded-3xl border border-border/40 bg-transparent shadow-card backdrop-blur-[2px]"
      >
        {/* Moldura transparente sobre o mapa nativo/embed para embutir e manter o navegador ativo na tela inicial */}
        <div className="absolute inset-0 z-[350] bg-transparent pointer-events-auto" />

        <div className="absolute inset-0 z-0 bg-transparent pointer-events-none" aria-hidden />

        <Button
          type="button"
          variant="ghost"
          onClick={() => void openMap()}
          disabled={openingWindow}
          aria-label={native ? "Abrir navegador nesta moldura" : state.active ? "Abrir navegação ativa" : "Abrir mapa em tela cheia"}
          className="navigation-map-target absolute inset-0 z-[400] h-full w-full rounded-none p-0 bg-transparent hover:bg-transparent"
        />

      </section>

      {fullscreen && (
        <Suspense fallback={<div role="status" className="fixed inset-0 z-[1000] grid place-items-center bg-background">Carregando mapa…</div>}>
        <FullscreenNavigation
          state={state}
          animated={settings.animations}
          appLabel={appLabel}
          onClose={() => setFullscreen(false)}
          onOpenExternal={() => void open()}
          onSearch={() => setFullscreen(false)}
        />
        </Suspense>
      )}
    </>
  );
}
