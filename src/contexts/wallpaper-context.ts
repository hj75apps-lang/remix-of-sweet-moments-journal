import { createContext, useContext } from "react";
import type { WallpaperState } from "@/services/wallpaper";
export interface WallpaperContextValue {
  saved: WallpaperState; visible: WallpaperState; ready: boolean; error: string;
  preview: (value: WallpaperState | null) => void;
  save: (value: WallpaperState) => Promise<void>;
}
export const WallpaperContext = createContext<WallpaperContextValue | null>(null);
export function useWallpaper() {
  const context = useContext(WallpaperContext);
  if (!context) throw new Error("WallpaperProvider ausente.");
  return context;
}
