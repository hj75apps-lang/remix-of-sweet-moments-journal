import type { RadioStation } from "./radio-browser";
import { normalizeText } from "./radio-search";
import { readStored, writeStored } from "./storage";

const KEY = "sal.radio-listening";
const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
export interface RadioListeningEntry {
  key: string;
  day: number;
  seconds: number;
  lastHeard: number;
}

function isHistory(value: unknown): value is RadioListeningEntry[] {
  return Array.isArray(value) && value.length <= 6000 && value.every((entry) =>
    entry && typeof entry === "object" && typeof entry.key === "string" &&
    Number.isInteger(entry.day) && Number.isFinite(entry.seconds) && entry.seconds > 0 &&
    Number.isFinite(entry.lastHeard) && entry.lastHeard > 0);
}

export function recentListening(history: RadioListeningEntry[], now = Date.now()): RadioListeningEntry[] {
  return history.filter((entry) => entry.lastHeard > now - WINDOW_MS && entry.lastHeard <= now);
}

export function readRadioListening(now = Date.now()): RadioListeningEntry[] {
  return recentListening(readStored(KEY, [], { schema: 1, validate: isHistory }), now);
}

export function saveRadioListening(history: RadioListeningEntry[]): void {
  writeStored(KEY, history, 1);
}

/** Count actual confirmed listening, grouped by station name and UTC day. */
export function addRadioListening(history: RadioListeningEntry[], station: RadioStation, seconds: number, now = Date.now()): RadioListeningEntry[] {
  if (!Number.isFinite(seconds) || seconds <= 0) return history;
  const key = normalizeText(station.name);
  const day = Math.floor(now / 86400000);
  const next = recentListening(history, now);
  const previous = next.find((entry) => entry.key === key && entry.day === day);
  const entry = { key, day, seconds: (previous?.seconds ?? 0) + seconds, lastHeard: now };
  return [...next.filter((item) => item !== previous), entry].slice(-6000);
}

/** Unheard stations retain their search relevance and catalog order. */
export function rankRadioStations(stations: RadioStation[], history: RadioListeningEntry[], now = Date.now()): RadioStation[] {
  const scores = new Map<string, { seconds: number; lastHeard: number }>();
  for (const entry of recentListening(history, now)) {
    const previous = scores.get(entry.key);
    scores.set(entry.key, { seconds: (previous?.seconds ?? 0) + entry.seconds, lastHeard: Math.max(previous?.lastHeard ?? 0, entry.lastHeard) });
  }
  return stations.map((station, index) => ({ station, index, score: scores.get(normalizeText(station.name)) }))
    .sort((a, b) => (b.score?.seconds ?? 0) - (a.score?.seconds ?? 0) ||
      (b.score?.lastHeard ?? 0) - (a.score?.lastHeard ?? 0) || a.index - b.index)
    .map(({ station }) => station);
}