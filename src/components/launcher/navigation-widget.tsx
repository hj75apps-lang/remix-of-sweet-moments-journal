import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLauncherSettings } from "@/hooks/use-launcher-settings";
import { errorMessage, isLauncherNative } from "@/services/launcher-system";
import { navigationWindowBounds, openNavigationWindow } from "@/services/navigation-window";
import { useNavigationApps } from "@/services/navigation-apps";

export function NavigationWidget() {
  const { settings, update, loaded } = useLauncherSettings();
  const { apps, ready } = useNavigationApps();
  const [openingWindow, setOpeningWindow] = useState(false);
  const opening = useRef(false);
  const section = useRef<HTMLElement | null>(null);
  const missing = ready && settings.navApp !== "system" && !apps.some((app) => app.id === settings.navApp);

  useEffect(() => {
    if (loaded && missing) update({ navApp: "system" });
  }, [loaded, missing, update]);

  const openWindow = useCallback(async () => {
    if (opening.current) return;
    if (!isLauncherNative()) {
      toast.error("A janela do navegador está disponível apenas na central compatível.");
      return;
    }
    if (settings.navApp === "system" || missing) {
      toast.error("Escolha um navegador instalado nos ajustes.");
      return;
    }
    const bounds = section.current ? navigationWindowBounds(section.current.getBoundingClientRect()) : null;
    if (!bounds) return;
    opening.current = true;
    setOpeningWindow(true);
    try {
      await openNavigationWindow(settings.navApp, bounds);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      toast.error(message === "not_installed" ? errorMessage(error) :
        message === "window_choose_app" ? "Escolha um navegador nos ajustes." :
          "Esta central não disponibilizou a janela de navegação.");
    } finally {
      opening.current = false;
      setOpeningWindow(false);
    }
  }, [settings.navApp, missing]);

  // Request a positioned window only; Android still controls placement and persistence.
  useEffect(() => {
    if (!loaded || !ready || missing || !settings.openNavigatorOnStartup ||
      settings.navApp === "system" || !isLauncherNative()) return;
    const timer = setTimeout(() => { void openWindow(); }, 600);
    return () => clearTimeout(timer);
  }, [loaded, ready, missing, settings.openNavigatorOnStartup, settings.navApp, openWindow]);

  return (
    <section
      ref={section}
      aria-label="Moldura Transparente de Navegação"
      className="widget navigation-widget relative h-full min-h-0 overflow-hidden rounded-3xl border border-border/40 bg-transparent shadow-card backdrop-blur-[2px]"
    >
      <Button
        type="button"
        variant="ghost"
        onClick={() => void openWindow()}
        disabled={openingWindow}
        aria-label="Abrir navegador escolhido nesta moldura"
        className="navigation-map-target absolute inset-0 h-full w-full rounded-none bg-transparent p-0 hover:bg-transparent"
      />
    </section>
  );
}
