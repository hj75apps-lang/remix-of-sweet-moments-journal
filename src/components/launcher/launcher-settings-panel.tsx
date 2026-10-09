import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useLauncherSettings, type LauncherSettings } from "@/hooks/use-launcher-settings";
import {
  errorMessage,
  getDeviceInfo,
  openAppSettings,
  openHomeSettings,
} from "@/services/launcher-system";
import { useNavigationApps } from "@/services/navigation-apps";
import { VEHICLE_ICONS } from "@/services/vehicle-icon";
import { VehicleIcon } from "./vehicle-icon";
import { MAP_VIEWS } from "@/services/navigation-view";

type BoolKey = "immersive" | "keepScreenOn" | "autostart" | "clock24h" | "animations";
const TOGGLES: Array<{ key: BoolKey; label: string; hint: string }> = [
  { key: "autostart", label: "Abrir ao ligar a central", hint: "Inicia o Launcher após o boot." },
  { key: "immersive", label: "Tela cheia", hint: "Oculta as barras do Android." },
  { key: "keepScreenOn", label: "Manter tela ligada", hint: "Evita que a tela apague dirigindo." },
  { key: "clock24h", label: "Relógio 24 horas", hint: "Desligado usa AM/PM." },
  { key: "animations", label: "Animações", hint: "Desligue em centrais mais lentas." },
];

const card = "rounded-3xl border bg-card p-6 shadow-[var(--shadow-card)]";

const FONT_SCALES = new Set(["24px", "26px", "28px"]);

function readFontScale(): string {
  if (typeof window === "undefined") return "24px";
  try {
    const stored = localStorage.getItem("smart_auto_font_scale") ?? localStorage.getItem("font_size");
    return stored && FONT_SCALES.has(stored) ? stored : "24px";
  } catch { return "24px"; }
}

export function LauncherSettingsPanel() {
  const [fontScale, setFontScale] = useState<string>(readFontScale);

  useEffect(() => {
    if (typeof document === "undefined") return;
    // Keep the browser root size fixed: changing html { font-size } would
    // rescale every rem-based dimension in the launcher when this page mounts.
    document.documentElement.style.setProperty("--font-scale", fontScale);
    document.documentElement.style.removeProperty("font-size");
    try {
      localStorage.setItem("smart_auto_font_scale", fontScale);
      localStorage.setItem("font_size", fontScale);
    } catch { /* keep the current choice in memory */ }
  }, [fontScale]);

  const { settings, update } = useLauncherSettings();
  const { apps: navigationApps, ready: navigationReady } = useNavigationApps();
  const info = useQuery({ queryKey: ["device-info"], queryFn: getDeviceInfo, staleTime: 60_000 });
  const device = info.data;
  const run = (fn: () => Promise<void>) => fn().catch((e: unknown) => toast.error(errorMessage(e)));
  const setBool = (key: BoolKey, v: boolean) => update({ [key]: v } as Partial<LauncherSettings>);

  return (
    <>
      <div className={card}>
        <h2 className="text-lg font-semibold">Launcher</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {device
            ? device.isDefaultHome
              ? `Tela inicial padrão em ${device.manufacturer} ${device.model} (Android API ${device.sdk}).`
              : "Ainda não é a tela inicial padrão desta central."
            : "Recursos do sistema disponíveis apenas no app instalado na central."}
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button className="min-h-12 rounded-2xl" onClick={() => void run(openHomeSettings)}>
            Definir como tela inicial
          </Button>
          <Button
            variant="secondary"
            className="min-h-12 rounded-2xl"
            onClick={() => void run(openAppSettings)}
          >
            Permissões do app
          </Button>
        </div>
        <ul className="mt-4 divide-y">
          {TOGGLES.map((t) => (
            <li key={t.key} className="flex min-h-14 items-center justify-between gap-4 py-2">
              <label htmlFor={`set-${t.key}`} className="min-w-0">
                <span className="block font-medium">{t.label}</span>
                <span className="block text-sm text-muted-foreground">{t.hint}</span>
              </label>
              <Switch
                id={`set-${t.key}`}
                checked={settings[t.key]}
                onCheckedChange={(v) => setBool(t.key, v)}
              />
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3 rounded-3xl border bg-card p-6 shadow-[var(--shadow-card)]">
        <h3 className="text-[24px] font-semibold text-foreground">
          Tamanho da Fonte (Padrão Automotivo)
        </h3>
        <p className="text-[16px] text-muted-foreground">
          Texto principal mínimo de 24px, títulos de 32px a 48px e subtextos entre 16px e 20px (mínimo absoluto de 14px).
        </p>
        <div className="grid grid-cols-3 gap-2 pt-2">
          {[
            { label: "Normal (24px)", value: "24px" },
            { label: "Grande (26px)", value: "26px" },
            { label: "Máximo (28px)", value: "28px" },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFontScale(item.value)}
              className={`flex min-h-12 items-center justify-center rounded-xl border px-3 text-[16px] font-medium transition ${
                fontScale === item.value
                  ? "border-primary bg-primary/25 text-primary"
                  : "border-border bg-secondary/50 hover:bg-accent"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className={card}>
        <h2 className="text-lg font-semibold">Aparência dos Botões e Ícones</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Personalize a cor base e a opacidade dos botões do Launcher e do Dock.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="button-color-input" className="block text-sm font-medium mb-2">
              Cor personalizada
            </label>
            <div className="flex items-center gap-3">
              <input
                id="button-color-input"
                type="color"
                value={settings.buttonColor || "#3b82f6"}
                onChange={(e) => update({ buttonColor: e.target.value })}
                className="size-12 rounded-xl border bg-transparent cursor-pointer"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => update({ buttonColor: "" })}
                className="rounded-xl"
              >
                Restaurar padrão
              </Button>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="button-opacity" className="text-sm font-medium">
                Opacidade ({settings.buttonOpacity}%)
              </label>
            </div>
            <Slider
              id="button-opacity"
              aria-label="Opacidade dos botões"
              className="mt-3"
              min={20}
              max={100}
              step={5}
              value={[settings.buttonOpacity]}
              onValueChange={([v]) => update({ buttonOpacity: v ?? 100 })}
            />
          </div>
        </div>
      </div>

      <div className={card}>
        <div className="flex items-center justify-between gap-4">
          <label htmlFor="brightness" className="text-lg font-semibold">
            Brilho da tela
          </label>
          <Button
            variant={settings.brightness < 0 ? "default" : "secondary"}
            className="min-h-11 rounded-2xl"
            onClick={() => update({ brightness: settings.brightness < 0 ? 0.8 : -1 })}
          >
            {settings.brightness < 0 ? "Automático" : `${Math.round(settings.brightness * 100)}%`}
          </Button>
        </div>
        <Slider
          id="brightness"
          aria-label="Brilho da tela"
          className="mt-6"
          min={5}
          max={100}
          step={5}
          disabled={settings.brightness < 0}
          value={[settings.brightness < 0 ? 80 : Math.round(settings.brightness * 100)]}
          onValueChange={([v]) => update({ brightness: (v ?? 80) / 100 })}
        />
      </div>

      <div className={card}>
        <h2 className="text-lg font-semibold">Navegação padrão</h2>
        <fieldset className="mt-4">
          <legend className="text-base font-medium">Visualização do mapa</legend>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {MAP_VIEWS.map((view) => (
              <Button key={view.value} type="button" variant="secondary"
                aria-pressed={settings.mapView === view.value}
                className="min-h-12 whitespace-normal rounded-lg border border-border px-2 aria-pressed:border-primary aria-pressed:bg-primary/15"
                onClick={() => update({ mapView: view.value })}>
                {view.label}
              </Button>
            ))}
          </div>
        </fieldset>
        <fieldset className="mt-4">
          <legend className="text-base font-medium">Ícone do veículo no mapa</legend>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {VEHICLE_ICONS.map((icon) => (
              <Button key={icon.value} type="button" variant="secondary"
                aria-pressed={settings.vehicleIcon === icon.value}
                className="h-auto min-h-28 flex-col gap-2 whitespace-normal rounded-lg border border-border px-2 py-3 text-sm leading-snug aria-pressed:border-primary aria-pressed:bg-primary/15"
                onClick={() => update({ vehicleIcon: icon.value })}>
                <VehicleIcon icon={icon.value} />{icon.label}
              </Button>
            ))}
          </div>
        </fieldset>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {[...navigationApps, { id: "system" as const, label: "Perguntar sempre" }].map((a) => {
            return (
              <Button
                key={a.id}
                variant={settings.navApp === a.id ? "default" : "secondary"}
                aria-pressed={settings.navApp === a.id}
                className="min-h-12 rounded-2xl"
                onClick={() => update({ navApp: a.id })}
              >
                {a.label}
              </Button>
            );
          })}
        </div>
        {navigationReady && settings.navApp !== "system" && !navigationApps.some(a => a.id === settings.navApp) && <p role="status" className="mt-3 text-sm text-muted-foreground">Escolha outro navegador: o anterior não está instalado.</p>}
      </div>
    </>
  );
}
