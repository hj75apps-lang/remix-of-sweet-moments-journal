import { createContext } from "react";
import type { LauncherSettings } from "@/hooks/use-launcher-settings";

export interface LauncherSettingsContextValue {
  settings: LauncherSettings;
  loaded: boolean;
  update: (patch: Partial<Omit<LauncherSettings, "version">>) => void;
}

// Keep context identity outside the React Refresh boundary of the provider.
export const LauncherSettingsContext = createContext<LauncherSettingsContextValue | null>(null);