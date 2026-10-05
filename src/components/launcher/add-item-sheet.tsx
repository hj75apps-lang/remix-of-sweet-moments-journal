import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import type { AppId, HomeItem, WidgetKind } from "@/types/home";
import { appRegistry, appSizes, widgetRegistry } from "./home-registry";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

interface AddItemSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (item: Omit<HomeItem, "id">) => void;
}

/** Picker for widgets and app shortcuts. */
export function AddItemSheet({ open, onOpenChange, onAdd }: AddItemSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[420px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Adicionar à tela inicial</SheetTitle>
          <SheetDescription>Escolha um widget ou atalho de app.</SheetDescription>
        </SheetHeader>
        <h3 className="mt-6 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Widgets</h3>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {(Object.keys(widgetRegistry) as WidgetKind[]).map((kind) => {
            const def = widgetRegistry[kind];
            return (
              <PickerButton key={kind} label={def.label} icon={<def.icon className="size-6" />}
                onClick={() => onAdd({ type: "WIDGET", ref: kind, size: def.sizes[def.sizes.length - 1] ?? { w: 2, h: 1 } })} />
            );
          })}
        </div>
        <h3 className="mt-6 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Apps</h3>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {(Object.keys(appRegistry) as AppId[]).map((id) => {
            const app = appRegistry[id];
            return (
              <PickerButton key={id} label={app.label} icon={<app.icon className="size-6" />}
                onClick={() => onAdd({ type: "APP", ref: id, size: { w: 1, h: 1 } })} />
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PickerButton({ label, icon, onClick }: { label: string; icon: ReactNode; onClick: () => void }) {
  return (
    <Button type="button" variant="secondary" onClick={onClick}
      className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl bg-secondary text-sm font-medium transition hover:bg-accent active:scale-95">
      <span className="text-primary">{icon}</span>
      {label}
    </Button>
  );
}
