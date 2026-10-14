import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DEFAULT_VISUAL_SIZING,
  useLauncherSettings,
  type VisualSizing,
} from "@/hooks/use-launcher-settings";

type SizingKey = keyof VisualSizing;
interface SizingControl {
  key: SizingKey;
  label: string;
  hint: string;
  min?: number;
  max?: number;
}
interface SizingGroup { title: string; controls: SizingControl[] }

const GROUPS: SizingGroup[] = [
  { title: "Ícones dos aplicativos", controls: [
    { key: "homeAppIcon", label: "Ícones da tela inicial", hint: "Apenas os aplicativos adicionados à tela inicial." },
    { key: "homeAppLabel", label: "Nomes na tela inicial", hint: "Rótulos dos aplicativos da tela inicial." },
    { key: "appsIcon", label: "Ícones do menu Apps", hint: "Não altera a barra lateral.", max: 120 },
    { key: "appsLabel", label: "Nomes no menu Apps", hint: "Apenas os nomes da lista de aplicativos." },
  ]},
  { title: "Barra lateral", controls: [
    { key: "dockIcon", label: "Ícones", hint: "Atalhos fixos e aplicativos recentes.", max: 120 },
    { key: "dockGap", label: "Espaçamento", hint: "Distância entre os itens da barra.", max: 130 },
    { key: "dockTouch", label: "Área de toque", hint: "Amplia o toque sem alterar outros controles.", min: 85, max: 120 },
    { key: "statusIcon", label: "Comando de voz", hint: "Tamanho do controle global do microfone.", max: 120 },
  ]},
  { title: "Fontes e textos", controls: [
    { key: "headings", label: "Títulos e cabeçalhos", hint: "Mantém família, peso e hierarquia atuais." },
    { key: "secondaryText", label: "Textos secundários", hint: "Descrições, legendas e informações complementares." },
    { key: "settingsText", label: "Menus e configurações", hint: "Textos da área de Ajustes." },
  ]},
  { title: "Relógio e data", controls: [
    { key: "clock", label: "Números do relógio", hint: "Preserva posição e formato do horário.", max: 125 },
    { key: "date", label: "Data", hint: "Apenas a data exibida sob o relógio." },
  ]},
  { title: "Widgets e atalhos", controls: [
    { key: "widgetIcon", label: "Ícones dos widgets", hint: "Elementos gráficos dentro dos widgets.", max: 130 },
    { key: "widgetText", label: "Textos dos widgets", hint: "Informações exibidas dentro dos cartões." },
    { key: "shortcutIcon", label: "Ícones dos atalhos", hint: "Acessos rápidos do widget de favoritos.", max: 130 },
    { key: "shortcutLabel", label: "Rótulos dos atalhos", hint: "Nomes dos acessos rápidos." },
  ]},
];

export function VisualSizingSettings() {
  const { settings, update } = useLauncherSettings();
  const setValue = (key: SizingKey, value: number) => update({
    visualSizing: { ...settings.visualSizing, [key]: value },
  });
  const resetGroup = (controls: SizingControl[]) => update({
    visualSizing: controls.reduce(
      (next, control) => ({ ...next, [control.key]: DEFAULT_VISUAL_SIZING[control.key] }),
      settings.visualSizing,
    ),
  });

  return (
    <div className="rounded-3xl border bg-card p-6 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Tamanhos e espaçamentos</h2>
          <p className="mt-1 text-sm text-muted-foreground">Cada ajuste altera somente a área indicada e é salvo automaticamente.</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="secondary" className="min-h-11 gap-2 rounded-2xl">
              <RotateCcw className="size-4" /> Restaurar padrões
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Restaurar todos os tamanhos?</AlertDialogTitle>
              <AlertDialogDescription>Somente tamanhos, espaçamentos e áreas de toque serão restaurados. As demais preferências serão preservadas.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => update({ visualSizing: DEFAULT_VISUAL_SIZING })}>Restaurar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {GROUPS.map((group) => (
          <fieldset key={group.title} className="min-w-0 space-y-5 border-t border-border pt-4">
            <div className="flex items-center justify-between gap-3">
              <legend className="text-base font-semibold">{group.title}</legend>
              <Button type="button" variant="ghost" size="sm" onClick={() => resetGroup(group.controls)}>Padrão</Button>
            </div>
            {group.controls.map((control) => {
              const value = settings.visualSizing[control.key];
              return (
                <div key={control.key}>
                  <div className="flex items-start justify-between gap-4">
                    <label htmlFor={`size-${control.key}`} className="min-w-0 font-medium">
                      {control.label}
                      <span className="block text-sm font-normal text-muted-foreground">{control.hint}</span>
                    </label>
                    <output className="shrink-0 text-sm font-semibold text-primary">{value}%</output>
                  </div>
                  <Slider
                    id={`size-${control.key}`}
                    aria-label={control.label}
                    className="mt-3"
                    min={control.min ?? 70}
                    max={control.max ?? 150}
                    step={5}
                    value={[value]}
                    onValueChange={([next]) => setValue(control.key, next ?? DEFAULT_VISUAL_SIZING[control.key])}
                  />
                </div>
              );
            })}
          </fieldset>
        ))}
      </div>
    </div>
  );
}