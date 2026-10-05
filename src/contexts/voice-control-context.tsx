import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useRadio } from "@/contexts/radio-player-context";
import {
  isNativeVoiceAvailable,
  onVoiceActivation,
  onVoiceResult,
  onVoiceState,
  parseVoiceCommand,
  startVoiceRecognition,
} from "@/services/voice-command";

interface VoiceControlValue {
  available: boolean;
  listening: boolean;
  activate: () => void;
}

const VoiceControlContext = createContext<VoiceControlValue | null>(null);

export function VoiceControlProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const radio = useRadio();
  const [available, setAvailable] = useState(false);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    void isNativeVoiceAvailable().then(setAvailable);
    const stopState = onVoiceState((state) => {
      setListening(state.listening);
      if (state.error) toast.error(state.error);
    });
    const stopActivation = onVoiceActivation(() => {
      setListening(true);
      void startVoiceRecognition()?.catch(() => setListening(false));
    });
    const stopResult = onVoiceResult(({ transcript }) => {
      const command = parseVoiceCommand(transcript);
      if (command.kind === "navigate") {
        void navigate({ to: command.route });
        toast.success(command.label);
      } else if (command.kind === "radio") {
        if (command.action === "next") radio.step(1);
        else if (command.action === "previous") radio.step(-1);
        else if (command.action === "toggle") radio.toggle();
        else if (command.action === "play" && radio.status !== "playing") radio.toggle();
        else if (command.action === "pause" && radio.status === "playing") radio.toggle();
        toast.success(command.label);
      } else {
        toast.info(command.label, { description: `“${transcript}”` });
      }
    });
    return () => {
      stopState();
      stopResult();
      stopActivation();
    };
  }, [navigate, radio]);

  const activate = useCallback(() => {
    setListening(true);
    void startVoiceRecognition()?.catch(() => {
      setListening(false);
      toast.error("Não foi possível ativar o microfone");
    });
  }, []);

  const value = useMemo(
    () => ({ available, listening, activate }),
    [available, listening, activate],
  );
  return <VoiceControlContext.Provider value={value}>{children}</VoiceControlContext.Provider>;
}

export function useVoiceControl(): VoiceControlValue {
  return (
    useContext(VoiceControlContext) ?? { available: false, listening: false, activate: () => {} }
  );
}
