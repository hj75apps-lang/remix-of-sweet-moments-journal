import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  DEFAULT_VISUAL_SIZING,
  useLauncherSettings,
  type VisualSizing,
} from "@/hooks/use-launcher-settings";

type VisualKey = keyof VisualSizing;
interface Control { key: VisualKey; label: string; hint: string; min?: number; max?: number; step?: number; unit?: string }
interface Group { title: string; controls: Control[] }

const groups: Group[] = [
  { title: "Ícones da tela principal", controls: [
    { key: "appIconScale", label: "Ícones dos aplicativos", hint: "Tela inicial e menu de aplicativos." },
    { key: "appLabelScale", label: "Nomes dos aplicativos", hint: "Rótulos abaixo dos aplicativos." },
    { key: "shortcutIconScale", label: "Ícones dos atalhos", hint: "Acessos rápidos da tela principal." },
    { key: "shortcutTextScale", label: "Textos dos atalhos", hint: "Rótulos dos acessos rápidos." },
  ]},
  { title: "Barra lateral", controls: [
    { key: "dockIconScale", label: "Ícones", hint: "Somente os ícones da barra lateral." },
    { key: "dockTextScale", label: "Textos", hint: "Rótulos acessíveis da barra lateral." },
    { key: "dockSpacing", label: "Espaçamento", hint: "Distância entre os botões.", min: 4, max: 20, step: 2, unit: "px" },
    { key: "dockTouchTarget", label: "Área de toque", hint: "Área clicável, sem ampliar o desenho.", min: 44, max: 72, step: 4, unit: "px" },
  ]},
  { title: "Navegação e status", controls: [
    { key: "navigationIconScale", label: "Ícones de navegação", hint: "Controles de navegação da launcher." },
    { key: "statusIconScale", label: "Ícones de status", hint: "Indicadores próprios da launcher." },
    { key: "statusTextScale", label: "Textos de status", hint: "Informações próprias da launcher." },
  ]},
  { title: "Fontes e textos", controls: [
    { key: "headingTextScale", label: "Títulos e cabeçalhos", hint: "Títulos das telas e seções." },
    { key: "secondaryTextScale", label: "Textos secundários", hint: "Descrições e informações auxiliares." },
    { key: "settingsTextScale", label: "Menus e configurações", hint: "Textos desta área de ajustes." },
  ]},
  { title: "Relógio e indicadores", controls: [
    { key: "clockScale", label: "Números do relógio", hint: "Horário principal do widget." },
    { key: "dateScale", label: "Data", hint: "Dia da semana e data por extenso." },
  ]},
  { title: "Widgets e atalhos", controls: [
    { key: "widgetIconScale", label: "Ícones dos widgets", hint: "Somente símbolos dentro dos widgets." },
    { key: "widgetTextScale", label: "Textos dos widgets", hint: "Informações exibidas nos widgets." },
    { key: "widgetSpacing", label: "Espaçamento dos widgets", hint: "Distância entre cartões da Home.", min: 8, max: 24, step: 2, unit: "px" },
  ]},
];

export function VisualSizeSettings() {
  const { settings, update } = useLauncherSettings();
  const set = (key: VisualKey, value: number) => update({ visual: { ...settings.visual, [key]: value } });
  const resetGroup = (group: Group) => update({ visual: {
    ...settings.visual,
    ...Object.fromEntries(group.controls.map(({ key }) => [key, DEFAULT_VISUAL_SIZING[key]])),
  } });
  const resetAll = () => {
    if (window.confirm("Restaurar todos os tamanhos e espaçamentos? O papel de parede e os demais ajustes serão preservados.")) {
      update({ visual: DEFAULT_VISUAL_SIZING });
    }
  };
  return (
    <section className="visual-size-settings rounded-3xl border bg-card p-4 shadow-[var(--shadow-card)] sm:p-6" aria-labelledby="visual-size-title">
      <div className="flex items-center justify-between gap-3">
        <div><h2 id="visual-size-title" className="text-lg font-semibold">Tamanho e aparência</h2><p className="mt-1 text-sm text-muted-foreground">Cada controle altera somente a área indicada.</p></div>
        <Button type="button" variant="secondary" onClick={resetAll} className="min-h-11 shrink-0 gap-2 rounded-2xl"><RotateCcw className="size-4" />Restaurar padrões</Button>
      </div>
      <div className="mt-4 space-y-2">
        {groups.map((group, index) => <details key={group.title} className="rounded-2xl border bg-secondary/30" open={index === 0}>
          <summary className="cursor-pointer select-none px-4 py-3 font-semibold">{group.title}</summary>
          <div className="space-y-5 border-t p-4">
            {group.controls.map((control) => {
              const value = settings.visual[control.key];
              const unit = control.unit ?? "%";
              return <div key={control.key} data-visual-control={control.key}>
                <div className="flex items-start justify-between gap-3"><label htmlFor={`visual-${control.key}`} className="min-w-0 font-medium">{control.label}<span className="block text-sm font-normal text-muted-foreground">{control.hint}</span></label><span className="shrink-0 font-semibold text-primary" aria-live="polite">{value}{unit}</span></div>
                <div className="mt-3 flex items-center gap-3"><Slider id={`visual-${control.key}`} aria-label={control.label} min={control.min ?? 70} max={control.max ?? 150} step={control.step ?? 5} value={[value]} onValueChange={([next]) => set(control.key, next ?? DEFAULT_VISUAL_SIZING[control.key])} /><Button type="button" size="icon" variant="ghost" title={`Restaurar ${control.label}`} aria-label={`Restaurar ${control.label}`} onClick={() => set(control.key, DEFAULT_VISUAL_SIZING[control.key])} className="size-11 shrink-0 rounded-full"><RotateCcw className="size-4" /></Button></div>
                <p className="mt-1 text-xs text-muted-foreground">Padrão: {DEFAULT_VISUAL_SIZING[control.key]}{unit}</p>
              </div>;
            })}
            <Button type="button" variant="secondary" onClick={() => resetGroup(group)} className="min-h-11 rounded-2xl">Restaurar categoria</Button>
          </div>
        </details>)}
      </div>
    </section>
  );
}