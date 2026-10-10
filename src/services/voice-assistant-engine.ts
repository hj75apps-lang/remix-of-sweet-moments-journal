import { parseVoiceCommand, normalizeVoiceText, type VoiceCommand } from "./voice-command";
import type { RadioStation } from "./radio-browser";
import type { InstalledApp } from "./installed-apps";
import type { NowPlaying } from "./now-playing";
import type { WeatherReport } from "./weather";
import { isWeatherCache } from "./weather-cache";
import { searchStations } from "./radio-search";

export interface VoiceOutcome { message: string; confirm?: VoiceCommand; stations?: RadioStation[] }
export interface VoiceActions {
  navigate(route: "/" | "/radio" | "/clima" | "/apps" | "/ajustes"): Promise<void>;
  apps(): Promise<InstalledApp[]>;
  launch(packageName: string): Promise<void>;
  stations(): Promise<RadioStation[]>;
  play(station: RadioStation): void;
  media(): NowPlaying | null;
  control(action: "play" | "pause" | "next" | "previous"): Promise<void>;
  volume(command: Extract<VoiceCommand, { kind: "volume" }>): Promise<string>;
  navigation(destination: string): Promise<void>;
  weather(): WeatherReport | null;
  assistant(): Promise<void>;
}
const aliases: Record<string, string> = {
  spotify: "com.spotify.music", waze: "com.waze", "google maps": "com.google.android.apps.maps",
  maps: "com.google.android.apps.maps", "youtube music": "com.google.android.apps.youtube.music",
  youtube: "com.google.android.youtube",
};
export const voiceProviders = [
  { id: "local", available: true, label: "Comandos locais" },
  { id: "android", available: "native", label: "Assistente padrão do Android" },
  { id: "gpt", available: false, label: "GPT — conexão segura pendente" },
  { id: "gemini", available: false, label: "Gemini — conexão segura pendente" },
] as const;

/** Only allowlisted, typed launcher actions. No model text is executed as code or URLs. */
export async function executeVoiceCommand(command: VoiceCommand, actions: VoiceActions, confirmed = false): Promise<VoiceOutcome> {
  switch (command.kind) {
    case "unknown": return { message: command.label };
    case "cancel": return { message: "Cancelado." };
    case "confirm": return { message: "Não há ação aguardando confirmação." };
    case "navigate":
      await actions.navigate(command.route);
      return { message: command.label };
    case "time": return { message: `São ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.` };
    case "system_assistant": await actions.assistant(); return { message: "Solicitei a abertura do assistente do Android." };
    case "now_playing": {
      await actions.navigate("/");
      const media = actions.media();
      return { message: media ? `${media.title || media.stationName || media.sourceName}. ${media.playing ? "Tocando" : "Reprodução não confirmada"}, ${media.sourceName}.` : "Nenhuma fonte de áudio disponível." };
    }
    case "open_app": {
      const apps = await actions.apps();
      const normalized = normalizeVoiceText(command.name);
      const packageName = aliases[normalized];
      const matches = apps.filter((app) => packageName ? app.packageName === packageName : normalizeVoiceText(app.label) === normalized);
      const app = matches.length === 1 ? matches[0] : undefined;
      if (!app) return { message: matches.length > 1 ? "Há mais de um aplicativo com esse nome. Escolha na lista de Apps." : "Não encontrei esse aplicativo instalado. Confira a lista de Apps." };
      await actions.launch(app.packageName);
      return { message: `Solicitei a abertura de ${app.label}.` };
    }
    case "search_radio": {
      const query = command.query.replace(/^de /, "").replace(/sertanejas?/, "sertanejo").replace(/noticias/, "notícias");
      const matches = searchStations(await actions.stations(), query).slice(0, 8);
      if (!matches.length) return { message: "Não encontrei essa rádio no catálogo disponível." };
      if (!command.play || matches.length > 1) return { message: "Escolha uma estação.", stations: matches };
      const station = matches[0];
      if (station) actions.play(station);
      return { message: `Solicitei a reprodução de ${station?.name ?? "rádio"}. Aguarde a confirmação do player.` };
    }
    case "radio": {
      const media = actions.media();
      if (!media) return { message: "Escolha uma rádio ou inicie um player primeiro." };
      const action = command.action === "toggle" ? (media.playing ? "pause" : "play") : command.action;
      await actions.control(action);
      return { message: "Comando enviado ao player; o estado será confirmado pelo áudio." };
    }
    case "volume": return { message: await actions.volume(command) };
    case "open_navigation":
      await actions.navigation("");
      return { message: "Solicitei a abertura do navegador escolhido." };
    case "destination":
      if (!command.destination.trim() || command.destination.length > 200) return { message: "Diga um destino válido e mais específico." };
      if (!confirmed) return { message: `Buscar “${command.destination}” no navegador escolhido? Confirme ou diga um endereço mais específico.`, confirm: command };
      await actions.navigation(command.destination);
      return { message: "Solicitei a busca no navegador. Confira o destino antes de dirigir." };
  }
}

export async function runVoiceTranscript(transcript: string, actions: VoiceActions): Promise<VoiceOutcome> {
  const command = parseVoiceCommand(transcript);
  if (command.kind === "navigate" && command.route === "/clima") {
    await actions.navigate("/clima");
    const weather = actions.weather();
    if (!isWeatherCache(weather)) return { message: "Abrindo previsão. Aguardando localização ou dados de clima." };
    const stale = !weather.updatedAt || Date.now() - weather.updatedAt > 30 * 60_000;
    return { message: `${stale ? "Última previsão salva" : "Previsão Open-Meteo"}: ${weather.city}, ${Math.round(weather.temp)} graus, ${weather.text}.` };
  }
  return executeVoiceCommand(command, actions);
}