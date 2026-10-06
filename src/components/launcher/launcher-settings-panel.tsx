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
  type NavApp,
} from "@/services/launcher-system";

type BoolKey = "immersive" | "keepScreenOn" | "autostart" | "clock24h" | "animations";
const TOGGLES: Array<{ key: BoolKey; label: string; hint: string }> = [
  { key: "autostart", label: "Abrir ao ligar a central", hint: "Inicia o Launcher após o boot." },
  { key: "immersive", label: "Tela cheia", hint: "Oculta as barras do Android." },
  { key: "keepScreenOn", label: "Manter tela ligada", hint: "Evita que a tela apague dirigindo." },
  { key: "clock24h", label: "Relógio 24 horas", hint: "Desligado usa AM/PM." },
  { key: "animations", label: "Animações", hint: "Desligue em centrais mais lentas." },
];
const NAV_APPS: Array<{ id: NavApp; label: string }> = [
  { id: "maps", label: "Google Maps" },
  { id: "waze", label: "Waze" },
  { id: "system", label: "Padrão do sistema" },
];

const card = "rounded-3xl border bg-card p-6 shadow-[var(--shadow-card)]";

export function LauncherSettingsPanel() {
  const { settings, update } = useLauncherSettings();
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
          <Button variant="secondary" className="min-h-12 rounded-2xl" onClick={() => void run(openAppSettings)}>
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

      <div className={card}>
        <div className="flex items-center justify-between gap-4">
          <label htmlFor="brightness" className="text-lg font-semibold">Brilho da tela</label>
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
        <h2 className="text-lg font-semibold">App de navegação padrão</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {NAV_APPS.map((a) => {
            const missing =
              device && ((a.id === "maps" && !device.googleMaps) || (a.id === "waze" && !device.waze));
            return (
              <Button
                key={a.id}
                variant={settings.navApp === a.id ? "default" : "secondary"}
                aria-pressed={settings.navApp === a.id}
                className="min-h-12 rounded-2xl"
                onClick={() => update({ navApp: a.id })}
              >
                {a.label}
                {missing ? " (não instalado)" : ""}
              </Button>
            );
          })}
        </div>
      </div>
    </>
  );
}
