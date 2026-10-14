import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface WidgetCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  hideHeader?: boolean;
}

/** Base surface for every Home widget. */
export function WidgetCard({ title, icon, children, className, hideHeader = true }: WidgetCardProps) {
  return (
    <section
      aria-label={title}
      className={cn(
        "widget relative h-full min-h-0 overflow-hidden rounded-3xl border bg-card text-card-foreground shadow-[var(--shadow-card)]",
        className,
      )}
    >
      <div className="widget-inner flex h-full min-h-0 flex-col p-3 lg:p-4">
        {!hideHeader && (
          <header className="widget-head mb-2 flex min-w-0 shrink-0 items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <span className="shrink-0">{icon}</span>
            <h2 className="truncate font-sans">{title}</h2>
          </header>
        )}
        {/* Size container: content scales fluidly with the card (cqh/cqw) so everything adjusts automatically. */}
        <div className="widget-visual-content flex min-h-0 min-w-0 flex-1 flex-col [container-type:size] transition-all duration-200 [font-size:clamp(0.7rem,2.5cqw+2.5cqh,1rem)]">
          {children}
        </div>
      </div>
    </section>
  );
}

/** Honest placeholder when a data source is not available. */
export function UnavailableState({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="flex flex-1 flex-col items-start justify-center gap-1">
      <p className="text-base font-semibold">{message}</p>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}
