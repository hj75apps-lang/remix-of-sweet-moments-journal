import { Link } from "@tanstack/react-router";
import { CloudSun, Droplets, LocateFixed, MapPin, RefreshCw, Wind } from "lucide-react";
import { WidgetCard, UnavailableState } from "./widget-card";
import { Button } from "@/components/ui/button";
import { useWeather } from "@/hooks/use-weather";
import { shortWeekday, weatherIcon } from "@/components/weather/weather-details";

/** Weather card: GPS position -> current conditions and 5-day forecast. */
export function WeatherWidget() {
  const { position, gpsError, locate, query } = useWeather();
  const w = query.data;
  const CurrentWeatherIcon = w ? weatherIcon(w.code, w.text) : CloudSun;

  const card = (
    <WidgetCard
      title="Clima"
      icon={<CloudSun className="size-4" />}
      className={w ? "cursor-pointer transition hover:border-primary/40" : ""}
    >
      {!position ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <UnavailableState
            message={gpsError || "Localizando…"}
            hint="A previsão aparece com a localização ativada."
          />
          {gpsError && (
            <Button type="button" onClick={locate} className="min-h-11">
              <LocateFixed />
              Tentar de novo
            </Button>
          )}
        </div>
      ) : query.isError ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <UnavailableState
            message="Previsão indisponível"
            hint="Verifique a conexão e tente novamente."
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => void query.refetch()}
            className="min-h-11"
          >
            <RefreshCw />
            Atualizar
          </Button>
        </div>
      ) : !w ? (
        <p className="m-auto text-sm text-muted-foreground" aria-live="polite">
          Carregando previsão…
        </p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <p className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-foreground">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{w.city}</span>
          </p>
          <div className="flex min-h-0 min-w-0 flex-1 items-center gap-3">
            <CurrentWeatherIcon className="size-[1.7rem] shrink-0 text-primary" aria-label={w.text} />
            <div className="min-w-0">
              <p className="font-display text-[clamp(2.125rem,76.5cqh,3.825rem)] font-semibold leading-none">
                {w.temp}°
              </p>
              <p className="truncate text-[clamp(0.6875rem,18cqh,0.875rem)] text-muted-foreground">
                {w.text} · sensação {w.feels}°
              </p>
            </div>
            <div className="ml-auto flex shrink-0 flex-col justify-center gap-[min(0.25rem,4cqh)] text-[clamp(0.625rem,16cqh,0.75rem)] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Droplets className="size-3.5" />
                {w.humidity}%
              </span>
              <span className="flex items-center gap-1">
                <Wind className="size-3.5" />
                {w.wind} km/h
              </span>
            </div>
          </div>
          <ul
            className="wx-days mt-auto grid shrink-0 grid-cols-5 gap-1"
            aria-label="Previsão dos próximos dias"
          >
            {w.days.slice(0, 5).map((d) => {
              const DayIcon = weatherIcon(d.code, d.text);
              return (
                <li
                  key={d.date}
                  className="flex min-w-0 flex-col items-center gap-0.5 rounded-xl bg-secondary/60 py-1 text-xs"
                  title={d.text}
                >
                  <span className="font-semibold capitalize">{shortWeekday(d.date)}</span>
                  <DayIcon className="size-4 text-primary" aria-label={d.text} />
                  <span>
                    {d.max}° <span className="text-muted-foreground">{d.min}°</span>
                  </span>
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
    <Link
      to="/clima"
      aria-label={`Abrir previsão completa para ${w.city}`}
      className="block h-full min-h-0 rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {card}
    </Link>
  );
}
