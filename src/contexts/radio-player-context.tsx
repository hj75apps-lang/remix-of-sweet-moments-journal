import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useRadioPlayer } from "@/hooks/use-radio-player";
import { useRadioListening } from "@/hooks/use-radio-listening";
import type { RadioListeningEntry } from "@/services/radio-listening";
import { publishRadio } from "@/services/now-playing";
import type { RadioStation } from "@/services/radio-browser";
import { useRadioMetadata } from "@/hooks/use-radio-metadata";
import { radioMetadata } from "@/services/media-metadata";

type Player = ReturnType<typeof useRadioPlayer> & {
  listeningHistory: RadioListeningEntry[];
  /** The list used by next/previous (set by the Rádio screen; kept after leaving it). */
  setQueue: (list: RadioStation[]) => void;
  step: (d: number) => void;
};

const Ctx = createContext<Player | null>(null);

/** App-wide radio player: keeps playing across every screen. */
export function RadioPlayerProvider({ children }: { children: ReactNode }) {
  const queueRef = useRef<RadioStation[]>([]);
  const stepRef = useRef<(d: number) => void>(() => {});
  const player = useRadioPlayer({
    onNext: () => stepRef.current(1),
    onPrev: () => stepRef.current(-1),
  });

  stepRef.current = (d: number) => {
    const list = queueRef.current;
    if (!list.length) return;
    const currentId = player.station?.id;
    const idx = currentId ? list.findIndex((s) => s.id === currentId) : -1;
    const next = list[(idx + d + list.length) % list.length];
    if (next) player.play(next);
  };
  const toggleRef = useRef(player.toggle);
  toggleRef.current = player.toggle;

  const current = player.station;
  const playing = player.status === "playing" && player.audioConfirmed;
  const track = useRadioMetadata(current?.id, player.activeStream, playing);
  const listeningHistory = useRadioListening(current, playing && player.audioConfirmed);
  useEffect(() => {
    publishRadio(
      current
        ? {
            ...radioMetadata(current, player.status, playing, track),
            controls: {
              toggle: () => toggleRef.current(),
              next: () => stepRef.current(1),
              prev: () => stepRef.current(-1),
            },
          }
        : null,
    );
  }, [current, playing, player.status, track]);

  const setQueue = useCallback((list: RadioStation[]) => {
    queueRef.current = list;
  }, []);
  const step = useCallback((d: number) => stepRef.current(d), []);
  const value = useMemo<Player>(() => ({ ...player, listeningHistory, setQueue, step }), [player, listeningHistory, setQueue, step]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRadio(): Player {
  const v = useContext(Ctx);
  if (!v) throw new Error("useRadio must be used inside RadioPlayerProvider");
  return v;
}
