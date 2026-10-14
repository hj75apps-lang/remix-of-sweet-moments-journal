import { createFileRoute } from "@tanstack/react-router";
import { StatusBar } from "@/components/launcher/status-bar";
import { Dock } from "@/components/launcher/dock";
import { Slider } from "@/components/ui/slider";
import { useGlass, DEFAULT_GLASS } from "@/hooks/use-glass";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { LauncherSettingsPanel } from "@/components/launcher/launcher-settings-panel";

export const Route = createFileRoute("/ajustes")({
  head: () => ({
    meta: [
      { title: "Ajustes — Smart Auto Launcher" },
      {
        name: "description",
        content: "Personalize o papel de parede, o tema e os ajustes da sua central multimídia.",
      },
      { property: "og:title", content: "Ajustes — Smart Auto Launcher" },
      { property: "og:description", content: "Papel de parede local, tema e ajustes da central multimídia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const glass = useGlass();
  const theme = useTheme();
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <StatusBar />
      <main className="flex min-h-0 flex-1 flex-col-reverse gap-3 px-2 pb-2 sm:px-4 sm:pb-4 md:flex-row md:gap-4">
        <Dock />
        <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto md:gap-4">
          <h1 className="px-2 text-2xl font-semibold">Ajustes</h1>
          <div className="rounded-3xl border bg-card p-6 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between gap-4">
              <label htmlFor="glass" className="text-lg font-semibold">
                Efeito vidro líquido
              </label>
              <span className="text-sm font-semibold text-primary" aria-live="polite">
                {glass.level === 0 ? "Desligado" : `${glass.level}%`}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Deixa cartões, menu e barras translúcidos e desfocados. Reduza se a central ficar
              lenta.
            </p>
            <Slider
              id="glass"
              aria-label="Intensidade do vidro líquido"
              className="mt-6"
              min={0}
              max={100}
              step={5}
              value={[glass.level]}
              onValueChange={([v]) => glass.set(v ?? DEFAULT_GLASS)}
            />
            <div className="mt-4 flex gap-2">
              {[0, 25, 50, 75, 100].map((v) => (
                <Button
                  key={v}
                  type="button"
                  variant="secondary"
                  onClick={() => glass.set(v)}
                  className="min-h-11 flex-1 rounded-2xl bg-secondary text-sm font-semibold transition active:scale-95"
                >
                  {v === 0 ? "Off" : `${v}%`}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-3xl border bg-card p-6 shadow-[var(--shadow-card)]">
            <div>
              <span className="text-lg font-semibold">Tema</span>
              {theme.automaticNight && (
                <p className="mt-1 text-sm text-muted-foreground">Modo noturno automático ativo</p>
              )}
            </div>
            <Button
              type="button"
              onClick={theme.toggle}
              className="min-h-11 rounded-2xl px-5 font-semibold"
            >
              {theme.mode === "dark" ? "Noturno" : "Diurno"}
            </Button>
          </div>
          <LauncherSettingsPanel />
        </section>
      </main>
    </div>
  );
}
