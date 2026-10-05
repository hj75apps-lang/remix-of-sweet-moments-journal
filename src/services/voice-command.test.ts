import { describe, expect, it } from "vitest";
import { normalizeVoiceText, parseVoiceCommand } from "./voice-command";

describe("comandos de voz", () => {
  it("normaliza fala em português", () => {
    expect(normalizeVoiceText("  PREVISÃO do tempo! ")).toBe("previsao do tempo");
  });

  it("abre as telas principais", () => {
    expect(parseVoiceCommand("abrir rádio")).toMatchObject({ kind: "navigate", route: "/radio" });
    expect(parseVoiceCommand("como está o tempo")).toMatchObject({ kind: "navigate", route: "/clima" });
    expect(parseVoiceCommand("abrir configurações")).toMatchObject({ kind: "navigate", route: "/ajustes" });
  });

  it("controla a reprodução", () => {
    expect(parseVoiceCommand("próxima estação")).toMatchObject({ kind: "radio", action: "next" });
    expect(parseVoiceCommand("pause a rádio")).toMatchObject({ kind: "radio", action: "pause" });
    expect(parseVoiceCommand("tocar rádio")).toMatchObject({ kind: "radio", action: "play" });
  });

  it("mantém comandos desconhecidos seguros", () => {
    expect(parseVoiceCommand("abrir porta-malas").kind).toBe("unknown");
  });
});