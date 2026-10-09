import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { WeatherWidget } from "./weather-widget";

vi.mock("@/hooks/use-weather", () => ({
  useWeather: () => ({
    position: { lat: -15.6, lng: -56.1 },
    gpsError: "",
    locate: vi.fn(),
    query: {
      data: {
        city: "Cuiabá",
        temp: 31,
        feels: 34,
        text: "Ensolarado",
        code: 0,
        updatedAt: Date.now(),
        days: [{ date: "2026-10-08", max: 33, min: 24, code: 0, text: "Sol", rain: 0 }],
      },
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    },
  }),
}));

vi.mock("@/components/weather/weather-symbol", () => ({
  WeatherSymbol: () => <span aria-hidden="true" />,
}));

vi.mock("@/components/weather/weather-details", () => ({
  WeatherDetails: ({ weather }: { weather: { city: string } }) => (
    <p data-testid="expanded-forecast">Detalhes de {weather.city}</p>
  ),
}));

afterEach(() => cleanup());

function renderHome() {
  return render(
    <main>
      <nav aria-label="Menu principal">Dock da Launcher</nav>
      <div id="launcher-home-workspace" className="relative">
        <div id="launcher-home-grid">
          <WeatherWidget />
        </div>
      </div>
    </main>,
  );
}

describe("weather expansion in launcher workspace", () => {
  it("shows the actual condition and Celsius unit on the home card", () => {
    renderHome();
    expect(screen.getByLabelText("Condição do tempo")).toHaveTextContent("Ensolarado");
    expect(screen.getByText("°C")).toBeInTheDocument();
    expect(screen.getByLabelText("Condição do tempo")).toHaveTextContent("Ensolarado");
    expect(screen.getByText("Sensação de 34°")).toBeInTheDocument();
    expect(screen.getByLabelText("Temperaturas de hoje")).toHaveTextContent("Máx. 33° · Mín. 24°");
    expect(screen.queryByText("Cuiabá")).not.toBeInTheDocument();
    expect(screen.queryByText("Ver previsão completa")).not.toBeInTheDocument();
  });

  it("opens within the home content area without covering or disabling the Dock", () => {
    renderHome();
    fireEvent.click(screen.getByRole("button", { name: "Abrir previsão do tempo para Cuiabá" }));

    const workspace = document.getElementById("launcher-home-workspace");
    const homeGrid = document.getElementById("launcher-home-grid");
    const panel = screen.getByRole("region", { name: "Previsão do tempo para Cuiabá" });

    expect(panel.parentElement).toBe(workspace);
    expect(panel).toHaveClass("absolute", "inset-0");
    expect(homeGrid).toHaveAttribute("inert");
    expect(screen.getByRole("navigation", { name: "Menu principal" })).toBeInTheDocument();
    expect(screen.getByTestId("expanded-forecast")).toHaveTextContent("Cuiabá");
    expect(screen.getByRole("button", { name: "Voltar à tela inicial" })).toHaveFocus();
  });

  it("closes in place via the back button and restores the home widgets", () => {
    renderHome();
    fireEvent.click(screen.getByRole("button", { name: "Abrir previsão do tempo para Cuiabá" }));
    fireEvent.click(screen.getByRole("button", { name: "Voltar à tela inicial" }));

    expect(screen.queryByRole("region", { name: "Previsão do tempo para Cuiabá" })).not.toBeInTheDocument();
    expect(document.getElementById("launcher-home-grid")).not.toHaveAttribute("inert");
    expect(screen.getByRole("button", { name: "Abrir previsão do tempo para Cuiabá" })).toBeInTheDocument();
  });

  it("supports Escape to return to the launcher home", () => {
    renderHome();
    fireEvent.click(screen.getByRole("button", { name: "Abrir previsão do tempo para Cuiabá" }));
    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("region", { name: "Previsão do tempo para Cuiabá" })).not.toBeInTheDocument();
    expect(document.getElementById("launcher-home-grid")).not.toHaveAttribute("inert");
  });
});
