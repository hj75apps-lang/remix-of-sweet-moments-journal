import { useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Home, LayoutGrid, Radio, Settings, History, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { VoiceControlButton } from "@/components/launcher/status-bar";
import { useLauncherSettings } from "@/hooks/use-launcher-settings";
import {
  hasUsageAccess,
  getLastLaunchedApp,
  isNativeAvailable,
  launchApp,
  listRecentApps,
  onRecentAppsChanged,
  requestUsageAccess,
} from "@/services/installed-apps";

interface DockItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

const dockItems: DockItem[] = [
  { id: "home", label: "Início", icon: Home },
  { id: "radio", label: "Rádios Online", icon: Radio },
  { id: "last-app", label: "Último aplicativo", icon: History },
  { id: "apps", label: "Apps", icon: LayoutGrid },
  { id: "settings", label: "Ajustes", icon: Settings },
];

/** Vertical side dock with large touch targets. */
export function Dock() {
  const { settings } = useLauncherSettings();
  const navigate = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [native, setNative] = useState(false);
  const [usageAllowed, setUsageAllowed] = useState(false);
  const queryClient = useQueryClient();
  const lastLaunched = useQuery({
    queryKey: ["last-launched-app"],
    queryFn: getLastLaunchedApp,
    enabled: native,
  });
  const lastApp = lastLaunched.data;
  const recent = useQuery({
    queryKey: ["recent-apps"],
    queryFn: listRecentApps,
    enabled: native && usageAllowed,
  });
  useEffect(() => {
    const available = isNativeAvailable();
    setNative(available);
    if (available) void hasUsageAccess().then(setUsageAllowed);
    if (!available) return;
    return onRecentAppsChanged(() => {
      void queryClient.invalidateQueries({ queryKey: ["last-launched-app"] });
      void hasUsageAccess().then((granted) => {
        setUsageAllowed(granted);
        if (granted) void queryClient.invalidateQueries({ queryKey: ["recent-apps"] });
      });
    });
  }, [queryClient]);
  const active =
    path === "/"
      ? "home"
      : path === "/radio"
        ? "radio"
        : path === "/telefone"
          ? "phone"
          : path === "/apps"
            ? "apps"
            : path === "/ajustes"
              ? "settings"
              : null;
  const routes: Record<string, "/" | "/radio" | "/telefone" | "/apps" | "/ajustes"> = {
    home: "/",
    radio: "/radio",
    phone: "/telefone",
    apps: "/apps",
    settings: "/ajustes",
  };
  const setActive = (id: string) => {
    if (id === "home") window.dispatchEvent(new Event("launcher:home"));
    const to = routes[id];
    if (to) void navigate({ to });
  };
  const renderDockItem = ({ id, label, icon: Icon }: DockItem) => {
        const isActive = active === id;
        const isLastApp = id === "last-app";
        const itemLabel = isLastApp && lastApp ? `Abrir ${lastApp.label}` : label;
        return (
          <Button
            key={id}
            type="button"
            variant="ghost"
            onClick={() => {
              if (isLastApp) {
                if (lastApp) void launchApp(lastApp.packageName);
                return;
              }
              setActive(id);
            }}
            disabled={isLastApp && !lastApp}
            aria-label={itemLabel}
            aria-current={isActive ? "page" : undefined}
            style={{
              backgroundColor: settings.buttonColor ? (isActive ? settings.buttonColor : undefined) : undefined,
              opacity: "var(--launcher-button-opacity, 1)",
            }}
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-2xl p-2 md:h-14 md:w-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? !settings.buttonColor && "bg-primary text-primary-foreground shadow-sm"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent active:scale-95 hover:text-sidebar-foreground",
            )}
            title={itemLabel}
          >
            {isLastApp && lastApp ? (
              <img src={`data:image/png;base64,${lastApp.icon}`} alt="" className="size-8 shrink-0 rounded-md object-contain md:size-11" />
            ) : (
              <Icon className="size-7 shrink-0 scale-[1.75] md:scale-[2.9]" />
            )}
          </Button>
        );
  };
  return (
    <nav
      aria-label="Menu principal"
      className="flex min-h-0 shrink-0 items-center gap-2 overflow-hidden rounded-3xl bg-sidebar p-1.5 md:w-24 md:flex-col md:py-3 lg:w-24"
    >
      <div className="flex shrink-0 gap-2 md:w-full md:flex-col">
        {dockItems.filter(({ id }) => id === "home" || id === "radio").map(renderDockItem)}
      </div>
      <div aria-label="Aplicativos recentes" className="flex min-h-0 min-w-0 flex-1 gap-2 overflow-x-auto md:w-full md:flex-col md:overflow-x-hidden md:overflow-y-auto">
        {dockItems.filter(({ id }) => id === "last-app").map(renderDockItem)}
      {(recent.data ?? []).filter((app) => app.packageName !== lastApp?.packageName).map((app) => (
        <Button
          key={app.packageName}
          type="button"
          variant="ghost"
          onClick={() => void launchApp(app.packageName)}
          aria-label={`Abrir ${app.label}`}
          title={app.label}
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl p-2 text-sidebar-foreground/70 md:h-14 md:w-full"
        >
          <img
            src={`data:image/png;base64,${app.icon}`}
            alt=""
            className="size-8 shrink-0 rounded-md object-contain md:size-11"
          />
        </Button>
      ))}
      {native && !usageAllowed && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => void requestUsageAccess()}
          aria-label="Permitir aplicativos recentes"
          title="Permitir aplicativos recentes"
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl p-2 text-sidebar-foreground/70 md:h-14 md:w-full"
        >
          <History className="size-7 shrink-0 scale-[1.75] md:scale-[2.9]" />
        </Button>
      )}
      </div>
      <div className="flex shrink-0 items-center gap-2 md:w-full md:flex-col">
        {dockItems.filter(({ id }) => id === "apps" || id === "settings").map(renderDockItem)}
        <VoiceControlButton />
      </div>
    </nav>
  );
}
