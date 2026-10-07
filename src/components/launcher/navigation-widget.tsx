import { lazy, Suspense, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { Maximize2, Navigation, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLauncherSettings } from "@/hooks/use-launcher-settings";
import { useTheme } from "@/hooks/use-theme";
import { errorMessage, startNavigation, type NavApp } from "@/services/launcher-system";
import { requestGuidanceAccess, useNavGuidance } from "@/services/navigation-guidance";
import { cn } from "@/lib/utils";

const LiveMap = lazy(() => import("./live-map"));

const APPS: Array<{ id: NavApp; label: string }> = [
  { id: "maps", label: "Maps" },
  { id: "waze", label: "Waze" },
];
const APP_NAME: Record<string, string> = {
  "com.google.android.apps.maps": "Google Maps",
  "com.waze": "Waze",
};

/**
 * CarPlay / Android Auto–style dashboard tile: live map, the chosen app's
 * turn-by-turn guidance on top, and a tap opens that app full screen.
 */
export function NavigationWidget() {
  const { settings, update } = useLauncherSettings();
  const { mode } = useTheme();
  const { guidance, access } = useNavGuidance();
  const [dest, setDest] = useState(settings.lastDestination);

  const open = async (destination = "") => {
    try {
      await startNavigation(settings.navApp, destination);
      if (destination.trim()) update({ lastDestination: destination.trim() });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  const appLabel = APPS.find((a) => a.id === settings.navApp)?.label ?? "Mapa";

  return (
    <section
      aria-label="Navegação"
      className="widget relative h-full min-h-0 overflow-hidden rounded-3xl border border-white/20 bg-card shadow-[var(--shadow-card)] ring-1 ring-white/10 backdrop-blur-md"
    >
      <ClientOnly fallback={<div className="absolute inset-0 bg-[image:var(--gradient-map)]" />}>
        <Suspense fallback={<div className="absolute inset-0 bg-[image:var(--gradient-map)]" />}>
          <LiveMap dark={mode === "dark"} />
        </Suspense>
      </ClientOnly>

      {/* Whole map is the tap target that opens the chosen app full screen. */}
      <button
        type="button"
        onClick={() => void open()}
        aria-label={`Abrir ${appLabel} em tela cheia`}
        className="absolute inset-0 z-[400] cursor-pointer"
      />

      <div className="pointer-events-none relative z-[500] flex h-full flex-col justify-between gap-2 p-3 lg:p-4">
        <div className="flex items-start justify-between gap-2">
          {guidance ? (
            <div className="pointer-events-auto flex max-w-[70%] items-center gap-3 rounded-2xl bg-primary p-3 text-primary-foreground shadow-lg">
              {guidance.icon ? (
                <img src={guidance.icon} alt="" className="size-12 shrink-0" />
              ) : (
                <Navigation className="size-10 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="truncate text-lg font-bold leading-tight">{guidance.title}</p>
                <p className="truncate text-sm opacity-90">{guidance.text}</p>
                {guidance.subText && (
                  <p className="truncate text-xs opacity-80">
                    {guidance.subText} · {APP_NAME[guidance.packageName] ?? "Navegação"}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="pointer-events-auto flex gap-1 rounded-2xl bg-card/90 p-1 shadow-lg backdrop-blur">
              {APPS.map((a) => (
                <Button
                  key={a.id}
                  type="button"
                  size="sm"
                  variant={settings.navApp === a.id ? "default" : "ghost"}
                  aria-pressed={settings.navApp === a.id}
                  onClick={() => update({ navApp: a.id })}
                  className="min-h-10 rounded-xl px-4"
                >
                  {a.label}
                </Button>
              ))}
            </div>
          )}
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-card/90 text-foreground shadow-lg backdrop-blur">
            <Maximize2 className="size-4" />
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {access === false && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => void requestGuidanceAccess()}
              className="pointer-events-auto min-h-10 self-start rounded-xl bg-card/90 backdrop-blur"
            >
              Mostrar instruções de rota aqui
            </Button>
          )}
          {!guidance && (
            <form
              className="pointer-events-auto flex gap-2 rounded-2xl bg-card/90 p-1.5 shadow-lg backdrop-blur"
              onSubmit={(e) => {
                e.preventDefault();
                void open(dest);
              }}
            >
              <Input
                value={dest}
                onChange={(e) => setDest(e.target.value.slice(0, 200))}
                placeholder={`Para onde vamos? (${appLabel})`}
                aria-label="Destino"
                className="min-h-11 flex-1 rounded-xl border-0 bg-transparent text-base"
              />
              <Button
                type="submit"
                className={cn("min-h-11 rounded-xl px-4")}
                aria-label="Iniciar navegação"
              >
                <Search />
              </Button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
