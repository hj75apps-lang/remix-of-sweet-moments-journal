import { readStored, writeStored } from "./storage";
export interface VoicePreferences { spoken: boolean; provider: "local" | "android" }
const KEY = "sal.voice-preferences";
const isVoicePreferences = (value: unknown): value is VoicePreferences => {
  if (!value || typeof value !== "object") return false;
  const p = value as Partial<VoicePreferences>;
  return typeof p.spoken === "boolean" && (p.provider === "local" || p.provider === "android");
};
export const readVoicePreferences = () => readStored(KEY, { spoken: true, provider: "local" } as VoicePreferences, { schema: 1, validate: isVoicePreferences });
export const saveVoicePreferences = (preferences: VoicePreferences) => writeStored(KEY, preferences, 1);