import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Delete, Phone, PhoneCall, PhoneOff, Smartphone, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { Dock } from "@/components/launcher/dock";
import { StatusBar } from "@/components/launcher/status-bar";
import { Button } from "@/components/ui/button";
import {
  answerCall,
  getPhoneState,
  hangUpCall,
  isPhoneAvailable,
  onPhoneStateChanged,
  placeCall,
  rejectCall,
  requestDefaultDialer,
  setSpeaker,
  type PhoneState,
} from "@/services/phone";

export const Route = createFileRoute("/telefone")({
  head: () => ({
    meta: [
      { title: "Telefone — Smart Auto Launcher" },
      { name: "description", content: "Chamadas telefônicas e viva-voz integrados à central multimídia." },
      { property: "og:title", content: "Telefone — Smart Auto Launcher" },
      { property: "og:description", content: "Chamadas e viva-voz integrados ao sistema do carro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PhonePage,
});

const INITIAL_STATE: PhoneState = { available: false, isDefaultDialer: false, status: "idle", number: "", speakerOn: false };
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

function PhonePage() {
  const [phone, setPhone] = useState(INITIAL_STATE);
  const [number, setNumber] = useState("");

  useEffect(() => {
    if (!isPhoneAvailable()) return;
    void getPhoneState().then(setPhone);
    return onPhoneStateChanged(setPhone);
  }, []);

  const run = async (action: () => Promise<unknown>, failure: string) => {
    try { await action(); setPhone(await getPhoneState()); }
    catch { toast.error(failure); }
  };

  const busy = phone.status !== "idle";
  const statusLabel = phone.status === "ringing" ? "Chamada recebida" : phone.status === "dialing" ? "Chamando…" : phone.status === "active" ? "Chamada em andamento" : "Digite um número";

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <StatusBar />
      <main className="flex min-h-0 flex-1 flex-col-reverse gap-3 px-2 pb-2 sm:px-4 sm:pb-4 md:flex-row md:gap-4">
        <Dock />
        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto rounded-3xl border bg-card p-4 shadow-[var(--shadow-card)] sm:p-6" aria-label="Telefone">
          <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary"><Phone className="size-6" /></span>
              <div className="min-w-0"><h1 className="truncate text-xl font-semibold sm:text-2xl">Telefone</h1><p className="truncate text-sm text-muted-foreground">Chamadas pelo sistema do carro</p></div>
            </div>
            {phone.available && !phone.isDefaultDialer && <Button className="min-h-11 rounded-2xl" onClick={() => void run(async () => { await requestDefaultDialer(); }, "Não foi possível configurar o telefone.")}>Ativar telefone</Button>}
          </header>

          {!phone.available ? (
            <div className="m-auto flex max-w-md flex-col items-center gap-3 text-center">
              <Smartphone className="size-14 text-primary" />
              <p className="text-lg font-semibold">Disponível no app Android</p>
              <p className="text-sm text-muted-foreground">Na central do carro, esta tela permite fazer e atender chamadas usando o sistema de áudio do veículo.</p>
            </div>
          ) : (
            <div className="mx-auto grid min-h-0 w-full max-w-4xl flex-1 items-center gap-5 py-4 md:grid-cols-[minmax(18rem,1fr)_minmax(18rem,1fr)]">
              <div className="flex min-w-0 flex-col items-center gap-5 text-center">
                <span className="grid size-20 place-items-center rounded-full bg-primary/15 text-primary"><PhoneCall className="size-10" /></span>
                <div className="min-w-0"><p className="text-sm font-semibold uppercase text-muted-foreground">{statusLabel}</p><p className="mt-2 min-h-10 truncate font-display text-3xl font-bold tabular-nums">{phone.number || number || "—"}</p></div>
                {phone.status === "ringing" ? (
                  <div className="flex gap-4"><Button className="min-h-14 rounded-full px-7" onClick={() => void run(answerCall, "Não foi possível atender.")}><PhoneCall />Atender</Button><Button variant="destructive" className="min-h-14 rounded-full px-7" onClick={() => void run(rejectCall, "Não foi possível recusar.")}><PhoneOff />Recusar</Button></div>
                ) : busy ? (
                  <div className="flex gap-4"><Button variant={phone.speakerOn ? "default" : "secondary"} className="min-h-14 rounded-full px-6" aria-pressed={phone.speakerOn} onClick={() => void run(() => setSpeaker(!phone.speakerOn), "Não foi possível alterar o viva-voz.")}>{phone.speakerOn ? <Volume2 /> : <VolumeX />}Viva-voz</Button><Button variant="destructive" className="min-h-14 rounded-full px-7" onClick={() => void run(hangUpCall, "Não foi possível encerrar.")}><PhoneOff />Encerrar</Button></div>
                ) : <p className="text-sm text-muted-foreground">Use o teclado para iniciar uma chamada.</p>}
              </div>

              <div className="mx-auto flex w-full max-w-sm flex-col gap-3">
                <div className="grid grid-cols-3 gap-2">{KEYS.map((key) => <Button key={key} type="button" variant="secondary" disabled={busy} onClick={() => setNumber((value) => `${value}${key}`)} className="h-14 rounded-2xl font-display text-xl font-semibold">{key}</Button>)}</div>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <Button type="button" disabled={!number || busy || !phone.isDefaultDialer} onClick={() => void run(() => placeCall(number), "Não foi possível iniciar a chamada.")} className="h-14 rounded-2xl text-base"><PhoneCall />Ligar</Button>
                  <Button type="button" variant="secondary" disabled={!number || busy} aria-label="Apagar último número" onClick={() => setNumber((value) => value.slice(0, -1))} className="size-14 rounded-2xl"><Delete /></Button>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}