/** Prefer actual playback over a paused source retained by the launcher. */
export function selectMedia<T extends { playing: boolean }>(
  radio: T | null,
  system: T | null,
  lastSource: "radio" | "system",
): T | null {
  if (system?.playing) return system;
  if (radio?.playing) return radio;
  return lastSource === "system" ? system ?? radio : radio ?? system;
}