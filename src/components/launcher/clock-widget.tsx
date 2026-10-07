import { useLauncherSettings } from "@/hooks/use-launcher-settings";
import { useClock } from "@/hooks/use-clock";
import { WidgetCard } from "./widget-card";

export function ClockWidget() {
  const { settings } = useLauncherSettings();
  const now = useClock();
  return (
    <WidgetCard
      title="Relógio"
      className="[&_.widget-inner]:px-4 sm:[&_.widget-inner]:px-5"
      hideHeader
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col items-end justify-center gap-2 overflow-hidden text-right">
        <time
          className="block max-w-full whitespace-nowrap font-['Arial_Black','Arial',sans-serif] text-[min(15cqw,50cqh,8rem)] font-black leading-none tracking-normal tabular-nums"
          dateTime={now?.toISOString()}
        >
          {now?.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: !settings.clock24h,
          }) ?? "--:--"}
        </time>
        <time
          className="block max-w-full whitespace-nowrap text-[min(6cqw,18cqh,1.125rem)] font-medium leading-tight text-muted-foreground tabular-nums"
          dateTime={now ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}` : undefined}
        >
          {now?.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) ?? "--/--/----"}
        </time>
      </div>
    </WidgetCard>
  );
}
