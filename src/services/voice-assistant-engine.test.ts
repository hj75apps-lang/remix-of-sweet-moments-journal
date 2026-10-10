import { describe, expect, it, vi } from "vitest";
import { executeVoiceCommand, runVoiceTranscript, voiceProviders, type VoiceActions } from "./voice-assistant-engine";
import { parseVoiceCommand } from "./voice-command";
import type { RadioStation } from "./radio-browser";
const station: RadioStation = { id: "1", name: "Cultura FM", tags: ["sertanejo"], sources: ["https://example.org/live"], favicon: "", state: "", bitrate: 128, codec: "MP3" };
const actions = (): VoiceActions => ({
  navigate: vi.fn(async () => {}), apps: vi.fn(async () => []), launch: vi.fn(async () => {}),
  stations: vi.fn(async () => [station]), play: vi.fn(), media: () => null,
  control: vi.fn(async () => {}), volume: vi.fn(async () => "Volume confirmado"), navigation: vi.fn(async () => {}), weather: () => null, assistant: vi.fn(async () => {}),
});
describe("Voice Assistant Engine", () => {
  it.each([
    ["Abra o Spotify", "open_app"], ["Abra o YouTube Music", "open_app"],
    ["Toque a Rádio Cultura FM", "search_radio"], ["Procure rádios sertanejas", "search_radio"],
    ["Aumente o volume", "volume"], ["Coloque o volume em 30%", "volume"],
    ["Trace uma rota até o centro da cidade", "destination"], ["Encontre um posto próximo", "destination"],
    ["Que horas são?", "time"], ["Mostre o que está tocando", "now_playing"],
    ["Qual é a previsão do tempo?", "navigate"], ["Volte para a tela inicial", "navigate"],
    ["Pause a música", "radio"], ["Continue a reprodução", "radio"],
    ["Não abra o Spotify", "unknown"], ["Resuma as notícias de hoje", "unknown"],
    ["Encontre músicas de um artista", "unknown"], ["Coloque o volume em 150%", "unknown"],
  ])("interpreta %s como %s", (text, kind) => { expect(parseVoiceCommand(text).kind).toBe(kind); });
  it("só abre apps listados como instalados", async () => {
    const a = actions();
    expect((await runVoiceTranscript("Abra o Spotify", a)).message).toContain("Não encontrei");
    expect(a.launch).not.toHaveBeenCalled();
    a.apps = async () => [{ packageName: "com.spotify.music", label: "Spotify", icon: "" }];
    await runVoiceTranscript("Abra o Spotify", a);
    expect(a.launch).toHaveBeenCalledWith("com.spotify.music");
  });
  it("sempre confirma destino antes de abrir", async () => {
    const a = actions();
    const result = await runVoiceTranscript("Trace uma rota até o centro", a);
    expect(result.confirm?.kind).toBe("destination");
    expect(a.navigation).not.toHaveBeenCalled();
    if (result.confirm) await executeVoiceCommand(result.confirm, a, true);
    expect(a.navigation).toHaveBeenCalledWith("o centro");
  });
  it("encontra rádio real sem fabricar confirmação de áudio", async () => {
    const a = actions();
    expect((await runVoiceTranscript("Toque a Rádio Cultura FM", a)).message).toContain("Aguarde");
    expect(a.play).toHaveBeenCalledWith(station);
  });
  it("oferece escolhas quando a rádio é ambígua", async () => {
    const a = actions(); a.stations = async () => [station, { ...station, id: "2", name: "Cultura FM Sul" }];
    expect((await runVoiceTranscript("Toque a Rádio Cultura FM", a)).stations).toHaveLength(2);
    expect(a.play).not.toHaveBeenCalled();
  });
  it("não usa IA nem dados de clima inventados", async () => {
    const a = actions();
    expect((await runVoiceTranscript("Qual é a previsão do tempo?", a)).message).toContain("Aguardando");
    expect(voiceProviders.filter((p) => p.available === false).map((p) => p.id)).toEqual(["gpt", "gemini"]);
  });
  it("propaga falhas reais do controle sem afirmar sucesso", async () => {
    const a = actions(); a.volume = async () => { throw new Error("permission_denied"); };
    await expect(runVoiceTranscript("Aumente o volume", a)).rejects.toThrow("permission_denied");
  });
});