import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getLocationOnce } from "@/services/location-store";
import { readStored, writeStored } from "@/services/storage";
import {
  fetchWeather,
  weatherPositionKey,
  type WeatherPosition,
  type WeatherReport,
} from "@/services/weather";

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

function isWeather(value: unknown): value is WeatherReport {
  return !!value && typeof value === "object" &&
    (value as { source?: unknown }).source === "Open-Meteo" &&
    Array.isArray((value as { days?: unknown }).days);
}

function readStoredWeather(): WeatherReport | undefined {
  return readStored<WeatherReport | undefined>(WEATHER_KEY, undefined, {
    schema: 1,
    validate: isWeather,
    migrateLegacy: (value) => (isWeather(value) ? value : null),
  });
}

export function useWeather() {
  const [position, setPosition] = useState<WeatherPosition | null>(null);
  const [gpsError, setGpsError] = useState("");
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
    const stored = readStoredPosition();
    if (stored) {
      const cachedWeather = readStoredWeather();
      if (cachedWeather)
        queryClient.setQueryData(["weather", weatherPositionKey(stored)], cachedWeather);
      setPosition(stored);
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
    enabled: !!position,
    staleTime: 15 * 60_000,
    refetchInterval: 30 * 60_000,
    retry: 2,
  });

  return { position, gpsError, locate, query };
}
