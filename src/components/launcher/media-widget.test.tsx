import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { NowPlaying } from "@/services/now-playing";
import { MediaWidget } from "./media-widget";
const mocks = vi.hoisted(() => ({ media: null as NowPlaying | null, control: vi.fn(), permission: true, nativeAvailable: false, requestPermission: vi.fn() }));
vi.mock("@/services/now-playing", () => ({ useNowPlaying: () => mocks }));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const radio: NowPlaying = { title: "Real transmission", stationName: "Emissora 850 AM", frequency: "850 AM", artist: "", album: "", sourceName: "Rádios Online", packageName: "", artwork: "https://image.example/art.jpg", playing: true, duration: 0, position: 0, kind: "radio", status: "playing" };
describe("now-playing presentation", () => {
  it("prioritizes station and confirmed frequency then real track", () => {
    mocks.media = radio; render(<MediaWidget />);
    expect(screen.getByText("Emissora 850 AM")).toBeInTheDocument(); expect(screen.getByText("850 AM")).toBeInTheDocument();
    expect(screen.getByText("Real transmission")).toBeInTheDocument(); expect(screen.getByRole("button", { name: "Pausar" })).toBeInTheDocument();
  });
  it("falls back from broken cover to app icon then neutral illustration", () => {
    mocks.media = { ...radio, sourceIcon: "https://image.example/icon.png" }; render(<MediaWidget />);
    fireEvent.error(screen.getByRole("img")); expect(screen.getByRole("img")).toHaveAttribute("src", "https://image.example/icon.png");
    fireEvent.error(screen.getByRole("img")); expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
  it("resets failed artwork when content changes", () => {
    mocks.media = radio; const { rerender } = render(<MediaWidget />); fireEvent.error(screen.getByRole("img"));
    mocks.media = { ...radio, title: "Next track", artwork: "https://image.example/next.jpg" }; rerender(<MediaWidget />);
    expect(screen.getByRole("img")).toHaveAttribute("src", "https://image.example/next.jpg");
  });
  it("shows buffering without claiming audio is playing", () => {
    mocks.media = { ...radio, playing: false, status: "loading" }; render(<MediaWidget />);
    expect(screen.getByRole("status")).toHaveTextContent("Carregando"); expect(screen.getByRole("button", { name: "Tocar" })).toBeInTheDocument();
  });
  it("routes external seek to the selected session", () => {
    mocks.media = { ...radio, kind: "app", stationName: "", duration: 1000 }; render(<MediaWidget />);
    fireEvent.click(screen.getByRole("button", { name: "Avançar" })); expect(mocks.control).toHaveBeenCalledWith("forward");
  });
  it("shows honest empty state and disabled controls", () => {
    mocks.media = null; render(<MediaWidget />);
    expect(screen.getByText("Nada tocando")).toBeInTheDocument(); expect(screen.getByRole("button", { name: "Tocar" })).toBeDisabled();
  });
});