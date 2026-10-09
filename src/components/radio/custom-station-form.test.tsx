import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CustomStationForm } from "./custom-station-form";

afterEach(cleanup);
describe("manual radio form", () => {
  it("links validation errors to fields and retains successive edits", () => {
    const onSave = vi.fn();
    render(<CustomStationForm open onOpenChange={vi.fn()} onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: "Salvar rádio" }));
    const name = screen.getByPlaceholderText("Minha Rádio");
    const stream = screen.getByPlaceholderText("https://stream.exemplo.com/live.mp3");
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveAccessibleDescription("Informe o nome da rádio");
    fireEvent.change(name, { target: { value: "Minha Rádio" } });
    fireEvent.change(stream, { target: { value: "https://user:pass@radio.example/live.mp3" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar rádio" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(stream).toHaveAccessibleDescription("Use um endereço https:// sem usuário ou senha");
    fireEvent.change(stream, { target: { value: "https://radio.example/live.mp3" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar rádio" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: "Minha Rádio", sources: ["https://radio.example/live.mp3"] }));
  });
});