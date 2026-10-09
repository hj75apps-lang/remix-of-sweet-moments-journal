import { ArrowLeft, CloudSun, LocateFixed, RefreshCw } from "lucide-react";
import { WidgetCard, UnavailableState } from "./widget-card";
import { Button } from "@/components/ui/button";
import { useWeather } from "@/hooks/use-weather";
import { WeatherSymbol } from "@/components/weather/weather-symbol";
import { isNightBySun } from "@/components/weather/weather-presentation";
import { WeatherDetails } from "@/components/weather/weather-details";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function WeatherWidget() {
  const { position, gpsError, locate, query } = useWeather();
  const [expanded, setExpanded] = useState(false);
  const backButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!expanded) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const homeGrid = document.getElementById("launcher-home-grid");
    // Keep the Dock active, but remove the covered widgets from the tab order.
    homeGrid?.setAttribute("inert", "");
    homeGrid?.setAttribute("aria-hidden", "true");
    homeGrid?.style.setProperty("visibility", "hidden");
    homeGrid?.style.setProperty("opacity", "0");
    backButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    const onHome = () => setExpanded(false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("launcher:home", onHome);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("launcher:home", onHome);
      homeGrid?.removeAttribute("inert");
      homeGrid?.removeAttribute("aria-hidden");
      homeGrid?.style.removeProperty("visibility");
      homeGrid?.style.removeProperty("opacity");
      previousFocus?.focus();
    };
  }, [expanded]);

  const w = query.data;
  // The expanded forecast belongs to the home content pane, never the viewport.
  const workspace = expanded && typeof document !== "undefined"
    ? document.getElementById("launcher-home-workspace")
    : null;

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
          <div className="weather-reference-row">
            <WeatherSymbol code={w.code} text={w.text} large night={isNightBySun(w)} />
            <p className="weather-reference-temperature">{w.temp}<span>°C</span></p>
            <div className="weather-reading">
              <p className="weather-reference-condition" aria-label="Condição do tempo">{w.text}</p>
              <p className="weather-reference-detail">Sensação de {Number.isFinite(w.feels) ? `${w.feels}°` : "—"}</p>
              <p className="weather-reference-detail" aria-label="Temperaturas de hoje">
                Máx. {w.days[0] ? `${w.days[0].max}°` : "—"} · Mín. {w.days[0] ? `${w.days[0].min}°` : "—"}
              </p>
            </div>
          </div>

          {query.isError && (
            <span className="weather-offline" role="status">Sem conexão · mostrando última previsão</span>
          )}
        </div>
      )}
    </WidgetCard>
  );

  if (!w) return card;

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setExpanded(true);
          }
        }}
        aria-label={`Abrir previsão do tempo para ${w.city}`}
        className="block h-full min-h-0 w-full cursor-pointer rounded-3xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {card}
      </div>

      {workspace && createPortal(
        <section
          className="forecast-overlay absolute inset-0 border border-border bg-card text-card-foreground shadow-[var(--shadow-card)]"
          role="region"
          aria-label={`Previsão do tempo para ${w.city}`}
        >
          <header className="forecast-overlay-header">
            <Button
              ref={backButtonRef}
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setExpanded(false)}
              className="size-11 shrink-0 rounded-2xl"
              aria-label="Voltar à tela inicial"
            >
              <ArrowLeft className="size-5" aria-hidden="true" />
            </Button>
          </header>
          <div className="forecast-viewport">
            <WeatherDetails weather={w} />
          </div>
        </section>,
        workspace,
      )}
    </>
  );
}
