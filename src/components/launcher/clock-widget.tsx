import { useLauncherSettings } from "@/hooks/use-launcher-settings";
import { Clock } from "lucide-react";
import { useClock } from "@/hooks/use-clock";
import { WidgetCard } from "./widget-card";

export function ClockWidget() {
  const { settings } = useLauncherSettings();
  const now = useClock();
  return (
    <WidgetCard
      title="Relógio"
      icon={<Clock className="size-4" />}
      className="[&_.widget-inner]:px-4 sm:[&_.widget-inner]:px-5"
    >
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-[clamp(0.2rem,2cqh,0.65rem)] overflow-hidden">
        <time
          className="block whitespace-nowrap font-['Arial_Black','Arial',sans-serif] text-[clamp(2.75rem,34cqh,6.5rem)] font-black leading-[0.82] tracking-normal tabular-nums"
          dateTime={now?.toISOString()}
        >
          {now?.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: !settings.clock24h }) ?? "--:--"}
        </time>
        <p className="truncate text-[clamp(0.8rem,10cqh,1.4rem)] font-medium capitalize leading-tight text-muted-foreground">
          {now?.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }) ??
            ""}
        </p>
      </div>
    </WidgetCard>
  );
}
