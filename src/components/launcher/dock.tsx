import { useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Home, Navigation, Music, Radio, Phone, LayoutGrid, Settings, CloudSun, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DockItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

const dockItems: DockItem[] = [
  { id: "home", label: "Início", icon: Home },
  { id: "navigation", label: "Mapa", icon: Navigation },
  { id: "music", label: "Música", icon: Music },
  { id: "radio", label: "Rádios Online", icon: Radio },
  { id: "phone", label: "Telefone", icon: Phone },
  { id: "apps", label: "Apps", icon: LayoutGrid },
  { id: "weather", label: "Clima", icon: CloudSun },
  { id: "settings", label: "Ajustes", icon: Settings },
];

/** Vertical side dock with large touch targets. */
export function Dock() {
  const navigate = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [picked, setPicked] = useState("home");
  const active = path === "/radio" ? "radio" : path === "/ajustes" ? "settings" : path === "/apps" ? "apps" : path === "/clima" ? "weather" : path === "/" && (picked === "radio" || picked === "settings" || picked === "apps" || picked === "weather") ? "home" : picked;
  const routes: Record<string, "/" | "/radio" | "/ajustes" | "/apps" | "/clima"> = { home: "/", radio: "/radio", settings: "/ajustes", apps: "/apps", weather: "/clima" };
  const setActive = (id: string) => {
    setPicked(id);
    const to = routes[id];
    if (to) void navigate({ to });
  };
  return (
    <nav aria-label="Menu principal" className="flex shrink-0 items-center justify-between gap-1 overflow-x-auto rounded-3xl bg-sidebar p-1.5 md:w-20 md:flex-col md:justify-start md:gap-2 md:overflow-hidden md:py-3 lg:w-24">
      {dockItems.map(({ id, label, icon: Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setActive(id)}
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex min-h-14 min-w-11 flex-1 flex-col items-center justify-center gap-1 rounded-2xl text-[0.625rem] sm:text-xs md:min-h-11 md:max-h-20 md:w-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive ? "bg-primary text-primary-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent active:scale-95",
            )}
          >
            <Icon className="size-6" />
            {label}
          </button>
        );
      })}
    </nav>
  );
}
