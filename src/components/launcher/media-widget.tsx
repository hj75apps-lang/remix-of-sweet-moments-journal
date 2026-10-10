import { useEffect, useState } from "react";
import {
  Music,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Radio,
  Disc3,
  Rewind,
  FastForward,
  BellRing,
} from "lucide-react";
import { errorMessage } from "@/services/launcher-system";
import { mediaStatusLabel } from "@/services/media-metadata";
import { WidgetCard, UnavailableState } from "./widget-card";
import { useNowPlaying } from "@/services/now-playing";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { launchApp, isNativeAvailable } from "@/services/installed-apps";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

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
  const { media, control, nativeAvailable, permission, requestPermission } = useNowPlaying();
  const runControl = (action: "play" | "pause" | "next" | "previous" | "forward" | "rewind") =>
    void Promise.resolve(control(action)).catch((e: unknown) => toast.error(errorMessage(e)));
  const [failedImages, setFailedImages] = useState<string[]>([]);
  useEffect(() => setFailedImages([]), [media?.artwork, media?.sourceIcon, media?.packageName]);
  const image = [media?.artwork, media?.sourceIcon].find((url) => url && !failedImages.includes(url));
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
          <Button
            variant="ghost"
            type="button"
            onClick={openSource}
            aria-label={`Abrir ${media.sourceName}`}
            className="flex h-auto min-h-11 min-w-0 flex-1 items-center justify-start gap-3 whitespace-normal rounded-2xl p-0 text-left transition active:scale-[0.98]"
          >
            <div className="aspect-square h-[clamp(2.5rem,55cqh,7rem)] shrink-0 overflow-hidden rounded-2xl">
              {image ? (
                <img
                  src={image}
                  alt={media.stationName ? `Imagem de ${media.stationName}` : `Capa de ${media.title || media.sourceName}`}
                  loading="lazy" decoding="async"
                  className="h-full w-full object-contain"
                  onError={() => setFailedImages((previous) => [...previous, image])}
                />
              ) : (
                <ArtFallback radio={media.kind === "radio"} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[clamp(0.8125rem,14cqh,1.125rem)] font-semibold">
                {media.kind === "radio" ? media.stationName || media.title || media.sourceName : media.title || "Conteúdo não identificado"}
              </p>
              {media.kind === "radio" && media.frequency && <p className="truncate text-sm font-medium text-primary">{media.frequency}</p>}
              {media.kind === "radio" && media.stationName && media.title && <p className="truncate text-sm">{media.title}</p>}
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
              <p role="status" className="truncate text-xs text-muted-foreground">{mediaStatusLabel(media)}</p>
              {pct > 0 && (
                <div
                  className="mt-1 h-1 overflow-hidden rounded-full bg-secondary"
                  role="progressbar"
                  aria-label="Progresso da reprodução"
                  aria-valuenow={Math.round(pct)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              )}
            </div>
          </Button>
        ) : (
          <>
            <div className="aspect-square h-[clamp(2.5rem,45cqh,6rem)] shrink-0 overflow-hidden rounded-2xl">
              <ArtFallback radio={false} />
            </div>
            <UnavailableState message="Nada tocando" />
          </>
        )}
      </div>
      {nativeAvailable && permission === false && (
        <Button
          type="button"
          variant="secondary"
          onClick={() => void Promise.resolve(requestPermission()).catch((e: unknown) => toast.error(errorMessage(e)))}
          className="mt-2 min-h-11 shrink-0 self-center"
        >
          <BellRing />
          Conectar players
        </Button>
      )}
      <div
        className="mt-auto flex shrink-0 items-center justify-center gap-2 pt-2 sm:gap-3"
        role="group"
        aria-label="Controles de mídia"
      >
        {(() => {
          // Live radio has no timeline, so seek buttons only appear for other apps.
          const seekable = !!media && media.kind !== "radio" && media.duration > 0;
          const seek = (key: "rewind" | "forward") =>
            runControl(key);
          const items = [
            ...(seekable
              ? [{ i: Rewind, l: "Voltar", run: () => seek("rewind"), main: false }]
              : []),
            { i: SkipBack, l: "Anterior", run: () => runControl("previous"), main: false },
            {
              i: media?.playing ? Pause : Play,
              l: media?.playing ? "Pausar" : "Tocar",
              run: () => runControl(media?.playing ? "pause" : "play"),
              main: true,
            },
            { i: SkipForward, l: "Próxima", run: () => runControl("next"), main: false },
            ...(seekable
              ? [{ i: FastForward, l: "Avançar", run: () => seek("forward"), main: false }]
              : []),
          ];
          return items.map(({ i: Icon, l, run, main }) => (
            <Button
              variant={main ? "default" : "secondary"}
              size="icon"
              key={l}
              type="button"
              disabled={!media}
              aria-label={l}
              title={l}
              onClick={run}
              className={cn(
                "grid place-items-center rounded-full transition active:scale-95 disabled:opacity-40",
                main
                  ? "size-[clamp(2.25rem,28cqh,3.5rem)] bg-primary text-primary-foreground"
                  : "size-[clamp(2rem,24cqh,3rem)] bg-secondary",
              )}
            >
              <Icon className="size-[clamp(1rem,14cqh,1.5rem)]" />
            </Button>
          ));
        })()}
      </div>
    </WidgetCard>
  );
}
