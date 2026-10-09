import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useWeather } from "./use-weather";

const stored = vi.hoisted(() => ({
  position: { lat: -15.6, lng: -56.1 },
  report: {
    city: "Cuiabá", source: "Open-Meteo", temp: 30, feels: 30,
    humidity: 38, wind: 5, code: 0, text: "Céu limpo", hours: [],
    days: [{ date: "2026-10-08", max: 39, min: 24, rain: 0, code: 0, text: "Céu limpo" }],
    updatedAt: 1,
  },
}));

vi.mock("@/services/storage", () => ({
  readStored: (key: string) => key === "sal.weather-pos" ? stored.position : stored.report,
  writeStored: vi.fn(),
}));
vi.mock("@/services/location-store", () => ({ getLocationOnce: vi.fn() }));

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function mount(client: QueryClient) {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  return renderHook(() => useWeather(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
}

describe("shared weather reading across screens", () => {
  it("keeps a newer live report when another screen mounts with an older disk cache", async () => {
    const client = new QueryClient();
    const key = ["weather", "-15.60,-56.10"];
    const live = { ...stored.report, temp: 32, text: "Nublado", code: 3, updatedAt: Date.now() };
    client.setQueryData(key, live);
    const { result } = mount(client);
    await waitFor(() => expect(result.current.query.data).toEqual(live));
    expect(client.getQueryData(key)).toEqual(live);
  });

  it("hydrates the disk report when no shared reading exists, including offline", async () => {
    const client = new QueryClient();
    const { result } = mount(client);
    await waitFor(() => expect(result.current.query.data).toEqual(stored.report));
  });
});
