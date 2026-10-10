import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(async () => {}), launch: vi.fn(async () => {}), apps: vi.fn(async (): Promise<Array<{ packageName: string; label: string; icon: string }>> => []),
  start: vi.fn(async () => {}), stop: vi.fn(async () => {}), stopSpeech: vi.fn(async () => {}), speak: vi.fn(async () => {}),
  result: null as null | ((value: { transcript: string }) => void),
  state: null as null | ((value: { listening: boolean; error?: string }) => void),
}));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => mocks.navigate }));
vi.mock("@/contexts/radio-player-context", () => ({ useRadio: () => ({ favorites: [], volume: 0.8, setVolume: vi.fn(), play: vi.fn() }) }));
vi.mock("@/services/now-playing", () => ({ useNowPlaying: () => ({ media: null, control: vi.fn(async () => {}) }) }));
vi.mock("@/hooks/use-launcher-settings", () => ({ useLauncherSettings: () => ({ settings: { navApp: "maps" } }) }));
vi.mock("@/services/installed-apps", () => ({ listInstalledApps: mocks.apps, launchApp: mocks.launch }));
vi.mock("@/services/voice-command", async (original) => ({
  ...await original<typeof import("@/services/voice-command")>(),
  isNativeVoiceAvailable: async () => true, startVoiceRecognition: mocks.start, stopVoiceRecognition: mocks.stop,
  speakVoiceResponse: mocks.speak, stopVoiceSpeech: mocks.stopSpeech,
  onVoiceResult: (callback: typeof mocks.result) => { mocks.result = callback; return () => { mocks.result = null; }; },
  onVoiceState: (callback: typeof mocks.state) => { mocks.state = callback; return () => { mocks.state = null; }; },
  onVoiceActivation: () => () => {}, onVoiceSpeechState: () => () => {},
}));
import { VoiceControlProvider, useVoiceControl } from "./voice-control-context";
function Controls() {
  const voice = useVoiceControl();
  return <div><button onClick={voice.activate}>Ouvir</button><button onClick={voice.stop}>Parar</button>
    <button onClick={() => voice.submit("Abra o Spotify")}>App</button>
    <button onClick={() => voice.submit("Trace uma rota até o centro")}>Destino</button>
    <button onClick={voice.confirm}>Confirmar</button>
    <span data-testid="response">{voice.response}</span><span data-testid="phase">{voice.phase}</span>
    <span data-testid="pending">{voice.pending?.kind}</span></div>;
}
function mount() { render(<QueryClientProvider client={new QueryClient()}><VoiceControlProvider><Controls /></VoiceControlProvider></QueryClientProvider>); }
describe("fluxo global de voz", () => {
  beforeEach(() => {
    vi.clearAllMocks(); localStorage.clear();
    localStorage.setItem("sal.voice-preferences", JSON.stringify({ schema: 1, data: { spoken: false, provider: "local" } }));
    mocks.apps.mockResolvedValue([]); mocks.start.mockResolvedValue();
  });
  it("executa transcrição da ponte nativa", async () => {
    mount(); fireEvent.click(screen.getByText("Ouvir"));
    await act(async () => { mocks.result?.({ transcript: "Mostre os aplicativos instalados" }); });
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: "/apps" }));
  });
  it("não executa resultado de captura interrompida", async () => {
    mount(); fireEvent.click(screen.getByText("Ouvir")); fireEvent.click(screen.getByText("Parar"));
    await act(async () => { mocks.result?.({ transcript: "Mostre os aplicativos instalados" }); });
    expect(mocks.navigate).not.toHaveBeenCalled(); expect(mocks.stopSpeech).toHaveBeenCalled();
  });
  it("não abre app depois de cancelar consulta pendente", async () => {
    let resolve: ((apps: Array<{ packageName: string; label: string; icon: string }>) => void) | undefined;
    mocks.apps.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    mount(); fireEvent.click(screen.getByText("App"));
    await waitFor(() => expect(mocks.apps).toHaveBeenCalled());
    fireEvent.click(screen.getByText("Parar"));
    await act(async () => { resolve?.([{ packageName: "com.spotify.music", label: "Spotify", icon: "" }]); });
    expect(mocks.launch).not.toHaveBeenCalled();
  });
  it("mantém confirmação ao iniciar segunda captura", async () => {
    mount(); fireEvent.click(screen.getByText("Destino"));
    await waitFor(() => expect(screen.getByTestId("pending")).toHaveTextContent("destination"));
    fireEvent.click(screen.getByText("Ouvir"));
    expect(screen.getByTestId("pending")).toHaveTextContent("destination");
  });
  it("mostra recusa e revogação de permissão sem executar", async () => {
    mocks.start.mockRejectedValueOnce(new Error("Permissão do microfone negada"));
    mount(); fireEvent.click(screen.getByText("Ouvir"));
    await waitFor(() => expect(screen.getByTestId("response")).toHaveTextContent("negada"));
    await act(async () => { mocks.state?.({ listening: false, error: "Permissão revogada" }); });
    expect(screen.getByTestId("response")).toHaveTextContent("revogada");
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});