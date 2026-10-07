import { Link } from "@tanstack/react-router";
import { CloudSun, LocateFixed, MapPin, RefreshCw } from "lucide-react";
import { WidgetCard, UnavailableState } from "./widget-card";
import { Button } from "@/components/ui/button";
import { useWeather } from "@/hooks/use-weather";
import { WeatherSymbol } from "@/components/weather/weather-symbol";

function isNightBySun(weather: { sunrise?: string; sunset?: string }) {
  const now = Date.now();
  const sunrise = weather.sunrise ? Date.parse(weather.sunrise) : NaN;
  const sunset = weather.sunset ? Date.parse(weather.sunset) : NaN;
  return Number.isFinite(sunrise) && Number.isFinite(sunset) ? now < sunrise || now >= sunset : new Date().getHours() < 6 || new Date().getHours() >= 18;
}

function relativeUpdatedAt(timestamp?: number) {
  if (!timestamp) return "";
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000));
  return minutes < 1 ? "Atualizado agora" : `Atualizado há ${minutes} min`;
}

function WeatherForecastStrip({ days }: { days: { date: string; max: number; min: number; code: number | undefined; text: string }[] }) {
  const labels = days.slice(0, 5).map((day, index) =>
    index === 0 ? "Hoje" : new Date(`${day.date}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
  );

  return (
    <div className="weather-days glass-strip" aria-label="Previsão resumida">
      {days.slice(0, 5).map((day, index) => (
        <div className="weather-day" key={day.date}>
          <span className="weather-day-label">{labels[index]}</span>
          <span className="weather-day-icon" aria-label={day.text}>
            <WeatherSymbol code={day.code} text={day.text} />
          </span>
          <span className="weather-day-temps">
            <b>{day.max}°</b><small>{day.min}°</small>
          </span>
        </div>
      ))}
    </div>
  );
}

export function WeatherWidget() {
  const { position, gpsError, locate, query } = useWeather();
  const w = query.data;

  const card = (
    <WidgetCard
      title="Clima"
      icon={<CloudSun className="size-4" />}
      hideHeader
      className={w ? "weather-widget cursor-pointer transition hover:scale-[1.005]" : "weather-widget"}
    >
      {!position && !w ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <UnavailableState message={gpsError || "Localizando…"} hint="A previsão aparece com a localização ativada." />
          {gpsError && (
            <Button type="button" onClick={locate} className="min-h-11">
              <LocateFixed />
              Tentar de novo
            </Button>
          )}
        </div>
      ) : query.isError && !w ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <UnavailableState message="Previsão indisponível" hint="Verifique a conexão e tente novamente." />
          <Button type="button" variant="secondary" onClick={() => void query.refetch()} className="min-h-11">
            <RefreshCw /> Atualizar
          </Button>
        </div>
      ) : !w ? (
        <p className="m-auto text-sm text-muted-foreground" aria-live="polite">Carregando previsão…</p>
      ) : (
        <div className={`weather-summary flex min-h-0 flex-1 flex-col${query.isFetching ? " weather-updating" : ""}`}>
          <div className="weather-topline">
            <div className="weather-location">
              <MapPin className="weather-location-icon" aria-hidden="true" />
              <span className="truncate">{w.city}</span>
            </div>
            <span className="weather-updated">{relativeUpdatedAt(w.updatedAt)}</span>
          </div>

          <div className="weather-hero">
            <div className="weather-reading">
              <p className="weather-temperature">{w.temp}<span>°</span></p>
              <p className="weather-condition">{w.text}</p>
              <div className="weather-extremes" aria-label={`Máxima ${w.days[0]?.max} graus, mínima ${w.days[0]?.min} graus`}>
                <span className="weather-extreme weather-extreme-high"><span>Máx</span><b>{w.days[0]?.max}°</b></span>
                <span className="weather-extreme weather-extreme-low"><span>Mín</span><b>{w.days[0]?.min}°</b></span>
              </div>
            </div>
            <WeatherSymbol code={w.code} text={w.text} large night={isNightBySun(w)} />
          </div>

          <div className="weather-forecast-medium">
            <WeatherForecastStrip days={w.days} />
          </div>

          {query.isError && (
            <span className="weather-offline" role="status">Sem conexão · mostrando última previsão</span>
          )}
          <div className="weather-forecast-link"><span>Ver previsão completa</span></div>
        </div>
      )}
    </WidgetCard>
  );

  if (!w) return card;

  return (
    <Link
      to="/clima"
      aria-label={`Abrir previsão completa para ${w.city}`}
      className="block h-full min-h-0 rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {card}
    </Link>
  );
}
