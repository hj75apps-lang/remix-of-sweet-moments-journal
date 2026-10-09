import { useLauncherSettings } from "@/hooks/use-launcher-settings";
import { useClock } from "@/hooks/use-clock";
import { WidgetCard } from "./widget-card";

export function ClockWidget() {
  const { settings } = useLauncherSettings();
  const now = useClock(60_000);
  const weekday = now?.toLocaleDateString("pt-BR", { weekday: "long" });
  const fullDate = now?.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const dateLabel = weekday && fullDate
    ? `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} - ${fullDate}`
    : "--";
  return (
    <WidgetCard
      title="Relógio"
      className="[&_.widget-inner]:px-4 sm:[&_.widget-inner]:px-5"
      hideHeader
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col items-end justify-center gap-2 overflow-hidden text-right">
        <time
          className={`clock-time ${settings.clock24h ? "" : "clock-time-12h"} block max-w-full whitespace-nowrap font-['Arial_Black','Arial',sans-serif] font-black tracking-normal tabular-nums`}
          dateTime={now?.toISOString()}
        >
          {now?.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: !settings.clock24h,
          }) ?? "--:--"}
        </time>
        <time
          className="clock-date block max-w-full whitespace-normal font-medium leading-tight text-muted-foreground"
          dateTime={now ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}` : undefined}
        >
          {dateLabel}
        </time>
      </div>
    </WidgetCard>
  );
}
