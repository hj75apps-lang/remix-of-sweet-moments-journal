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
  Thermometer,
  Umbrella,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { WidgetCard, UnavailableState } from "./widget-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { fetchWeather, weatherPositionKey, type WeatherPosition, type WeatherReport } from "@/services/weather";

const KEY = "sal.weather-pos";
const WEATHER_KEY = "sal.weather-report";
const weekday = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
const fullDay = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "short",
}).replace(".", "");

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

function ExpandedWeather({ weather }: { weather: WeatherReport }) {
  const CurrentIcon = weatherIcon(weather.code, weather.text);

  return (
    <DialogContent className="inset-0 left-0 top-0 h-[100dvh] max-h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 overflow-y-auto border-0 bg-background p-0 duration-300 sm:inset-4 sm:h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:max-w-5xl sm:translate-x-0 sm:translate-y-0 sm:rounded-3xl sm:border">
      <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-4 pb-8 pt-5 sm:px-8 sm:pb-10 sm:pt-7">
        <DialogHeader className="pr-12 text-left">
          <DialogTitle className="flex items-center gap-2 text-xl sm:text-2xl">
            <MapPin className="size-5 shrink-0 text-primary" aria-hidden="true" />
            <span>{weather.city}</span>
          </DialogTitle>
          <DialogDescription>Resumo e previsão para os próximos cinco dias</DialogDescription>
        </DialogHeader>

        <section aria-label="Condição atual" className="mt-6 grid gap-5 border-b pb-6 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-8">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="grid size-20 shrink-0 place-items-center rounded-3xl bg-primary/15 text-primary sm:size-28">
              <CurrentIcon className="size-12 sm:size-16" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-5xl font-semibold leading-none sm:text-7xl">{weather.temp}°</p>
              <p className="mt-2 text-base font-medium sm:text-lg">{weather.text}</p>
              <p className="mt-1 text-sm text-muted-foreground">Sensação térmica de {weather.feels}°</p>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-2 sm:min-w-64">
            <div className="rounded-2xl bg-secondary p-3">
              <dt className="flex items-center gap-2 text-xs text-muted-foreground"><Droplets className="size-4 text-primary" />Umidade</dt>
              <dd className="mt-1 text-lg font-semibold">{weather.humidity}%</dd>
            </div>
            <div className="rounded-2xl bg-secondary p-3">
              <dt className="flex items-center gap-2 text-xs text-muted-foreground"><Wind className="size-4 text-primary" />Vento</dt>
              <dd className="mt-1 text-lg font-semibold">{weather.wind} km/h</dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="five-day-title" className="mt-6">
          <h3 id="five-day-title" className="text-base font-semibold sm:text-lg">Próximos 5 dias</h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-5 sm:gap-3">
            {weather.days.slice(0, 5).map((day) => {
              const DayIcon = weatherIcon(day.code, day.text);
              return (
                <li key={day.date} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border bg-card p-3 sm:flex sm:min-h-56 sm:flex-col sm:items-stretch sm:p-4">
                  <div className="min-w-0 sm:text-center">
                    <p className="font-semibold capitalize">{fullDay(day.date)}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground sm:whitespace-normal">{day.text}</p>
                  </div>
                  <DayIcon className="size-9 text-primary sm:mx-auto sm:my-3 sm:size-12" aria-hidden="true" />
                  <div className="col-span-2 grid grid-cols-3 gap-2 border-t pt-3 text-center text-xs sm:mt-auto">
                    <div>
                      <Thermometer className="mx-auto mb-1 size-4 text-primary" aria-hidden="true" />
                      <span className="font-semibold">{day.max}°</span>
                      <span className="block text-muted-foreground">máx.</span>
                    </div>
                    <div>
                      <Thermometer className="mx-auto mb-1 size-4 text-muted-foreground" aria-hidden="true" />
                      <span className="font-semibold">{day.min}°</span>
                      <span className="block text-muted-foreground">mín.</span>
                    </div>
                    <div>
                      <Umbrella className="mx-auto mb-1 size-4 text-primary" aria-hidden="true" />
                      <span className="font-semibold">{day.rain}%</span>
                      <span className="block text-muted-foreground">chuva</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </DialogContent>
  );
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

  const card = (
    <WidgetCard title="Clima" icon={<CloudSun className="size-4" />} className={w ? "cursor-pointer transition hover:border-primary/40" : undefined}>
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

  if (!w) return card;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          aria-label={`Abrir previsão completa para ${w.city}`}
          className="h-full min-h-0 rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") event.currentTarget.click();
          }}
        >
          {card}
        </div>
      </DialogTrigger>
      <ExpandedWeather weather={w} />
    </Dialog>
  );
}
