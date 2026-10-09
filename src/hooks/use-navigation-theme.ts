import { useEffect, useState } from "react";
import { useTheme } from "@/hooks/use-theme";
import { navigationNightMode } from "@/services/navigation-theme";

/** Map-only schedule; never modifies the saved preference. */
export function useNavigationTheme(): boolean {
  const { preferredMode } = useTheme();
  const [localTime, setLocalTime] = useState<Date | null>(null);
  useEffect(() => {
    const refresh = () => setLocalTime(new Date());
    refresh();
    const timer = window.setInterval(refresh, 1000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  return navigationNightMode(preferredMode === "dark", localTime);
}
