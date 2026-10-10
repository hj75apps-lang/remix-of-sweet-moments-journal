import { useState, type FormEvent } from "react";
import { Mic, Square, Send, Volume2, Check, ArrowUpRight } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useVoiceControl } from "@/contexts/voice-control-context";

const phases = { idle: "Pronto", listening: "Ouvindo…", processing: "Interpretando…", executing: "Executando…", speaking: "Respondendo…", error: "Não foi possível concluir" };
export function VoiceAssistantPanel() {
  const voice = useVoiceControl();
  const [text, setText] = useState("");
  const active = voice.phase !== "idle" && voice.phase !== "error";
  function submit(event: FormEvent) { event.preventDefault(); voice.submit(text); setText(""); }
  return <Dialog open={voice.open} onOpenChange={(open) => { if (!open) voice.close(); }}>
    <DialogContent className="max-h-[85dvh] overflow-y-auto rounded-lg border-border bg-background text-foreground">
      <DialogHeader>
        <DialogTitle>Assistente de voz</DialogTitle>
        <DialogDescription>{voice.available ? "Microfone para reconhecer o comando; nenhuma conversa é salva pelo launcher." : "Microfone disponível no aplicativo Android. Comando escrito disponível aqui."}</DialogDescription>
      </DialogHeader>
      <div className="flex items-center gap-3">
        <Button size="icon" className="size-14 shrink-0 rounded-full" onClick={active ? voice.stop : voice.activate} aria-label={active ? "Interromper assistente" : "Ouvir comando"} title={active ? "Interromper" : "Ouvir comando"}>
          {active ? <Square className="size-6" /> : <Mic className="size-6" />}
        </Button>
        <span role="status" aria-live="polite" className="text-lg font-semibold">{phases[voice.phase]}</span>
      </div>
      {voice.transcript && <p className="break-words text-sm text-muted-foreground">“{voice.transcript}”</p>}
      <p aria-live="polite" className="min-h-12 break-words text-base">{voice.response || "Qual ação deseja executar?"}</p>
      {voice.pending && <div className="flex gap-2">
        <Button onClick={voice.confirm} disabled={active}><Check />Confirmar</Button>
        <Button variant="outline" onClick={voice.stop}><Square />Cancelar</Button>
      </div>}
      {voice.choices.length > 0 && <div className="flex max-h-48 flex-col gap-2 overflow-y-auto">
        {voice.choices.map((station) => <Button key={station.id} variant="outline" className="h-auto min-h-12 justify-start whitespace-normal text-left" onClick={() => voice.choose(station)}>{station.name}</Button>)}
      </div>}
      <form onSubmit={submit} className="flex gap-2">
        <input aria-label="Comando do assistente" value={text} onChange={(event) => setText(event.target.value)} maxLength={500} placeholder="Digite um comando" className="min-h-12 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-base text-foreground" />
        <Button type="submit" size="icon" disabled={!text.trim() || active} className="size-12 shrink-0" aria-label="Enviar comando" title="Enviar comando"><Send /></Button>
      </form>
      <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-2"><Volume2 className="size-4" />Respostas faladas · pt-BR</span>
        <Switch checked={voice.preferences.spoken} onCheckedChange={(spoken) => voice.configure({ ...voice.preferences, spoken })} aria-label="Respostas faladas" />
      </label>
      <label className="flex flex-wrap items-center justify-between gap-2 text-sm">Ativação
        <select aria-label="Modo do assistente" value={voice.preferences.provider} onChange={(event) => voice.configure({ ...voice.preferences, provider: event.target.value === "android" ? "android" : "local" })} className="min-h-11 max-w-full rounded-md border border-input bg-background px-2 text-foreground">
          <option value="local">Comandos locais</option>
          <option value="android" disabled={!voice.available}>Assistente padrão Android</option>
          <option disabled>GPT — conexão segura pendente</option>
          <option disabled>Gemini — conexão segura pendente</option>
        </select>
      </label>
      {voice.available && <Button variant="outline" onClick={voice.systemAssistant}><ArrowUpRight />Abrir assistente do Android</Button>}
    </DialogContent>
  </Dialog>;
}