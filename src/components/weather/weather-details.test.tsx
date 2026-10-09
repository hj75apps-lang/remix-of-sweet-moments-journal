import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { WeatherDetails } from "./weather-details";
import type { WeatherReport } from "@/services/weather";

afterEach(cleanup);

const weather: WeatherReport = {
  city: "Barra do Garças - MT", source: "Open-Meteo",
  temp: 33, feels: 38, humidity: 47, wind: 5, code: 0, text: "Céu limpo", hours: [],
  days: Array.from({ length: 6 }, (_, index) => ({
    date: `2026-10-${String(8 + index).padStart(2, "0")}`,
    max: 34 + index, min: 22 + index, rain: index * 2, code: 3, text: "Nublado",
  })),
};

describe("weather forecast calendar", () => {
  it("labels hourly forecasts by time instead of presenting a different forecast as Agora", () => {
    render(<WeatherDetails weather={{ ...weather, hours: [
      { time: "2026-10-08T12:00:00", temp: 28, code: 3, text: "Nublado", rain: 20 },
    ] }} />);
    expect(screen.queryByText("Agora")).not.toBeInTheDocument();
    expect(screen.getByText("12:00")).toBeInTheDocument();
    expect(screen.getByText("28°")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Condição atual" })).toHaveTextContent("33°C");
  });

  it("highlights today and reserves all five forecast items for tomorrow onward", () => {
    render(<WeatherDetails weather={weather} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveClass("sr-only");
    expect(screen.queryByText("Previsão da semana")).not.toBeInTheDocument();
    expect(screen.queryByText(weather.source)).not.toBeInTheDocument();
    expect(screen.queryByText(weather.city)).not.toBeInTheDocument();
    expect(screen.getByText("Hoje · Céu limpo")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Condição atual" })).getByText("Máx. 34° · Mín. 22°")).toBeInTheDocument();
    const forecast = screen.getByRole("list", { name: "Previsão de cinco dias" });
    expect(within(forecast).getAllByRole("listitem")).toHaveLength(5);
    expect(Array.from(forecast.querySelectorAll("time")).map((time) => time.dateTime)).toEqual([
      "2026-10-09", "2026-10-10", "2026-10-11", "2026-10-12", "2026-10-13",
    ]);
    expect(within(forecast).queryByText("Hoje")).not.toBeInTheDocument();
    expect(within(forecast).getByRole("heading", { name: "sexta-feira" })).toBeInTheDocument();
  });

  it("does not fabricate extra days when an offline forecast is incomplete", () => {
    render(<WeatherDetails weather={{ ...weather, days: weather.days.slice(0, 3) }} />);
    const forecast = screen.getByRole("list", { name: "Previsão de cinco dias" });
    expect(within(forecast).getAllByRole("listitem")).toHaveLength(2);
    expect(forecast.querySelector('time[datetime="2026-10-08"]')).toBeNull();
  });
});
