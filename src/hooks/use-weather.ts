import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchWeather, weatherPositionKey, type WeatherPosition, type WeatherReport } from "@/services/weather";

const POSITION_KEY = "sal.weather-pos";
const WEATHER_KEY = "sal.weather-report";

function readStoredPosition(): WeatherPosition | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(POSITION_KEY) ?? "null") as Partial<WeatherPosition> | null;
    return typeof parsed?.lat === "number" && typeof parsed.lng === "number"
      ? { lat: parsed.lat, lng: parsed.lng }
      : null;
  } catch {
    return null;
  }
}

function readStoredWeather(): WeatherReport | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const parsed = JSON.parse(localStorage.getItem(WEATHER_KEY) ?? "null") as WeatherReport | null;
    return parsed?.source === "Open-Meteo" && Array.isArray(parsed.days) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function useWeather() {
  const [position, setPosition] = useState<WeatherPosition | null>(null);
  const [gpsError, setGpsError] = useState("");
  const queryClient = useQueryClient();

  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setGpsError("GPS indisponível neste aparelho");
      return;
    }
    setGpsError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const next = { lat: coords.latitude, lng: coords.longitude };
        setPosition(next);
        try { localStorage.setItem(POSITION_KEY, JSON.stringify(next)); } catch { /* cache is optional */ }
      },
      (error) => setGpsError(error.code === error.PERMISSION_DENIED ? "Permissão de localização negada" : "Não foi possível obter a localização"),
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 10 * 60_000 },
    );
  }, []);

  useEffect(() => {
    const stored = readStoredPosition();
    if (stored) {
      const cachedWeather = readStoredWeather();
      if (cachedWeather) queryClient.setQueryData(["weather", weatherPositionKey(stored)], cachedWeather);
      setPosition(stored);
    }
    locate();
  }, [locate, queryClient]);

  const query = useQuery({
    queryKey: ["weather", position ? weatherPositionKey(position) : "locating"],
    queryFn: () => {
      if (!position) throw new Error("Localização indisponível");
      return fetchWeather(position).then((weather) => {
        try { localStorage.setItem(WEATHER_KEY, JSON.stringify(weather)); } catch { /* cache is optional */ }
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