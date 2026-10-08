import { describe, expect, it } from "vitest";
import { isWeatherCache, normalizeWeatherCache } from "./weather-cache";
import { readStored } from "./storage";

const legacy = {
  source: "Open-Meteo", city: "Cuiabá", temp: 31, feels: 33,
  humidity: 60, wind: 10, text: "Céu limpo", code: 0,
  days: [{ date: "2026-10-08", min: 24, max: 33, rain: 0, text: "Céu limpo", code: 0 }],
};

describe("weather cache compatibility", () => {
  it("preserves legacy daily conditions and adds an empty hourly array", () => {
    expect(isWeatherCache(legacy)).toBe(false);
    expect(normalizeWeatherCache(legacy)).toEqual({ ...legacy, hours: [] });
  });
  it.each([legacy, { schema: 1, data: legacy }])("migrates raw and versioned saved forecasts", (saved) => {
    localStorage.setItem("test.weather", JSON.stringify(saved));
    const report = readStored("test.weather", null, {
      schema: 1, validate: isWeatherCache, migrateLegacy: normalizeWeatherCache,
    });
    expect(report?.hours).toEqual([]);
    expect(report?.days).toEqual(legacy.days);
    expect(JSON.parse(localStorage.getItem("test.weather") ?? "null").data.hours).toEqual([]);
    localStorage.removeItem("test.weather");
  });
  it("rejects invalid daily data and filters broken hourly entries", () => {
    expect(normalizeWeatherCache({ ...legacy, days: [null] })).toBeNull();
    expect(normalizeWeatherCache({ ...legacy, hours: [null, { time: "bad" }] })?.hours).toEqual([]);
    expect(normalizeWeatherCache(null)).toBeNull();
  });
});