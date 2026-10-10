import { useSyncExternalStore } from "react";
import { RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkOta, nativeOta, otaSnapshot, otaServerSnapshot, subscribeOta } from "@/services/ota-client";

export function OtaSettings() {
  const state = useSyncExternalStore(subscribeOta, otaSnapshot, otaServerSnapshot);
  const busy = state.status === "checking" || state.status === "downloading" || state.status === "starting";
  return <section aria-label="Atualizações do Launcher" className="border-b border-border px-6 py-5">
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">Atualizações</h2>
      <Button size="icon" variant="outline" aria-label="Verificar atualizações" title="Verificar atualizações" disabled={busy || state.status === "web" || state.status === "unconfigured"} onClick={() => void checkOta()}>
        <RefreshCw className={busy ? "animate-spin motion-reduce:animate-none" : ""} />
      </Button>
    </div>
    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
      <dt className="text-muted-foreground">Aplicativo Android</dt><dd className="break-words text-right">{state.nativeVersion}{state.nativeCode ? ` (${state.nativeCode})` : ""}</dd>
      <dt className="text-muted-foreground">Versão ativa</dt><dd className="break-words text-right">{state.active}</dd>
      <dt className="text-muted-foreground">Última válida anterior</dt><dd className="break-all text-right">{state.previous}</dd>
      <dt className="text-muted-foreground">Disponível</dt><dd className="break-words text-right">{state.available}</dd>
      <dt className="text-muted-foreground">Canal</dt><dd className="break-words text-right">{state.channel}</dd>
    </dl>
    <p role="status" className="mt-3 break-words text-sm text-muted-foreground">{state.message}</p>
    {state.notes && state.status !== "native_required" && <p className="mt-2 whitespace-pre-wrap break-words text-sm">{state.notes}</p>}
    {state.nativeUrl && <Button variant="outline" className="mt-3" asChild><a href={state.nativeUrl} target="_blank" rel="noopener noreferrer"><ExternalLink />Canal oficial do APK</a></Button>}
  </section>;
}