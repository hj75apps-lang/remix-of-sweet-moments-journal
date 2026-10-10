import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { listInstalledApps, launchApp } from "@/services/installed-apps";
import { getDeviceInfo, setSystemVolume, startNavigation, isLauncherNative, errorMessage } from "@/services/launcher-system";
import { useLauncherSettings } from "@/hooks/use-launcher-settings";
import { useNowPlaying } from "@/services/now-playing";
import { fetchCatalog, type CatalogResult, type RadioStation } from "@/services/radio-browser";
import { verifiedStations } from "@/services/radio-catalog";
import { normalizeRadioStations } from "@/services/radio-preferences";
import { mergeStations } from "@/services/radio-search";
import { isWeatherCache } from "@/services/weather-cache";
import { executeVoiceCommand, runVoiceTranscript, type VoiceActions, type VoiceOutcome } from "@/services/voice-assistant-engine";
import { readVoicePreferences, saveVoicePreferences, type VoicePreferences } from "@/services/voice-preferences";
import { useRadio } from "@/contexts/radio-player-context";
import {
  isNativeVoiceAvailable,
  onVoiceActivation,
  onVoiceResult,
  onVoiceState,
  parseVoiceCommand,
  startVoiceRecognition,
  stopVoiceRecognition,
  stopVoiceSpeech,
  speakVoiceResponse,
  openSystemVoiceAssistant,
  onVoiceSpeechState,
  type VoiceCommand,
} from "@/services/voice-command";

interface VoiceControlValue {
  available: boolean;
  listening: boolean;
  open: boolean;
  phase: "idle" | "listening" | "processing" | "executing" | "speaking" | "error";
  transcript: string;
  response: string;
  choices: RadioStation[];
  pending: VoiceCommand | null;
  preferences: VoicePreferences;
  show: () => void;
  close: () => void;
  stop: () => void;
  submit: (transcript: string) => void;
  confirm: () => void;
  choose: (station: RadioStation) => void;
  configure: (preferences: VoicePreferences) => void;
  systemAssistant: () => void;
  activate: () => void;
}

const VoiceControlContext = createContext<VoiceControlValue | null>(null);

export function VoiceControlProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const radio = useRadio();
  const nowPlaying = useNowPlaying();
  const { settings } = useLauncherSettings();
  const queryClient = useQueryClient();
  const radioRef = useRef(radio);
  radioRef.current = radio;
  const [available, setAvailable] = useState(false);
  const [listening, setListening] = useState(false);
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<VoiceControlValue["phase"]>("idle");
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [choices, setChoices] = useState<RadioStation[]>([]);
  const [pending, setPending] = useState<VoiceCommand | null>(null);
  const [preferences, setPreferences] = useState<VoicePreferences>({ spoken: true, provider: "local" });
  const preferencesRef = useRef(preferences);
  preferencesRef.current = preferences;
  const actionsRef = useRef<VoiceActions | null>(null);
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const generation = useRef(0);
  const busy = useRef(false);
  const capturing = useRef(false);
  actionsRef.current = {
    navigate: async (route) => { if (route === "/") window.dispatchEvent(new Event("launcher:home")); await navigate({ to: route }); },
    apps: listInstalledApps,
    launch: launchApp,
    stations: async () => {
      let custom: RadioStation[] = [];
      try { custom = normalizeRadioStations(JSON.parse(localStorage.getItem("sal.radio-custom") ?? "[]"), 100); } catch { /* optional preference */ }
      const cached = queryClient.getQueryData<CatalogResult>(["radio-catalog"]);
      const catalog = cached ?? (navigator.onLine ? await queryClient.ensureQueryData({ queryKey: ["radio-catalog"], queryFn: () => fetchCatalog(), staleTime: 30 * 60_000 }) : { stations: verifiedStations });
      return mergeStations(custom, radioRef.current.favorites, catalog?.stations ?? verifiedStations);
    },
    play: (station) => radioRef.current.play(station),
    media: () => nowPlaying.media,
    control: nowPlaying.control,
    volume: async (command) => {
      const device = await getDeviceInfo();
      const current = device && device.maxVolume > 0 ? device.volume / device.maxVolume : radioRef.current.volume;
      const value = Math.max(0, Math.min(1, command.action === "set" ? command.value ?? current : command.action === "mute" ? 0 : current + (command.action === "up" ? 0.1 : -0.1)));
      if (isLauncherNative()) {
        const result = await setSystemVolume(value);
        return `Volume de mídia do Android: ${result.maxVolume > 0 ? Math.round(100 * result.volume / result.maxVolume) : 0} por cento.`;
      }
      radioRef.current.setVolume(value);
      return `Volume da rádio do launcher: ${Math.round(value * 100)} por cento. O navegador não controla o volume do sistema.`;
    },
    navigation: (destination) => startNavigation(settings.navApp, destination),
    weather: () => {
      const candidates = queryClient.getQueriesData({ queryKey: ["weather"] }).map(([, data]) => data).filter(isWeatherCache);
      return candidates.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0] ?? null;
    },
    assistant: openSystemVoiceAssistant,
  };

  const stop = useCallback(() => {
    generation.current++;
    busy.current = false;
    capturing.current = false;
    void stopVoiceRecognition().catch(() => {});
    void stopVoiceSpeech().catch(() => {});
    setListening(false); setPhase("idle"); setPending(null); setChoices([]);
  }, []);
  const finish = useCallback(async (outcome: VoiceOutcome, id: number) => {
    if (generation.current !== id) return;
    setResponse(outcome.message); setPending(outcome.confirm ?? null); setChoices(outcome.stations ?? []);
    setPhase("idle");
    if (preferencesRef.current.spoken) {
      setPhase("speaking");
      try { await speakVoiceResponse(outcome.message); }
      catch (error) { if (generation.current === id) setResponse(`${outcome.message} ${error instanceof Error ? error.message : "Voz indisponível."}`); }
      if (generation.current === id) setPhase("idle");
    }
  }, []);
  const perform = useCallback(async (text: string, confirmed?: VoiceCommand) => {
    const command = parseVoiceCommand(text);
    if (command.kind === "cancel") { stop(); setResponse("Cancelado."); return; }
    if (busy.current || !actionsRef.current || !text.trim()) return;
    const id = ++generation.current;
    const confirmation = confirmed ?? (command.kind === "confirm" ? pendingRef.current : null);
    busy.current = true; capturing.current = false;
    await stopVoiceRecognition().catch(() => {});
    await stopVoiceSpeech().catch(() => {});
    if (generation.current !== id) return;
    setOpen(true); setTranscript(text.slice(0, 500)); setPending(null); setChoices([]); setPhase("processing");
    // Each asynchronous lookup is followed by a generation guard before an external action.
    const base = actionsRef.current;
    const guard = () => { if (generation.current !== id) throw new Error("Comando cancelado."); };
    const actions: VoiceActions = {
      ...base,
      navigate: async (route) => { guard(); await base.navigate(route); },
      launch: async (pkg) => { guard(); setPhase("executing"); await base.launch(pkg); },
      play: (station) => { guard(); setPhase("executing"); base.play(station); },
      control: async (action) => { guard(); setPhase("executing"); await base.control(action); },
      volume: async (volume) => { guard(); setPhase("executing"); return base.volume(volume); },
      navigation: async (destination) => { guard(); setPhase("executing"); await base.navigation(destination); },
      assistant: async () => { guard(); await base.assistant(); },
    };
    try {
      const outcome = confirmation ? await executeVoiceCommand(confirmation, actions, true) : await runVoiceTranscript(text, actions);
      await finish(outcome, id);
    } catch (error) {
      if (generation.current === id) { setPhase("error"); setResponse(error instanceof Error && !["unavailable", "not_installed", "permission_denied", "blocked"].includes(error.message) ? error.message : errorMessage(error)); }
    } finally { if (generation.current === id) busy.current = false; }
  }, [finish, stop]);
  const performRef = useRef(perform);
  performRef.current = perform;

  const activate = useCallback(() => {
    const confirmation = pendingRef.current;
    stop(); setPending(confirmation); setOpen(true); setResponse("");
    if (preferencesRef.current.provider === "android") {
      void openSystemVoiceAssistant().catch((error: unknown) => { setPhase("error"); setResponse(error instanceof Error ? error.message : "Assistente indisponível."); });
      return;
    }
    capturing.current = true; setListening(true); setPhase("listening");
    const request = startVoiceRecognition();
    if (!request) { capturing.current = false; setListening(false); setPhase("error"); setResponse("O reconhecimento pelo microfone está disponível no APK Android; no preview, digite o comando."); return; }
    void request.catch((error: unknown) => { capturing.current = false; setListening(false); setPhase("error"); setResponse(error instanceof Error ? error.message : "Não foi possível ativar o microfone."); });
  }, [stop]);
  const activateRef = useRef(activate);
  activateRef.current = activate;

  useEffect(() => {
    let gone = false;
    setPreferences(readVoicePreferences());
    void isNativeVoiceAvailable().then((value) => { if (!gone) setAvailable(value); });
    const stopState = onVoiceState((state) => {
      setListening(state.listening);
      if (state.error) { capturing.current = false; setPhase("error"); setResponse(state.error); }
      else setPhase((current) => state.listening ? "listening" : current === "listening" ? "idle" : current);
    });
    const stopActivation = onVoiceActivation(() => {
      activateRef.current();
    });
    const stopResult = onVoiceResult(({ transcript }) => {
      if (capturing.current && typeof transcript === "string") void performRef.current(transcript);
    });
    const stopSpeech = onVoiceSpeechState((state) => {
      setPhase((current) => state.speaking ? "speaking" : current === "speaking" ? "idle" : current);
      if (state.error) setResponse((text) => `${text} ${state.error}`);
    });
    const hidden = () => { if (document.hidden) stop(); };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      gone = true;
      stopState();
      stopResult();
      stopActivation();
      stopSpeech();
      document.removeEventListener("visibilitychange", hidden);
      stop();
    };
  }, [stop]);

  const value = useMemo(
    () => ({ available, listening, activate, open, phase, transcript, response, choices, pending, preferences,
      show: () => setOpen(true), close: () => { stop(); setOpen(false); }, stop,
      submit: (text: string) => { void perform(text); }, confirm: () => { if (pending) void perform("confirmar", pending); },
      choose: (station: RadioStation) => {
        if (!choices.some((choice) => choice.id === station.id)) return;
        stop(); radioRef.current.play(station); setResponse(`Solicitei a reprodução de ${station.name}. Aguarde a confirmação do player.`);
      },
      configure: (value: VoicePreferences) => { setPreferences(value); saveVoicePreferences(value); if (!value.spoken) void stopVoiceSpeech().catch(() => {}); },
      systemAssistant: () => { stop(); void openSystemVoiceAssistant().catch((error: unknown) => { setPhase("error"); setResponse(error instanceof Error ? error.message : "Assistente indisponível."); }); },
    }),
    [available, listening, activate, open, phase, transcript, response, choices, pending, preferences, stop, perform],
  );
  return <VoiceControlContext.Provider value={value}>{children}</VoiceControlContext.Provider>;
}

export function useVoiceControl(): VoiceControlValue {
  const voice = useContext(VoiceControlContext);
  if (!voice) throw new Error("VoiceControlProvider required");
  return voice;
}
