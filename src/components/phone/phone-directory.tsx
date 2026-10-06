import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PhoneIncoming, PhoneMissed, PhoneOutgoing, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  errorMessage,
  getCallLog,
  getContacts,
  isLauncherNative,
} from "@/services/launcher-system";

type Tab = "recent" | "contacts";

/** Contacts and recent calls from the device; tapping fills the dialer. */
export function PhoneDirectory({ onPick }: { onPick: (number: string) => void }) {
  const [tab, setTab] = useState<Tab | null>(null);
  const native = isLauncherNative();
  const calls = useQuery({ queryKey: ["call-log"], queryFn: getCallLog, enabled: tab === "recent", retry: false });
  const contacts = useQuery({ queryKey: ["contacts"], queryFn: getContacts, enabled: tab === "contacts", retry: false, staleTime: 300_000 });
  if (!native) return null;
  const active = tab === "recent" ? calls : contacts;

  return (
    <div className="mt-4 flex min-h-0 flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <Button variant={tab === "recent" ? "default" : "secondary"} className="min-h-12 rounded-2xl" onClick={() => setTab("recent")}>
          Recentes
        </Button>
        <Button variant={tab === "contacts" ? "default" : "secondary"} className="min-h-12 rounded-2xl" onClick={() => setTab("contacts")}>
          Contatos
        </Button>
      </div>
      {tab && active.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {tab && active.isError && (
        <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>{errorMessage(active.error)}</span>
          <Button variant="secondary" className="min-h-11 rounded-2xl" onClick={() => void active.refetch()}>
            Tentar de novo
          </Button>
        </div>
      )}
      <ul className="flex flex-col gap-1">
        {tab === "recent" &&
          calls.data?.map((c) => {
            const Icon = c.type === "missed" ? PhoneMissed : c.type === "outgoing" ? PhoneOutgoing : PhoneIncoming;
            return (
              <li key={`${c.number}-${c.date}`}>
                <Button variant="ghost" className="min-h-12 w-full justify-start rounded-2xl" onClick={() => onPick(c.number)}>
                  <Icon className={c.type === "missed" ? "text-destructive" : "text-primary"} />
                  <span className="truncate">{c.name || c.number}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(c.date).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </Button>
              </li>
            );
          })}
        {tab === "contacts" &&
          contacts.data?.map((c) => (
            <li key={c.number}>
              <Button variant="ghost" className="min-h-12 w-full justify-start rounded-2xl" onClick={() => onPick(c.number)}>
                <User className="text-primary" />
                <span className="truncate">{c.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{c.number}</span>
              </Button>
            </li>
          ))}
        {tab && active.data?.length === 0 && <li className="text-sm text-muted-foreground">Nada encontrado.</li>}
      </ul>
    </div>
  );
}
