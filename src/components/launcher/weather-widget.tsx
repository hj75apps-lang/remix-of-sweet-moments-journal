import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { CloudSun, Droplets, Wind, LocateFixed, RefreshCw } from "lucide-react";
import { WidgetCard, UnavailableState } from "./widget-card";
import { getWeather } from "@/lib/weather.functions";

type Pos = { lat: number; lng: number };
const KEY = "sal.weather-pos";
const weekday = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");

/** Weather card: GPS position -> current conditions and 5-day forecast. */
export function WeatherWidget() {
  const fetchWeather = useServerFn(getWeather);
  const [pos, setPos] = useState<Pos | null>(null);
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
    try { const s = localStorage.getItem(KEY); if (s) setPos(JSON.parse(s) as Pos); } catch { /* ignore */ }
    locate();
  }, [locate]);

  const q = useQuery({
    queryKey: ["weather", pos?.lat.toFixed(2), pos?.lng.toFixed(2)],
    queryFn: () => {
      if (!pos) throw new Error("Localização indisponível");
      return fetchWeather({ data: pos });
    },
    enabled: !!pos,
    staleTime: 15 * 60_000,
    refetchInterval: 30 * 60_000,
    retry: 1,
  });
  const w = q.data;

  return (
    <WidgetCard title={w?.city ? `Clima · ${w.city}` : "Clima"} icon={<CloudSun className="size-4" />}>
      {!pos ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <UnavailableState message={gpsError || "Localizando…"} hint="A previsão aparece com a localização ativada." />
          {gpsError && <button type="button" onClick={locate} className="flex min-h-11 items-center gap-2 rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground"><LocateFixed className="size-4" />Tentar de novo</button>}
        </div>
      ) : q.isError ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <UnavailableState message="Previsão indisponível" hint="Verifique a conexão e a configuração da Climatempo." />
          <button type="button" onClick={() => void q.refetch()} className="flex min-h-11 items-center gap-2 rounded-2xl bg-secondary px-4 text-sm font-semibold"><RefreshCw className="size-4" />Atualizar</button>
        </div>
      ) : !w ? (
        <p className="m-auto text-sm text-muted-foreground" aria-live="polite">Carregando previsão…</p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="flex min-h-0 min-w-0 flex-1 items-center gap-3">
            {w.icon && <img src={w.icon} alt="" className="aspect-square h-[clamp(1.5rem,70cqh,3rem)] shrink-0" />}
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
                {d.icon && <img src={d.icon} alt={d.text} className="size-6" />}
                <span>{d.max}° <span className="text-muted-foreground">{d.min}°</span></span>
                <span className="text-[0.625rem] text-muted-foreground">{d.rain}% chuva</span>
              </li>
            ))}
          </ul>
          <p className="shrink-0 text-right text-[0.625rem] text-muted-foreground">Fonte: {w.source}</p>
        </div>
      )}
    </WidgetCard>
  );
}
