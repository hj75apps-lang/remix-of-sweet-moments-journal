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
