import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CloudSun, Droplets, Wind, LocateFixed, RefreshCw } from "lucide-react";
import { WidgetCard, UnavailableState } from "./widget-card";
import { Button } from "@/components/ui/button";
import { fetchWeather, weatherPositionKey, type WeatherPosition, type WeatherReport } from "@/services/weather";

const KEY = "sal.weather-pos";
const WEATHER_KEY = "sal.weather-report";
const weekday = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");

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

  return (
    <WidgetCard title={w?.city ? `Clima · ${w.city}` : "Clima"} icon={<CloudSun className="size-4" />}>
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
          <div className="flex min-h-0 min-w-0 flex-1 items-center gap-3">
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
            {w.days.slice(0, 5).map((d) => (
              <li key={d.date} className="flex min-w-0 flex-col items-center rounded-xl bg-secondary/60 py-1 text-xs" title={d.text}>
                <span className="font-semibold capitalize">{weekday(d.date)}</span>
                <span>{d.max}° <span className="text-muted-foreground">{d.min}°</span></span>
                <span className="text-[0.625rem] text-muted-foreground">{d.rain}% chuva</span>
              </li>
            ))}
          </ul>
          <p className="shrink-0 text-right text-[0.625rem] text-muted-foreground">
            Fonte: <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="underline underline-offset-2">{w.source}</a>
          </p>
        </div>
      )}
    </WidgetCard>
  );
}
