export type VoiceCommand =
  | { kind: "navigate"; route: "/" | "/radio" | "/clima" | "/apps" | "/ajustes"; label: string }
  | { kind: "radio"; action: "play" | "pause" | "toggle" | "next" | "previous"; label: string }
  | { kind: "open_app"; name: string; label: string }
  | { kind: "search_radio"; query: string; play: boolean; label: string }
  | { kind: "volume"; action: "up" | "down" | "mute" | "set"; value?: number; label: string }
  | { kind: "destination"; destination: string; label: string }
  | { kind: "open_navigation" | "time" | "now_playing" | "system_assistant" | "cancel" | "confirm"; label: string }
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

const hasAny = (text: string, phrases: string[]) => phrases.some((phrase) => text === phrase || text.startsWith(`${phrase} `));

export function parseVoiceCommand(transcript: string): VoiceCommand {
  const text = normalizeVoiceText(transcript);
  if (!text || text.length > 500) return { kind: "unknown", label: "Diga um comando curto e específico." };
  if (/^(nao |nunca |se |quando )/.test(text) || /\b(?:e depois|e abra|e toque|mas nao|nao abra|nao toque)\b/.test(text)) return { kind: "unknown", label: "Diga uma ação por vez, sem condições ou negações." };
  if (/^(cancelar|cancele|pare|parar|encerrar|encerre|interromper|nao)$/.test(text)) return { kind: "cancel", label: "Cancelado" };
  if (/^(sim|confirmar|confirme|pode abrir|pode continuar)$/.test(text)) return { kind: "confirm", label: "Confirmar" };
  if (/^(que horas sao|qual a hora|me diga as horas|horas)$/.test(text)) return { kind: "time", label: "Hora atual" };
  if (hasAny(text, ["o que esta tocando", "mostre o que esta tocando", "tocando agora"])) return { kind: "now_playing", label: "Tocando agora" };
  if (/^(abrir|abra|ativar|ative) (o |a )?(assistente|google assistant|gemini)( do sistema)?$/.test(text)) return { kind: "system_assistant", label: "Abrindo assistente do Android" };
  if (/^(abra|abrir|inicie|iniciar) (a |o )?(navegacao|navegador)$/.test(text)) return { kind: "open_navigation", label: "Abrindo navegação" };
  if (hasAny(text, ["aumente o volume", "aumentar volume", "aumentar o volume"])) return { kind: "volume", action: "up", label: "Aumentar volume" };
  if (hasAny(text, ["diminua o volume", "diminuir volume", "diminuir o volume"])) return { kind: "volume", action: "down", label: "Diminuir volume" };
  if (/^(silencie( o audio)?|silenciar( o audio)?|mudo)$/.test(text)) return { kind: "volume", action: "mute", label: "Silenciar mídia" };
  const volume = text.match(/^(?:coloque|defina|ajuste|colocar) (?:o )?volume (?:em |para )?(\d{1,3})(?: por cento)?$/);
  if (volume) {
    const value = Number(volume[1]);
    return value <= 100 ? { kind: "volume", action: "set", value: value / 100, label: "Ajustar volume" } : { kind: "unknown", label: "O volume deve estar entre zero e cem por cento." };
  }
  const destination = text.match(/^(?:trace (?:uma )?rota (?:ate|para)|tracar (?:uma )?rota (?:ate|para)|navegue (?:ate|para)|navegar (?:ate|para)|me leve (?:ate|para)|encontre|procure) (.+)$/);
  if (destination && /^(?:um |uma |o |a )?(?:posto|restaurante|centro|rua|avenida|shopping|hospital|aeroporto|mercado|farmacia)/.test(destination[1] ?? "") || destination && /^(?:trace|tracar|navegue|navegar|me leve)/.test(text)) {
    return { kind: "destination", destination: destination?.[1] ?? "", label: "Confirmar destino" };
  }
  const radioQuery = text.match(/^(toque|tocar|reproduza|reproduzir|procure|procurar|pesquise|pesquisar|encontre) (?:a |uma |as )?radios? (.+)$/);
  if (radioQuery) return { kind: "search_radio", query: radioQuery[2] ?? "", play: /^(toque|tocar|reproduza|reproduzir)$/.test(radioQuery[1] ?? ""), label: "Buscar rádio" };
  if (/^(pause|pausar|pare) (?:a )?musica$/.test(text)) return { kind: "radio", action: "pause", label: "Solicitar pausa" };
  if (/^(continue|continuar|retome|retomar) (?:a )?(reproducao|musica)$/.test(text)) return { kind: "radio", action: "play", label: "Solicitar reprodução" };
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
  if (hasAny(text, ["abrir radio", "abra a radio", "ir para radio", "mostrar radio"])) {
    return { kind: "navigate", route: "/radio", label: "Abrindo Rádios Online" };
  }
  if (hasAny(text, ["abrir clima", "previsao do tempo", "qual e a previsao do tempo", "qual a previsao do tempo", "como esta o tempo", "mostrar clima"])) {
    return { kind: "navigate", route: "/clima", label: "Abrindo previsão do tempo" };
  }
  if (hasAny(text, ["abrir aplicativos", "abrir apps", "mostrar aplicativos", "mostrar apps", "mostre os aplicativos"])) {
    return { kind: "navigate", route: "/apps", label: "Abrindo aplicativos" };
  }
  if (hasAny(text, ["abrir ajustes", "abrir configuracoes", "mostrar ajustes", "configuracoes"])) {
    return { kind: "navigate", route: "/ajustes", label: "Abrindo ajustes" };
  }
  if (
    hasAny(text, [
      "pagina inicial",
      "tela inicial",
      "ir para o inicio",
      "abrir inicio",
      "voltar ao inicio",
    ])
  ) {
    return { kind: "navigate", route: "/", label: "Abrindo tela inicial" };
  }
  const app = text.match(/^(?:abra|abrir|inicie|iniciar) (?:o |a )?(.+)$/);
  if (app && !/porta malas|porta|configuracao do veiculo/.test(app[1] ?? "")) return { kind: "open_app", name: app[1] ?? "", label: "Abrir aplicativo" };
  return { kind: "unknown", label: "Não reconheci uma ação do launcher. Reformule ou use o assistente do Android para consultas." };
}

interface VoicePluginListener {
  remove: () => Promise<void> | void;
}

export interface VoiceRecognitionResult {
  transcript: string;
}

interface VoiceControlPlugin {
  isAvailable(): Promise<{ available: boolean }>;
  startListening(): Promise<void>;
  stopListening(): Promise<void>;
  speak(options: { text: string }): Promise<void>;
  stopSpeaking(): Promise<void>;
  openSystemAssistant(): Promise<void>;
  addListener(
    event: "speechState",
    callback: (state: { speaking: boolean; error?: string }) => void,
  ): Promise<VoicePluginListener> | VoicePluginListener;
  addListener(
    event: "voiceResult",
    callback: (result: VoiceRecognitionResult) => void,
  ): Promise<VoicePluginListener> | VoicePluginListener;
  addListener(
    event: "voiceState",
    callback: (state: { listening: boolean; error?: string }) => void,
  ): Promise<VoicePluginListener> | VoicePluginListener;
  addListener(
    event: "voiceActivation",
    callback: () => void,
  ): Promise<VoicePluginListener> | VoicePluginListener;
}

function plugin(): VoiceControlPlugin | null {
  if (typeof window === "undefined") return null;
  const capacitor = (
    window as unknown as {
      Capacitor?: { Plugins?: Record<string, unknown>; isNativePlatform?: () => boolean };
    }
  ).Capacitor;
  if (!capacitor?.isNativePlatform?.()) return null;
  return (capacitor.Plugins?.["VoiceControl"] as VoiceControlPlugin | undefined) ?? null;
}

export const isNativeVoiceAvailable = async () => {
  const voice = plugin();
  if (!voice) return false;
  return voice
    .isAvailable()
    .then(({ available }) => available)
    .catch(() => false);
};

export const startVoiceRecognition = () => plugin()?.startListening();
export const stopVoiceRecognition = async () => { await plugin()?.stopListening(); };
export const stopVoiceSpeech = async () => {
  await plugin()?.stopSpeaking();
  if (typeof window !== "undefined") window.speechSynthesis?.cancel();
};
export const openSystemVoiceAssistant = async () => {
  const voice = plugin();
  if (!voice) throw new Error("O assistente do Android só está disponível no aplicativo instalado.");
  await voice.openSystemAssistant();
};
export async function speakVoiceResponse(text: string): Promise<void> {
  const voice = plugin();
  if (voice) return voice.speak({ text: text.slice(0, 400) });
  if (typeof window === "undefined" || !window.speechSynthesis) throw new Error("Voz indisponível neste navegador.");
  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text.slice(0, 400));
  utterance.lang = "pt-BR";
  const pt = synth.getVoices().find((v) => v.lang.toLowerCase() === "pt-br");
  if (!pt) throw new Error("Nenhuma voz pt-BR instalada neste navegador.");
  utterance.voice = pt;
  synth.cancel();
  return new Promise((resolve, reject) => {
    utterance.onend = () => resolve();
    utterance.onerror = () => reject(new Error("Não foi possível ler a resposta."));
    synth.speak(utterance);
  });
}
export function onVoiceSpeechState(callback: (state: { speaking: boolean; error?: string }) => void): () => void {
  const voice = plugin();
  if (!voice) return () => {};
  const handle = Promise.resolve(voice.addListener("speechState", callback));
  return () => { void handle.then((listener) => listener.remove()).catch(() => {}); };
}

export function onVoiceResult(callback: (result: VoiceRecognitionResult) => void): () => void {
  const voice = plugin();
  if (!voice) return () => {};
  const handle = Promise.resolve(voice.addListener("voiceResult", callback));
  return () => {
    void handle.then((listener) => listener.remove()).catch(() => {});
  };
}

export function onVoiceState(
  callback: (state: { listening: boolean; error?: string }) => void,
): () => void {
  const voice = plugin();
  if (!voice) return () => {};
  const handle = Promise.resolve(voice.addListener("voiceState", callback));
  return () => {
    void handle.then((listener) => listener.remove()).catch(() => {});
  };
}

export function onVoiceActivation(callback: () => void): () => void {
  const voice = plugin();
  if (!voice) return () => {};
  const handle = Promise.resolve(voice.addListener("voiceActivation", callback));
  return () => {
    void handle.then((listener) => listener.remove()).catch(() => {});
  };
}
