import { useCallback, useEffect, useState } from "react";
import { clearLauncherCapabilities, getLauncherCapabilities } from "@/services/launcher-capabilities";
import type { DeviceInfo } from "@/services/launcher-system";

export function useLauncherCapabilities() {
  const [capabilities, setCapabilities] = useState<DeviceInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setCapabilities(await getLauncherCapabilities({ refresh: true }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    void getLauncherCapabilities().then((info) => {
      if (alive) {
        setCapabilities(info);
        setLoading(false);
      }
    });
    return () => { alive = false; };
  }, []);

  return { capabilities, loading, refresh, clear: clearLauncherCapabilities };
}
