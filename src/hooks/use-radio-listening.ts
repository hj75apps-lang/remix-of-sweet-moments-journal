import { useEffect, useRef, useState } from "react";
import type { RadioStation } from "@/services/radio-browser";
import { addRadioListening, readRadioListening, saveRadioListening, type RadioListeningEntry } from "@/services/radio-listening";

export function useRadioListening(station: RadioStation | null, playing: boolean) {
  const [history, setHistory] = useState<RadioListeningEntry[]>([]);
  const historyRef = useRef<RadioListeningEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    historyRef.current = readRadioListening();
    setHistory(historyRef.current);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded || !playing || !station) return;
    const record = (seconds: number) => {
      historyRef.current = addRadioListening(historyRef.current, station, seconds);
      saveRadioListening(historyRef.current);
      setHistory(historyRef.current);
    };
    // Only entered after playback is confirmed, never for a failed station tap.
    record(1);
    let checkpoint = performance.now();
    const flush = () => {
      const now = performance.now();
      record(Math.max(0, (now - checkpoint) / 1000));
      checkpoint = now;
    };
    const timer = setInterval(flush, 15000);
    window.addEventListener("pagehide", flush);
    return () => {
      clearInterval(timer);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [station, playing, loaded]);
  return history;
}