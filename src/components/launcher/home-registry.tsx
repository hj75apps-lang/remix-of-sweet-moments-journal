import type { ReactNode } from "react";
import { Map, Music, Radio, Phone, Settings, Clock, CloudSun, LayoutGrid, type LucideIcon } from "lucide-react";
import type { AppId, ItemSize, WidgetKind } from "@/types/home";
import { NavigationWidget, MediaWidget, WeatherWidget, FavoriteAppsWidget } from "./widgets";
import { ClockWidget } from "./clock-widget";

export const GRID_COLS = 6;
export const GRID_ROWS = 4;

interface WidgetDef {
  label: string;
  icon: LucideIcon;
  sizes: ItemSize[];
  render: () => ReactNode;
}

export const widgetRegistry: Record<WidgetKind, WidgetDef> = {
  navigation: { label: "Navegação", icon: Map, sizes: [{ w: 4, h: 4 }, { w: 3, h: 3 }, { w: 2, h: 2 }], render: () => <NavigationWidget /> },
  media: { label: "Tocando agora", icon: Music, sizes: [{ w: 2, h: 2 }, { w: 3, h: 2 }, { w: 2, h: 1 }], render: () => <MediaWidget /> },
  weather: { label: "Clima", icon: CloudSun, sizes: [{ w: 2, h: 1 }, { w: 2, h: 2 }], render: () => <WeatherWidget /> },
  favorites: { label: "Apps favoritos", icon: LayoutGrid, sizes: [{ w: 2, h: 1 }, { w: 3, h: 1 }], render: () => <FavoriteAppsWidget /> },
  clock: { label: "Relógio", icon: Clock, sizes: [{ w: 2, h: 1 }, { w: 2, h: 2 }, { w: 1, h: 1 }], render: () => <ClockWidget /> },
};

export const appRegistry: Record<AppId, { label: string; icon: LucideIcon }> = {
  map: { label: "Mapa", icon: Map },
  music: { label: "Música", icon: Music },
  radio: { label: "Rádios Online", icon: Radio },
  phone: { label: "Telefone", icon: Phone },
  settings: { label: "Ajustes", icon: Settings },
};

export const appSizes: ItemSize[] = [{ w: 1, h: 1 }, { w: 2, h: 1 }];

export function sizesFor(type: "WIDGET" | "APP", ref: string): ItemSize[] {
  return type === "WIDGET" ? widgetRegistry[ref as WidgetKind].sizes : appSizes;
}
