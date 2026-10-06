import { useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Home, LayoutGrid, Radio, Phone, Settings, History, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  hasUsageAccess,
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
  { id: "phone", label: "Telefone", icon: Phone },
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
        return (
          <Button
            key={id}
            type="button"
            variant="ghost"
            onClick={() => setActive(id)}
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex min-h-14 min-w-11 flex-1 flex-col items-center justify-center rounded-2xl p-2 md:min-h-16 md:max-h-24 md:w-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent active:scale-95 hover:text-sidebar-foreground",
            )}
            title={label}
          >
            <Icon className="size-9 md:size-10" />
          </Button>
        );
      })}
      {(recent.data ?? []).map((app) => (
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
            className="size-7 rounded-md object-contain"
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
          <History className="size-6" />
          <span className="w-full truncate text-center">Recentes</span>
        </Button>
      )}
    </nav>
  );
}
