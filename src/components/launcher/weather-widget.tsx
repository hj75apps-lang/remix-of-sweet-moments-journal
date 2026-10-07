import { Link } from "@tanstack/react-router";
import { CloudSun, Droplets, LocateFixed, RefreshCw, Wind } from "lucide-react";
import { WidgetCard, UnavailableState } from "./widget-card";
import { Button } from "@/components/ui/button";
import { useWeather } from "@/hooks/use-weather";
import { WeatherSymbol } from "@/components/weather/weather-symbol";

/** Weather card: GPS position -> current conditions and 5-day forecast. */
export function WeatherWidget() {
  const { position, gpsError, locate, query } = useWeather();
  const w = query.data;

  const card = (
    <WidgetCard
      title="Clima"
      icon={<CloudSun className="size-4" />}
      hideHeader
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
        <div className="weather-summary flex min-h-0 flex-1 flex-col gap-2">
          <div className="flex items-center gap-2 pt-1 pr-2">
            <p className="weather-city flex min-w-0 items-center gap-1.5 font-semibold text-foreground">
              <span className="truncate">{w.city}</span>
            </p>
          </div>
          <div className="weather-current flex min-h-0 min-w-0 flex-1 items-center gap-3">
            <WeatherSymbol code={w.code} text={w.text} />
            <div className="min-w-0 flex-1">
              <p className="weather-temperature flex items-start font-display font-semibold leading-none tabular-nums">
                {w.temp}<span className="weather-unit mt-1 font-medium">°C</span>
              </p>
              <p className="weather-condition mt-2 font-medium leading-tight text-muted-foreground">
                {w.text}
              </p>
            </div>
            <div className="weather-measures ml-auto flex shrink-0 flex-col justify-center gap-2 text-muted-foreground">
              <span className="flex items-center gap-1">
                <Droplets className="size-3.5 weather-rain" />
                {w.humidity}%
              </span>
              <span className="flex items-center gap-1">
                <Wind className="size-3.5" />
                {w.wind} km/h
              </span>
            </div>
          </div>
          <span className="weather-forecast-link mt-auto shrink-0 text-center font-semibold text-primary">Ver previsão completa</span>
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
