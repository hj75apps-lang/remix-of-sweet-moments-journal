import { createFileRoute } from "@tanstack/react-router";
import { CloudSun, LocateFixed, RefreshCw } from "lucide-react";
import { StatusBar } from "@/components/launcher/status-bar";
import { Dock } from "@/components/launcher/dock";
import { Button } from "@/components/ui/button";
import { WeatherDetails } from "@/components/weather/weather-details";
import { useWeather } from "@/hooks/use-weather";

export const Route = createFileRoute("/clima")({
  head: () => ({
    meta: [
      { title: "Previsão do tempo — Smart Auto Launcher" },
      {
        name: "description",
        content: "Condições atuais e previsão do tempo para os próximos cinco dias.",
      },
      { property: "og:title", content: "Previsão do tempo — Smart Auto Launcher" },
      {
        property: "og:description",
        content: "Resumo das condições atuais e previsão detalhada para cinco dias.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WeatherPage,
});

function WeatherPage() {
  const { position, gpsError, locate, query } = useWeather();
  const weather = query.data;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <StatusBar />
      <main className="flex min-h-0 flex-1 flex-col-reverse gap-3 px-2 pb-2 sm:px-4 sm:pb-4 md:flex-row md:gap-4">
        <Dock />
        <section
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border bg-card"
          aria-label="Previsão do tempo"
        >
          {weather ? (
            <div className="forecast-viewport">
              <WeatherDetails weather={weather} />
            </div>
          ) : (
            <div className="m-auto flex max-w-sm flex-col items-center gap-3 px-6 text-center">
              <CloudSun className="size-14 text-primary" aria-hidden="true" />
              <h1 className="text-xl font-semibold">
                {position ? "Carregando previsão…" : gpsError || "Localizando…"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {query.isError
                  ? "Verifique a conexão e tente novamente."
                  : "A previsão aparece com a localização ativada."}
              </p>
              {gpsError ? (
                <Button type="button" onClick={locate} className="min-h-11">
                  <LocateFixed />
                  Tentar de novo
                </Button>
              ) : query.isError ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void query.refetch()}
                  className="min-h-11"
                >
                  <RefreshCw />
                  Atualizar
                </Button>
              ) : null}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

