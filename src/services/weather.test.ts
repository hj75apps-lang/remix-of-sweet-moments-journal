import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWeather } from "./weather";

afterEach(() => vi.restoreAllMocks());

describe("weather service", () => {
  it("maps forecast data into the launcher report", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({
      current: {
        temperature_2m: 28.4,
        apparent_temperature: 31.2,
        relative_humidity_2m: 72,
        wind_speed_10m: 14.8,
        weather_code: 63,
      },
      daily: {
        time: ["2026-10-07"],
        weather_code: [63],
        temperature_2m_max: [30.1],
        temperature_2m_min: [22.2],
        precipitation_probability_max: [80],
      },
    }))).mockResolvedValueOnce(new Response(JSON.stringify({
      city: "Cidade",
      principalSubdivisionCode: "BR-MT",
    })));

    const report = await fetchWeather({ lat: -15.1, lng: -52.2 });
    expect(report.temp).toBe(28);
    expect(report.feels).toBe(31);
    expect(report.humidity).toBe(72);
    expect(report.wind).toBe(15);
    expect(report.text).toBe("Chuva");
    expect(report.days[0]).toMatchObject({ min: 22, max: 30, rain: 80 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("fails clearly when the provider returns an error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 503 }));
    await expect(fetchWeather({ lat: 0, lng: 0 })).rejects.toThrow("Serviço indisponível (503)");
  });
  it("rejects invalid coordinates without making network requests", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await expect(fetchWeather({ lat: 91, lng: 0 })).rejects.toThrow("Localização inválida");
    await expect(fetchWeather({ lat: 0, lng: Number.NaN })).rejects.toThrow("Localização inválida");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects incomplete daily values instead of silently converting them to zero", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({
      current: {
        temperature_2m: 28,
        apparent_temperature: 29,
        relative_humidity_2m: 70,
        wind_speed_10m: 10,
        weather_code: 1,
      },
      daily: {
        time: ["2026-10-07"],
        weather_code: [1],
        temperature_2m_max: [30],
        temperature_2m_min: [20],
      },
    }))).mockResolvedValueOnce(new Response(JSON.stringify({ city: "Cidade" })));
    await expect(fetchWeather({ lat: -15, lng: -52 })).rejects.toThrow("dados diários ausentes ou inválidos");
  });

});
