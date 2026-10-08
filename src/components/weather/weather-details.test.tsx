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
  it("highlights today and reserves all five forecast items for tomorrow onward", () => {
    render(<WeatherDetails weather={weather} />);
    expect(screen.getByText("Hoje · 08 de out")).toBeInTheDocument();
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