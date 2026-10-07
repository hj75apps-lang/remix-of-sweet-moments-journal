import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { Maximize2, Navigation, Search, WifiOff, MapPin, BellRing } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLauncherSettings } from "@/hooks/use-launcher-settings";
import { useTheme } from "@/hooks/use-theme";
import { errorMessage, resumeNavigation, startNavigation, type NavApp } from "@/services/launcher-system";
import { requestGuidanceAccess } from "@/services/navigation-guidance";
import { navigationId, useNavigationApps } from "@/services/navigation-apps";
import { useNavigationState } from "@/contexts/navigation-context";

const LiveMap = lazy(() => import("./live-map"));
export function NavigationWidget() {
  const { settings, update } = useLauncherSettings();
  const { mode } = useTheme();
  const { position, locating, online, guidance, access, acquireLocation } = useNavigationState();
  const { apps, ready } = useNavigationApps();
  const [dest, setDest] = useState(settings.lastDestination);
  const [searching, setSearching] = useState(false);
  const [visible, setVisible] = useState(true);
  const section = useRef<HTMLElement | null>(null);
  const missing = ready && settings.navApp !== "system" && !apps.some(a => a.id === settings.navApp);
  useEffect(() => { if (visible) return acquireLocation(); }, [visible, acquireLocation]);
  useEffect(() => {
    if (!section.current || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry?.isIntersecting ?? false));
    observer.observe(section.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => { setDest(settings.lastDestination); }, [settings.lastDestination]);
  const choose = (app: NavApp) => update({ navApp: app });
  const open = async (destination?: string) => {
    try {
      if (destination === undefined && guidance) {
        await resumeNavigation(guidance.packageName, navigationId(guidance.packageName));
      } else {
        await startNavigation(missing ? "system" : settings.navApp, destination ?? "");
        if (destination?.trim()) update({ lastDestination: destination.trim() });
      }
      setSearching(false);
    } catch (e) { toast.error(errorMessage(e)); }
  };
  const appLabel = apps.find(a => a.id === settings.navApp)?.label ?? "Navegador";
  return (
    <section ref={section} aria-label="Navegação" className="widget navigation-widget relative h-full min-h-0 overflow-hidden rounded-3xl border border-border bg-card shadow-card">
      <ClientOnly fallback={<div className="absolute inset-0 bg-muted" />}>
        <Suspense fallback={<div className="absolute inset-0 bg-muted" />}>
          <LiveMap dark={mode === "dark"} position={position} visible={visible} animated={settings.animations} />
        </Suspense>
      </ClientOnly>
      <Button type="button" variant="ghost" onClick={() => void open()} aria-label={`Abrir ${guidance ? "navegação ativa" : appLabel} em tela cheia`} className="navigation-map-target absolute inset-0 z-[400] h-full w-full rounded-none p-0" />
      <div className="navigation-overlay pointer-events-none absolute inset-0 z-[500] flex flex-col justify-between gap-2 p-3">
        <div className="flex min-h-0 items-start justify-between gap-2">
          {guidance && <div className="navigation-maneuver flex min-w-0 flex-1 items-center gap-2 rounded-2xl bg-primary p-3 text-primary-foreground shadow-card">
            {guidance.icon ? <img src={guidance.icon} alt="" className="navigation-arrow size-10 shrink-0" /> : <Navigation className="navigation-arrow size-8 shrink-0" />}
            <div className="min-w-0">
              <p className="navigation-instruction break-words text-base font-bold leading-tight">{guidance.title}</p>
              {guidance.text && <p className="navigation-street mt-1 break-words text-sm leading-snug">{guidance.text}</p>}
              {guidance.subText && <p className="navigation-details mt-1 break-words text-sm leading-snug">{guidance.subText}</p>}
            </div>
          </div>}
          {!guidance && <div role="status" className="navigation-status flex min-w-0 flex-wrap items-center gap-2 rounded-xl bg-popover/95 px-3 py-2 text-xs text-popover-foreground">
            {locating && <span className="flex items-center gap-1"><MapPin className="size-4 shrink-0" />Obtendo localização...</span>}
            {!online && <span className="flex items-center gap-1"><WifiOff className="size-4 shrink-0" />Sem internet</span>}
            {!locating && online && <span>{appLabel}</span>}
          </div>}
          <span className="navigation-expand grid size-10 shrink-0 place-items-center rounded-full bg-popover/95 text-popover-foreground"><Maximize2 className="size-4" /></span>
        </div>
        <div className="navigation-bottom flex flex-col gap-2">
          {guidance && (!online || locating) && <p role="status" className="self-start rounded-lg bg-popover/95 px-2 py-1 text-xs text-popover-foreground">{!online ? "Sem internet" : "Obtendo localização..."}</p>}
          {missing && !guidance && <div className="pointer-events-auto rounded-xl bg-popover/95 p-2 text-popover-foreground">
            <p className="text-sm">Escolha outro navegador</p>
            <div className="mt-1 flex flex-wrap gap-1">{apps.map(a => <Button key={a.id} size="sm" variant="secondary" onClick={() => choose(a.id)}>{a.label}</Button>)}<Button size="sm" onClick={() => choose("system")}>Perguntar sempre</Button></div>
          </div>}
          {access === false && <Button type="button" size="icon" variant="secondary" aria-label="Permitir instruções de navegação" title="Permitir instruções de navegação" onClick={() => void requestGuidanceAccess()} className="navigation-permission pointer-events-auto size-11 self-start rounded-full"><BellRing className="size-5" /></Button>}
          {!guidance && !missing && (searching ? <form className="navigation-search pointer-events-auto flex min-w-0 gap-1 rounded-xl bg-popover/95 p-1.5" onSubmit={e => { e.preventDefault(); if (dest.trim()) void open(dest); }}>
            <Input autoFocus value={dest} onChange={e => setDest(e.target.value.slice(0, 200))} placeholder="Para onde?" aria-label="Destino" className="min-h-11 min-w-0 flex-1 border-0 bg-transparent text-base" />
            <Button type="submit" size="icon" disabled={!dest.trim()} aria-label="Iniciar navegação" className="size-11 shrink-0"><Search className="size-5" /></Button>
          </form> : <Button type="button" variant="secondary" className="navigation-destination pointer-events-auto min-h-11 self-start rounded-xl bg-popover/95 text-popover-foreground" onClick={() => setSearching(true)}><Search className="size-5" /><span>Para onde?</span></Button>)}
        </div>
      </div>
    </section>
  );
}
