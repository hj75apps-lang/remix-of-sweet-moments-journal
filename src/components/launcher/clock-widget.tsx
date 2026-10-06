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
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-0 overflow-hidden">
        <time
          className="block whitespace-nowrap font-['Arial_Black','Arial',sans-serif] text-[clamp(5.5rem,75cqh,14rem)] font-black leading-[0.82] tracking-normal tabular-nums"
          dateTime={now?.toISOString()}
        >
          {now?.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: !settings.clock24h,
          }) ?? "--:--"}
        </time>
      </div>
    </WidgetCard>
  );
}
