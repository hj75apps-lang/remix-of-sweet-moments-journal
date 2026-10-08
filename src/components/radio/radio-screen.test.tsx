import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
const { discover, queue } = vi.hoisted(() => ({ discover: vi.fn(), queue: vi.fn() }));
vi.mock("@/services/radio-network", () => ({ discoverRadioWebsite: discover }));
vi.mock("@/services/radio-browser", async (original) => ({ ...await original<typeof import("@/services/radio-browser")>(), fetchCatalog: async () => ({ stations: [] }), fetchByName: async () => [] }));
vi.mock("@/hooks/use-custom-stations", () => ({ useCustomStations: () => ({ stations: [], add: vi.fn(), remove: vi.fn() }) }));
vi.mock("@/contexts/radio-player-context", () => ({ useRadio: () => ({ station: null, status: "idle", favorites: [], listeningHistory: [], volume: 0.8, setQueue: queue }) }));
import { RadioScreen } from "./radio-screen";
afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); });
describe("radio website search", () => {
  it("preserves the URL through debounce so website discovery can start", async () => {
    vi.useFakeTimers();
    discover.mockResolvedValue({ status: "not-found" });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    render(<QueryClientProvider client={client}><RadioScreen /></QueryClientProvider>);
    fireEvent.change(screen.getByPlaceholderText("Nome, frequência, cidade, estado ou endereço…"), { target: { value: " https://radio.example.br/ao-vivo " } });
    await act(async () => { await vi.advanceTimersByTimeAsync(350); });
    expect(discover).toHaveBeenCalledExactlyOnceWith("https://radio.example.br/ao-vivo");
    client.clear();
  });
});
