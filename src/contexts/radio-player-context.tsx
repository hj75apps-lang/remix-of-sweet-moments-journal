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
import { publishRadio } from "@/services/now-playing";
import type { RadioStation } from "@/services/radio-browser";

type Player = ReturnType<typeof useRadioPlayer> & {
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
    const idx = player.station ? list.findIndex((s) => s.id === player.station!.id) : -1;
    const next = list[(idx + d + list.length) % list.length];
    if (next) player.play(next);
  };
  const toggleRef = useRef(player.toggle);
  toggleRef.current = player.toggle;

  const current = player.station;
  const playing = player.status === "playing";
  useEffect(() => {
    publishRadio(
      current
        ? {
            title: current.name,
            artist: [current.frequency && `${current.frequency} FM`, current.city || current.state]
              .filter(Boolean)
              .join(" · "),
            album: current.tags.slice(0, 2).join(", "),
            sourceName: "Rádios Online",
            packageName: "",
            artwork: current.favicon,
            playing,
            duration: 0,
            position: 0,
            kind: "radio",
            controls: {
              toggle: () => toggleRef.current(),
              next: () => stepRef.current(1),
              prev: () => stepRef.current(-1),
            },
          }
        : null,
    );
  }, [current, playing]);

  const setQueue = useCallback((list: RadioStation[]) => {
    queueRef.current = list;
  }, []);
  const step = useCallback((d: number) => stepRef.current(d), []);
  const value = useMemo<Player>(() => ({ ...player, setQueue, step }), [player, setQueue, step]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRadio(): Player {
  const v = useContext(Ctx);
  if (!v) throw new Error("useRadio must be used inside RadioPlayerProvider");
  return v;
}
