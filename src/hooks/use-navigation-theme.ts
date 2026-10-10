import { useEffect, useState } from "react";
import { useTheme } from "@/hooks/use-theme";
import { navigationNightMode } from "@/services/navigation-theme";

/** Map-only schedule; never modifies the saved preference. */
export function useNavigationTheme(): boolean {
  const { preferredMode } = useTheme();
  const { settings } = useLauncherSettings();
  const [scheduledNight, setScheduledNight] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      if (document.hidden) return;
      setScheduledNight(navigationNightMode(false, new Date()));
      // Exact local 18:00/06:00 transitions, with no Date-driven 1 Hz renders.
      timer = setTimeout(refresh, 60_000 - Date.now() % 60_000);
    };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  if (settings.navThemeMode === "light") return false;
  if (settings.navThemeMode === "dark") return true;
  return preferredMode === "dark" || scheduledNight;
}
