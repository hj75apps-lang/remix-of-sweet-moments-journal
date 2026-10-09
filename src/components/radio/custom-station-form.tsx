import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { customStationSchema } from "@/services/custom-station";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { RadioStation } from "@/services/radio-browser";

const fields = [
  { key: "name", label: "Nome da rádio", placeholder: "Minha Rádio" },
  {
    key: "url",
    label: "Endereço da transmissão",
    placeholder: "https://stream.exemplo.com/live.mp3",
  },
  { key: "frequency", label: "Frequência (opcional)", placeholder: "106.7 FM" },
  { key: "city", label: "Cidade (opcional)", placeholder: "Campinas" },
  { key: "state", label: "Estado (opcional)", placeholder: "São Paulo" },
] as const;

type Values = Record<(typeof fields)[number]["key"], string>;
const empty: Values = { name: "", url: "", frequency: "", city: "", state: "" };

/** Dialog to add a station manually by its stream address. */
export function CustomStationForm({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (s: RadioStation) => void;
}) {
  const [values, setValues] = useState<Values>(empty);
  const [errors, setErrors] = useState<Partial<Values>>({});
  const errorId = useId();

  function submit(e: FormEvent) {
    e.preventDefault();
    const r = customStationSchema.safeParse(values);
    if (!r.success) {
      const errs: Partial<Values> = {};
      for (const i of r.error.issues) errs[i.path[0] as keyof Values] ??= i.message;
      setErrors(errs);
      return;
    }
    const d = r.data;
    const lower = d.url.toLowerCase();
    onSave({
      id: `custom-${Date.now()}`,
      name: d.name,
      sources: [d.url],
      favicon: "",
      tags: [],
      state: d.state,
      city: d.city,
      frequency: d.frequency
        .replace(",", ".")
        .replace(/\s*(fm|am)$/i, (m) => ` ${m.trim().toUpperCase()}`),
      bitrate: 0,
      codec: lower.includes(".m3u8") ? "HLS" : lower.includes("aac") ? "AAC" : "",
      custom: true,
    });
    setValues(empty);
    setErrors({});
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar rádio</DialogTitle>
          <DialogDescription>
            Cole o endereço da transmissão (MP3, AAC, HLS ou playlist).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
          {fields.map((f) => (
            <label key={f.key} className="flex flex-col gap-1 text-sm font-medium">
              {f.label}
              <input
                value={values[f.key]}
                placeholder={f.placeholder}
                aria-invalid={!!errors[f.key]}
                aria-describedby={errors[f.key] ? `${errorId}-${f.key}` : undefined}
                onChange={(e) => {
                  const value = e.currentTarget.value;
                  setValues((v) => ({ ...v, [f.key]: value }));
                }}
                inputMode={f.key === "url" ? "url" : f.key === "frequency" ? "decimal" : "text"}
                className="min-h-11 rounded-xl border bg-background px-3 text-sm font-normal outline-none focus:ring-2 focus:ring-ring"
              />
              {errors[f.key] && (
                <span id={`${errorId}-${f.key}`} role="alert" className="text-xs font-normal text-destructive">{errors[f.key]}</span>
              )}
            </label>
          ))}
          <Button
            type="submit"
            className="min-h-11 rounded-xl bg-primary font-semibold text-primary-foreground"
          >
            Salvar rádio
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
