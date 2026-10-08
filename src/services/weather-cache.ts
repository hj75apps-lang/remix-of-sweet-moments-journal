import type { WeatherReport } from "./weather";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isCondition(value: unknown): boolean {
  return isRecord(value) && typeof value["text"] === "string" &&
    (value["code"] === undefined || finite(value["code"]));
}

/** Upgrade pre-hourly forecasts without discarding real cached daily conditions. */
export function normalizeWeatherCache(value: unknown): WeatherReport | null {
  if (!isRecord(value) || value["source"] !== "Open-Meteo" ||
      typeof value["city"] !== "string" || !isCondition(value) ||
      ![value["temp"], value["feels"], value["humidity"], value["wind"]].every(finite) ||
      !Array.isArray(value["days"])) return null;
  const days = value["days"].filter((day: unknown) => isRecord(day) && isCondition(day) &&
    typeof day["date"] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day["date"]) &&
    [day["min"], day["max"], day["rain"]].every(finite));
  if (days.length === 0) return null;
  const hours = Array.isArray(value["hours"]) ? value["hours"].filter((hour: unknown) =>
    isRecord(hour) && isCondition(hour) && typeof hour["time"] === "string" &&
    Number.isFinite(Date.parse(hour["time"])) && [hour["temp"], hour["rain"]].every(finite)) : [];
  return { ...value, days, hours } as unknown as WeatherReport;
}

export function isWeatherCache(value: unknown): value is WeatherReport {
  const normalized = normalizeWeatherCache(value);
  return normalized !== null && isRecord(value) && Array.isArray(value["hours"]) &&
    Array.isArray(value["days"]) && value["hours"].length === normalized.hours.length &&
    value["days"].length === normalized.days.length;
}