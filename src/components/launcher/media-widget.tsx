import { useEffect, useState } from "react";
import { Music, Play, Pause, SkipBack, SkipForward, Radio, Disc3 } from "lucide-react";
import { WidgetCard, UnavailableState } from "./widget-card";
import { useNowPlaying } from "@/services/now-playing";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { launchApp, isNativeAvailable } from "@/services/installed-apps";
import { toast } from "sonner";

/** System illustration shown when the source provides no artwork. */
function ArtFallback({ radio }: { radio: boolean }) {
  const Icon = radio ? Radio : Disc3;
  return (
    <div className="grid h-full w-full place-items-center bg-[radial-gradient(circle_at_30%_25%,var(--primary),var(--secondary)_70%)] text-primary-foreground">
      <Icon className="size-1/2 opacity-90" aria-hidden />
    </div>
  );
}

/** "Now playing" card fed by any source: in-app radio or other apps (Android). */
export function MediaWidget() {
  const { media, control } = useNowPlaying();
  const [artFailed, setArtFailed] = useState(false);
  useEffect(() => setArtFailed(false), [media?.artwork]);
  const navigate = useNavigate();
  /** Opens the app that is the source of the sound. */
  const openSource = () => {
    if (!media) return;
    if (media.kind === "radio") {
      void navigate({ to: "/radio" });
      return;
    }
    if (media.packageName && isNativeAvailable()) {
      void launchApp(media.packageName).catch(() =>
        toast.error(`Não foi possível abrir ${media.sourceName}.`),
      );
      return;
    }
    toast.info(`Abrir ${media.sourceName} só funciona no app Android.`);
  };
  const pct = media?.duration ? Math.min(100, (media.position / media.duration) * 100) : 0;

  return (
    <WidgetCard
      title={media ? `Tocando agora · ${media.sourceName}` : "Tocando agora"}
      icon={<Music className="size-4" />}
    >
      <div className="flex min-h-0 min-w-0 flex-1 items-center gap-3">
        {media ? (
          <button
            type="button"
            onClick={openSource}
            aria-label={`Abrir ${media.sourceName}`}
            className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-2xl text-left transition active:scale-[0.98]"
          >
            <div className="aspect-square h-[clamp(2.5rem,55cqh,7rem)] shrink-0 overflow-hidden rounded-2xl">
              {media.artwork && !artFailed ? (
                <img
                  src={media.artwork}
                  alt={`Capa de ${media.title}`}
                  className="h-full w-full object-cover"
                  onError={() => setArtFailed(true)}
                />
              ) : (
                <ArtFallback radio={media.kind === "radio"} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[clamp(0.8125rem,14cqh,1.125rem)] font-semibold">
                {media.title || "Sem título"}
              </p>
              {media.artist && (
                <p className="truncate text-[clamp(0.6875rem,11cqh,0.875rem)] text-muted-foreground">
                  {media.artist}
                </p>
              )}
              {media.album && (
                <p className="truncate text-[clamp(0.625rem,9cqh,0.75rem)] text-muted-foreground">
                  {media.album}
                </p>
              )}
              <p className="truncate text-[clamp(0.625rem,9cqh,0.75rem)] font-medium text-primary">
                {media.sourceName}
                {media.kind === "radio" ? " · ao vivo" : ""}
              </p>
              {pct > 0 && (
                <div
                  className="mt-1 h-1 overflow-hidden rounded-full bg-secondary"
                  role="progressbar"
                  aria-valuenow={Math.round(pct)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              )}
            </div>
          </button>
        ) : (
          <>
            <div className="aspect-square h-[clamp(2.5rem,45cqh,6rem)] shrink-0 overflow-hidden rounded-2xl">
              <ArtFallback radio={false} />
            </div>
            <UnavailableState
              message="Nada tocando"
              hint="Toque algo no Spotify, navegador, USB ou na Rádio."
            />
          </>
        )}
      </div>
      <div
        className="mt-auto flex shrink-0 items-center justify-center gap-3 pt-2"
        role="group"
        aria-label="Controles de mídia"
      >
        {[
          { i: SkipBack, l: "Anterior", a: "previous" as const },
          {
            i: media?.playing ? Pause : Play,
            l: media?.playing ? "Pausar" : "Tocar",
            a: media?.playing ? ("pause" as const) : ("play" as const),
          },
          { i: SkipForward, l: "Próxima", a: "next" as const },
        ].map(({ i: Icon, l, a }, idx) => (
          <button
            key={idx}
            type="button"
            disabled={!media}
            aria-label={l}
            onClick={() => control(a)}
            className={cn(
              "grid place-items-center rounded-full transition active:scale-95 disabled:opacity-40",
              idx === 1
                ? "size-[clamp(2.25rem,28cqh,3.5rem)] bg-primary text-primary-foreground"
                : "size-[clamp(2rem,24cqh,3rem)] bg-secondary",
            )}
          >
            <Icon className="size-[clamp(1rem,14cqh,1.5rem)]" />
          </button>
        ))}
      </div>
    </WidgetCard>
  );
}
