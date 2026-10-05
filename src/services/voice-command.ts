export type VoiceCommand =
  | { kind: "navigate"; route: "/" | "/radio" | "/clima" | "/apps" | "/ajustes"; label: string }
  | { kind: "radio"; action: "play" | "pause" | "toggle" | "next" | "previous"; label: string }
  | { kind: "unknown"; label: string };

export function normalizeVoiceText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const hasAny = (text: string, phrases: string[]) => phrases.some((phrase) => text.includes(phrase));

export function parseVoiceCommand(transcript: string): VoiceCommand {
  const text = normalizeVoiceText(transcript);
  if (hasAny(text, ["proxima radio", "proxima estacao", "avancar radio", "avancar estacao"])) {
    return { kind: "radio", action: "next", label: "Próxima estação" };
  }
  if (hasAny(text, ["radio anterior", "estacao anterior", "voltar radio", "voltar estacao"])) {
    return { kind: "radio", action: "previous", label: "Estação anterior" };
  }
  if (hasAny(text, ["pausar radio", "pause a radio", "parar radio", "pare a radio"])) {
    return { kind: "radio", action: "pause", label: "Rádio pausada" };
  }
  if (hasAny(text, ["tocar radio", "reproduzir radio", "continuar radio", "ligar radio"])) {
    return { kind: "radio", action: "play", label: "Reproduzir rádio" };
  }
  if (hasAny(text, ["abrir radio", "ir para radio", "mostrar radio"])) {
    return { kind: "navigate", route: "/radio", label: "Abrindo Rádios Online" };
  }
  if (hasAny(text, ["abrir clima", "previsao do tempo", "como esta o tempo", "mostrar clima"])) {
    return { kind: "navigate", route: "/clima", label: "Abrindo previsão do tempo" };
  }
  if (hasAny(text, ["abrir aplicativos", "abrir apps", "mostrar aplicativos", "mostrar apps"])) {
    return { kind: "navigate", route: "/apps", label: "Abrindo aplicativos" };
  }
  if (hasAny(text, ["abrir ajustes", "abrir configuracoes", "mostrar ajustes", "configuracoes"])) {
    return { kind: "navigate", route: "/ajustes", label: "Abrindo ajustes" };
  }
  if (hasAny(text, ["pagina inicial", "tela inicial", "ir para o inicio", "abrir inicio", "voltar ao inicio"])) {
    return { kind: "navigate", route: "/", label: "Abrindo tela inicial" };
  }
  return { kind: "unknown", label: "Comando não reconhecido" };
}

interface VoicePluginListener { remove: () => Promise<void> | void }

export interface VoiceRecognitionResult {
  transcript: string;
}

interface VoiceControlPlugin {
  isAvailable(): Promise<{ available: boolean }>;
  startListening(): Promise<void>;
  addListener(event: "voiceResult", callback: (result: VoiceRecognitionResult) => void): Promise<VoicePluginListener> | VoicePluginListener;
  addListener(event: "voiceState", callback: (state: { listening: boolean; error?: string }) => void): Promise<VoicePluginListener> | VoicePluginListener;
}

function plugin(): VoiceControlPlugin | null {
  if (typeof window === "undefined") return null;
  const capacitor = (window as unknown as { Capacitor?: { Plugins?: Record<string, unknown>; isNativePlatform?: () => boolean } }).Capacitor;
  if (!capacitor?.isNativePlatform?.()) return null;
  return (capacitor.Plugins?.["VoiceControl"] as VoiceControlPlugin | undefined) ?? null;
}

export const isNativeVoiceAvailable = async () => {
  const voice = plugin();
  if (!voice) return false;
  return voice.isAvailable().then(({ available }) => available).catch(() => false);
};

export const startVoiceRecognition = () => plugin()?.startListening();

export function onVoiceResult(callback: (result: VoiceRecognitionResult) => void): () => void {
  const voice = plugin();
  if (!voice) return () => {};
  const handle = Promise.resolve(voice.addListener("voiceResult", callback));
  return () => { void handle.then((listener) => listener.remove()); };
}

export function onVoiceState(callback: (state: { listening: boolean; error?: string }) => void): () => void {
  const voice = plugin();
  if (!voice) return () => {};
  const handle = Promise.resolve(voice.addListener("voiceState", callback));
  return () => { void handle.then((listener) => listener.remove()); };
}