import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWeather } from "./weather";

afterEach(() => vi.restoreAllMocks());

describe("weather service", () => {
  const validForecast = () => ({
    current: { temperature_2m: 0, apparent_temperature: -2, relative_humidity_2m: 80, wind_speed_10m: 8, weather_code: 3 },
    hourly: { time: ["2026-10-08T12:00", "2026-10-08T13:00"], temperature_2m: [0, 1], precipitation_probability: [10, 20], weather_code: [3, 3] },
    daily: {
      time: ["2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11", "2026-10-12", "2026-10-13"],
      temperature_2m_min: [-3, -3, -3, -3, -3, -3], temperature_2m_max: [2, 2, 2, 2, 2, 2],
      precipitation_probability_max: [10, 10, 10, 10, 10, 10], weather_code: [3, 3, 3, 3, 3, 3],
    },
  });
  const mockForecast = (forecast: unknown) => vi.spyOn(globalThis, "fetch").mockImplementation(async (url) =>
    new Response(JSON.stringify(String(url).includes("open-meteo") ? forecast : { city: "Teste" })));

  it.each([{ lat: NaN, lng: 0 }, { lat: 91, lng: 0 }, { lat: 0, lng: -181 }])("rejects invalid coordinates before making requests", async (position) => {
    const requests = mockForecast(validForecast());
    await expect(fetchWeather(position)).rejects.toThrow("Localização inválida");
    expect(requests).not.toHaveBeenCalled();
  });

  it.each(["missing current reading", "missing daily reading", "invalid day", "out-of-range probability", "incomplete week"])("does not invent zeros for %s", async (scenario) => {
    const forecast = validForecast();
    if (scenario === "missing current reading") Reflect.deleteProperty(forecast.current, "temperature_2m");
    if (scenario === "missing daily reading") forecast.daily.temperature_2m_min = [];
    if (scenario === "invalid day") forecast.daily.time[2] = "2026-02-30";
    if (scenario === "out-of-range probability") forecast.daily.precipitation_probability_max[0] = 101;
    if (scenario === "incomplete week") forecast.daily.time.pop();
    mockForecast(forecast);
    await expect(fetchWeather({ lat: 0, lng: 0 })).rejects.toThrow("Previsão incompleta");
  });

  it("preserves real zero temperatures and omits malformed hourly samples", async () => {
    const forecast = validForecast();
    forecast.hourly.temperature_2m = [0];
    mockForecast(forecast);
    const report = await fetchWeather({ lat: 0, lng: 0 });
    expect(report.temp).toBe(0);
    expect(report.hours).toHaveLength(1);
    expect(report.hours[0]?.temp).toBe(0);
  });
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
        time: ["2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11", "2026-10-12", "2026-10-13"],
        weather_code: [63, 3, 2, 0, 51, 61],
        temperature_2m_max: [30.1, 31, 32, 33, 34, 35],
        temperature_2m_min: [22.2, 23, 24, 25, 26, 27],
        precipitation_probability_max: [80, 10, 20, 0, 40, 60],
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
    expect(report.days).toHaveLength(6);
    expect(report.days[5]).toMatchObject({ date: "2026-10-13", max: 35, min: 27 });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("forecast_days=6");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("fails clearly when the provider returns an error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 503 }));
    await expect(fetchWeather({ lat: 0, lng: 0 })).rejects.toThrow("Serviço indisponível (503)");
  });
});
