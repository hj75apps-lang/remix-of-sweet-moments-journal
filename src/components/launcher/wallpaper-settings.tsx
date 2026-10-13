import { useEffect, useRef, useState } from "react";
import { ImagePlus, RotateCcw, Check, X, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallpaper } from "@/contexts/wallpaper-context";
import { importWallpaper, type WallpaperState, type WallpaperFit } from "@/services/wallpaper";
const FITS: { value: WallpaperFit; label: string }[] = [
  { value: "cover", label: "Preencher" }, { value: "contain", label: "Ajustar" }, { value: "center", label: "Centralizar" },
];
export function WallpaperSettings() {
  const wallpaper = useWallpaper();
  const input = useRef<HTMLInputElement>(null);
  const pending = useRef(0);
  const [draft, setDraft] = useState<WallpaperState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const current = draft ?? wallpaper.saved;
  useEffect(() => () => { pending.current += 1; wallpaper.preview(null); }, [wallpaper.preview]);
  function preview(value: WallpaperState) { setDraft(value); wallpaper.preview(value); setError(""); setNotice(""); }
  async function choose(file: File | undefined) {
    if (!file) return;
    const request = ++pending.current;
    setBusy(true); setError(""); setNotice("");
    try { const image = await importWallpaper(file); if (pending.current === request) preview({ ...current, active: true, image }); }
    catch (e) { if (pending.current === request) setError(e instanceof Error ? e.message : "Não foi possível importar a imagem."); }
    finally { if (pending.current === request) setBusy(false); }
  }
  async function confirm() {
    if (!draft) return;
    setBusy(true); setError("");
    try { await wallpaper.save(draft); setDraft(null); setNotice("Papel de parede salvo."); }
    catch { setError("Não foi possível salvar. Verifique o espaço disponível e tente novamente."); }
    finally { setBusy(false); }
  }
  return <section className="space-y-4 border-b border-border px-2 py-5" aria-labelledby="wallpaper-title">
    <h2 id="wallpaper-title" className="text-lg font-semibold">Personalizar papel de parede</h2>
    <div className="wallpaper-preview" data-fit={current.fit}>
      {current.active && current.image ? <img src={current.image.data} alt={`Prévia: ${current.image.name}`} /> : <span className="text-muted-foreground">Fundo original</span>}
    </div>
    {current.active && current.image && <p className="truncate text-sm text-muted-foreground">{current.image.name}</p>}
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" className="hidden" aria-label="Selecionar imagem de papel de parede"
      onChange={event => { void choose(event.target.files?.[0]); event.target.value = ""; }} />
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" disabled={busy || !wallpaper.ready} onClick={() => input.current?.click()}><ImagePlus className="size-4" />Importar imagem</Button>
      <Button variant="secondary" disabled={busy || !wallpaper.ready || !current.active} onClick={() => preview({ ...current, active: false })}><RotateCcw className="size-4" />Restaurar original</Button>
      {!current.active && current.image && <Button variant="secondary" disabled={busy} onClick={() => preview({ ...current, active: true })}><History className="size-4" />Última imagem</Button>}
    </div>
    <fieldset disabled={busy || !current.active}>
      <legend className="mb-2 text-sm font-medium">Enquadramento</legend>
      <div className="grid grid-cols-3 gap-2">{FITS.map(fit => <Button key={fit.value} variant="secondary" aria-pressed={current.fit === fit.value}
        className="min-h-12 whitespace-normal px-2 aria-pressed:bg-primary/15 aria-pressed:text-primary" onClick={() => preview({ ...current, fit: fit.value })}>{fit.label}</Button>)}</div>
    </fieldset>
    {draft && <div className="flex flex-wrap gap-2">
      <Button disabled={busy} onClick={() => void confirm()}><Check className="size-4" />Aplicar papel de parede</Button>
      <Button variant="secondary" disabled={busy} onClick={() => { setDraft(null); wallpaper.preview(null); setError(""); }}><X className="size-4" />Cancelar</Button>
    </div>}
    {busy && <p role="status" className="text-sm text-muted-foreground">Preparando papel de parede…</p>}
    {(error || wallpaper.error) && <p role="alert" className="text-sm text-destructive">{error || wallpaper.error}</p>}
    {notice && <p role="status" className="text-sm text-primary">{notice}</p>}
  </section>;
}
