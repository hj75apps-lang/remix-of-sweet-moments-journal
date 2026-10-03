import { Clock } from "lucide-react";
import { useClock } from "@/hooks/use-clock";
import { WidgetCard } from "./widget-card";

export function ClockWidget() {
  const now = useClock();
  return (
    <WidgetCard title="Relógio" icon={<Clock className="size-4" />}>
      <p className="font-display text-4xl font-semibold tabular-nums">
        {now?.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) ?? "--:--"}
      </p>
      <p className="text-sm capitalize text-muted-foreground">
        {now?.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }) ?? ""}
      </p>
    </WidgetCard>
  );
}
