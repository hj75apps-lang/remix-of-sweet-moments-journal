import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getLocationOnce } from "@/services/location-store";
import { readStored, writeStored } from "@/services/storage";
import { isWeatherCache, normalizeWeatherCache, weatherCacheUpdatedAt } from "@/services/weather-cache";
import { fetchWeather, weatherPositionKey, type WeatherPosition, type WeatherReport } from "@/services/weather";

const POSITION_KEY = "sal.weather-pos";
const WEATHER_KEY = "sal.weather-report";

function isPosition(value: unknown): value is WeatherPosition {
  return !!value && typeof value === "object" &&
    typeof (value as { lat?: unknown }).lat === "number" &&
    typeof (value as { lng?: unknown }).lng === "number";
}

function readStoredPosition(): WeatherPosition | null {
  return readStored<WeatherPosition | null>(POSITION_KEY, null, {
    schema: 1,
    validate: isPosition,
    migrateLegacy: (value) => (isPosition(value) ? value : null),
  });
}

function readStoredWeather(): WeatherReport | undefined {
  return readStored<WeatherReport | undefined>(WEATHER_KEY, undefined, {
    schema: 1,
    validate: isWeatherCache,
    migrateLegacy: normalizeWeatherCache,
  });
}

export function useWeather() {
  const [position, setPosition] = useState<WeatherPosition | null>(null);
  const [gpsError, setGpsError] = useState("");
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [visible, setVisible] = useState(typeof document === "undefined" ? true : !document.hidden);
  const queryClient = useQueryClient();

  const locate = useCallback(() => {
    setGpsError("");
    void getLocationOnce().then((fix) => {
      const next = { lat: fix.latitude, lng: fix.longitude };
      setPosition(next);
      writeStored(POSITION_KEY, next, 1);
    }).catch((error: unknown) => {
      setGpsError(error instanceof Error && error.message === "location_timeout"
        ? "Não foi possível obter a localização"
        : "Permissão de localização negada ou GPS indisponível");
    });
  }, []);

  useEffect(() => {
    const sync = () => {
      setOnline(navigator.onLine);
      setVisible(!document.hidden);
    };
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  useEffect(() => {
    const stored = readStoredPosition();
    if (stored) {
      const cachedWeather = readStoredWeather();
      if (cachedWeather)
        queryClient.setQueryData(["weather", weatherPositionKey(stored)], cachedWeather, {
          updatedAt: weatherCacheUpdatedAt(cachedWeather),
        });
      setPosition(stored);
      return;
    }
    locate();
  }, [locate, queryClient]);

  const query = useQuery({
    queryKey: ["weather", position ? weatherPositionKey(position) : "locating"],
    queryFn: () => {
      if (!position) throw new Error("Localização indisponível");
      return fetchWeather(position).then((weather) => {
        try {
          writeStored(WEATHER_KEY, weather, 1);
        } catch {
          /* cache is optional */
        }
        return weather;
      });
    },
    enabled: !!position && online,
    staleTime: 15 * 60_000,
    refetchInterval: visible && online ? 30 * 60_000 : false,
    retry: 2,
  });

  return { position, gpsError, locate, query };
}
