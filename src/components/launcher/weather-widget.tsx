import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  LocateFixed,
  MapPin,
  RefreshCw,
  Sun,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { WidgetCard, UnavailableState } from "./widget-card";
import { Button } from "@/components/ui/button";
import { fetchWeather, weatherPositionKey, type WeatherPosition, type WeatherReport } from "@/services/weather";

const KEY = "sal.weather-pos";
const WEATHER_KEY = "sal.weather-report";
const weekday = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");

function weatherIcon(code: number | undefined, description: string): LucideIcon {
  if (code === 0) return Sun;
  if (code === 1 || code === 2) return CloudSun;
  if (code === 3) return Cloud;
  if (code === 45 || code === 48) return CloudFog;
  if ((code !== undefined && code >= 51 && code <= 67) || (code !== undefined && code >= 80 && code <= 82)) return CloudRain;
  if (code !== undefined && code >= 71 && code <= 86) return CloudSnow;
  if (code !== undefined && code >= 95) return CloudLightning;

  const normalized = description.toLocaleLowerCase("pt-BR");
  if (normalized.includes("tempestade")) return CloudLightning;
  if (normalized.includes("neve")) return CloudSnow;
  if (normalized.includes("chuva") || normalized.includes("garoa")) return CloudRain;
  if (normalized.includes("neblina")) return CloudFog;
  if (normalized.includes("nublado")) return Cloud;
  return CloudSun;
}

function readStoredPosition(): WeatherPosition | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<WeatherPosition> | null;
    return typeof parsed?.lat === "number" && typeof parsed.lng === "number"
      ? { lat: parsed.lat, lng: parsed.lng }
      : null;
  } catch {
    return null;
  }
}

function readStoredWeather(): WeatherReport | undefined {
  try {
    const parsed = JSON.parse(localStorage.getItem(WEATHER_KEY) ?? "null") as WeatherReport | null;
    return parsed?.source === "Open-Meteo" && Array.isArray(parsed.days) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/** Weather card: GPS position -> current conditions and 5-day forecast. */
export function WeatherWidget() {
  const [pos, setPos] = useState<WeatherPosition | null>(null);
  const [gpsError, setGpsError] = useState("");

  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) { setGpsError("GPS indisponível neste aparelho"); return; }
    setGpsError("");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const next = { lat: p.coords.latitude, lng: p.coords.longitude };
        setPos(next);
        try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
      },
      (e) => setGpsError(e.code === e.PERMISSION_DENIED ? "Permissão de localização negada" : "Não foi possível obter a localização"),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60_000 },
    );
  }, []);

  useEffect(() => {
    const stored = readStoredPosition();
    if (stored) setPos(stored);
    locate();
  }, [locate]);

  const q = useQuery({
    queryKey: ["weather", pos ? weatherPositionKey(pos) : "locating"],
    queryFn: () => {
      if (!pos) throw new Error("Localização indisponível");
      return fetchWeather(pos).then((weather) => {
        try { localStorage.setItem(WEATHER_KEY, JSON.stringify(weather)); } catch { /* ignore */ }
        return weather;
      });
    },
    enabled: !!pos,
    initialData: readStoredWeather,
    initialDataUpdatedAt: 0,
    staleTime: 15 * 60_000,
    refetchInterval: 30 * 60_000,
    retry: 2,
  });
  const w = q.data;
  const CurrentWeatherIcon = w ? weatherIcon(w.code, w.text) : CloudSun;

  return (
    <WidgetCard title="Clima" icon={<CloudSun className="size-4" />}>
      {!pos ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <UnavailableState message={gpsError || "Localizando…"} hint="A previsão aparece com a localização ativada." />
          {gpsError && <Button type="button" onClick={locate} className="min-h-11"><LocateFixed />Tentar de novo</Button>}
        </div>
      ) : q.isError ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <UnavailableState message="Previsão indisponível" hint="Verifique a conexão e tente novamente." />
          <Button type="button" variant="secondary" onClick={() => void q.refetch()} className="min-h-11"><RefreshCw />Atualizar</Button>
        </div>
      ) : !w ? (
        <p className="m-auto text-sm text-muted-foreground" aria-live="polite">Carregando previsão…</p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <p className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-foreground">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{w.city}</span>
          </p>
          <div className="flex min-h-0 min-w-0 flex-1 items-center gap-3">
            <CurrentWeatherIcon className="size-10 shrink-0 text-primary" aria-label={w.text} />
            <div className="min-w-0">
              <p className="font-display text-[clamp(1.25rem,45cqh,2.25rem)] font-semibold leading-none">{w.temp}°</p>
              <p className="truncate text-[clamp(0.6875rem,18cqh,0.875rem)] text-muted-foreground">{w.text} · sensação {w.feels}°</p>
            </div>
            <div className="ml-auto flex shrink-0 flex-col justify-center gap-[min(0.25rem,4cqh)] text-[clamp(0.625rem,16cqh,0.75rem)] text-muted-foreground">
              <span className="flex items-center gap-1"><Droplets className="size-3.5" />{w.humidity}%</span>
              <span className="flex items-center gap-1"><Wind className="size-3.5" />{w.wind} km/h</span>
            </div>
          </div>
          <ul className="wx-days mt-auto grid shrink-0 grid-cols-5 gap-1" aria-label="Previsão dos próximos dias">
            {w.days.slice(0, 5).map((d) => {
              const DayIcon = weatherIcon(d.code, d.text);
              return (
                <li key={d.date} className="flex min-w-0 flex-col items-center gap-0.5 rounded-xl bg-secondary/60 py-1 text-xs" title={d.text}>
                  <span className="font-semibold capitalize">{weekday(d.date)}</span>
                  <DayIcon className="size-4 text-primary" aria-label={d.text} />
                  <span>{d.max}° <span className="text-muted-foreground">{d.min}°</span></span>
                  <span className="text-[0.625rem] text-muted-foreground">{d.rain}% chuva</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </WidgetCard>
  );
}
