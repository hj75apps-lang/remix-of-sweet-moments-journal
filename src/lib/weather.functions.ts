import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface WeatherDay { date: string; min: number; max: number; rain: number; text: string; icon: string }
export interface WeatherReport {
  city: string;
  temp: number;
  feels: number;
  humidity: number;
  wind: number;
  text: string;
  icon: string;
  source: "Climatempo";
  days: WeatherDay[];
}

interface ClimatempoLocale {
  id: number;
  name: string;
  state: string;
}

interface ClimatempoCurrent {
  name?: string;
  state?: string;
  data?: {
    temperature?: number;
    sensation?: number;
    humidity?: number;
    wind_velocity?: number;
    condition?: string;
  };
}

interface ClimatempoForecastDay {
  date?: string;
  temperature?: { min?: number; max?: number };
  rain?: { probability?: number };
  text_icon?: { text?: { pt?: string } };
}

interface ClimatempoForecast {
  data?: ClimatempoForecastDay[];
}

const CLIMATEMPO_API = "https://apiadvisor.climatempo.com.br/api/v1";
const cache = new Map<string, { at: number; data: WeatherReport }>();
const TTL = 15 * 60_000;

async function callClimatempo<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const separator = path.includes("?") ? "&" : "?";
  const response = await fetch(`${CLIMATEMPO_API}${path}${separator}token=${encodeURIComponent(token)}`, init);
  if (!response.ok) {
    const details = (await response.text()).slice(0, 200);
    throw new Error(`Climatempo indisponível [${response.status}]: ${details}`);
  }
  return response.json() as Promise<T>;
}

function rounded(value: number | undefined): number {
  return Math.round(value ?? 0);
}

/** Current weather + 5-day forecast for a GPS position (Climatempo Advisor). */
export const getWeather = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).parse(d))
  .handler(async ({ data }): Promise<WeatherReport> => {
    const token = process.env["CLIMATEMPO_API_TOKEN"];
    if (!token) throw new Error("Token da Climatempo não configurado");
    // ~1 km rounding: nearby requests share the cache and limit cost.
    const lat = Math.round(data.lat * 100) / 100;
    const lng = Math.round(data.lng * 100) / 100;
    const ck = `${lat},${lng}`;
    const hit = cache.get(ck);
    if (hit && Date.now() - hit.at < TTL) return hit.data;

    const locales = await callClimatempo<ClimatempoLocale[]>(
      `/locale/city?latitude=${lat}&longitude=${lng}`,
      token,
    );
    const locale = locales[0];
    if (!locale) throw new Error("A Climatempo não encontrou uma cidade para esta localização");

    const [current, forecast] = await Promise.all([
      callClimatempo<ClimatempoCurrent>(`/weather/locale/${locale.id}/current`, token),
      callClimatempo<ClimatempoForecast>(`/forecast/locale/${locale.id}/days/15`, token),
    ]);
    const currentData = current.data;
    if (!currentData) throw new Error("A Climatempo não retornou as condições atuais");

    const report: WeatherReport = {
      city: [current.name ?? locale.name, current.state ?? locale.state].filter(Boolean).join(" - "),
      temp: rounded(currentData.temperature),
      feels: rounded(currentData.sensation),
      humidity: rounded(currentData.humidity),
      wind: rounded(currentData.wind_velocity),
      text: currentData.condition ?? "Condição não informada",
      icon: "",
      source: "Climatempo",
      days: (forecast.data ?? []).slice(0, 5).map((day) => ({
        date: day.date ?? "",
        min: rounded(day.temperature?.min),
        max: rounded(day.temperature?.max),
        rain: rounded(day.rain?.probability),
        text: day.text_icon?.text?.pt ?? "",
        icon: "",
      })).filter((day) => day.date.length > 0),
    };
    cache.set(ck, { at: Date.now(), data: report });
    return report;
  });
