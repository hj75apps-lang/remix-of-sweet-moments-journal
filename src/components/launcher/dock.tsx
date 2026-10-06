import { useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Home, LayoutGrid, Radio, Settings, History, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
    const to = routes[id];
    if (to) void navigate({ to });
  };
  return (
    <nav
      aria-label="Menu principal"
      className="flex shrink-0 items-center justify-between gap-1 overflow-x-auto rounded-3xl bg-sidebar p-1.5 md:w-20 md:flex-col md:justify-start md:gap-2 md:overflow-hidden md:py-3 lg:w-24"
    >
      {dockItems.map(({ id, label, icon: Icon }) => {
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
            className={cn(
              "flex min-h-14 min-w-11 flex-1 flex-col items-center justify-center rounded-2xl p-2 md:min-h-16 md:max-h-24 md:w-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent active:scale-95 hover:text-sidebar-foreground",
            )}
            title={itemLabel}
          >
            {isLastApp && lastApp ? (
              <img
                src={`data:image/png;base64,${lastApp.icon}`}
                alt=""
                className="my-2 size-11 shrink-0 rounded-md object-contain md:size-12"
              />
            ) : (
              <Icon className="size-[2.25rem] md:size-[2.5rem] scale-[2.5] my-2" />
            )}
          </Button>
        );
      })}
      {(recent.data ?? []).filter((app) => app.packageName !== lastApp?.packageName).map((app) => (
        <Button
          key={app.packageName}
          type="button"
          variant="ghost"
          onClick={() => void launchApp(app.packageName)}
          aria-label={`Abrir ${app.label}`}
          title={app.label}
          className="flex min-h-14 min-w-11 flex-1 flex-col gap-1 rounded-2xl px-1 text-[0.625rem] font-medium text-sidebar-foreground/70 sm:text-xs md:min-h-11 md:max-h-20 md:w-full"
        >
          <img
            src={`data:image/png;base64,${app.icon}`}
            alt=""
            className="size-[1.75rem] md:size-[2rem] scale-[2.5] my-2 rounded-md object-contain"
          />
          <span className="w-full truncate text-center">{app.label}</span>
        </Button>
      ))}
      {native && !usageAllowed && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => void requestUsageAccess()}
          aria-label="Permitir aplicativos recentes"
          title="Permitir aplicativos recentes"
          className="flex min-h-14 min-w-11 flex-1 flex-col gap-1 rounded-2xl px-1 text-[0.625rem] font-medium text-sidebar-foreground/70 sm:text-xs md:min-h-11 md:max-h-20 md:w-full"
        >
          <History className="size-[1.5rem] md:size-[1.75rem] scale-[2.5] my-2" />
          <span className="w-full truncate text-center">Recentes</span>
        </Button>
      )}
    </nav>
  );
}
