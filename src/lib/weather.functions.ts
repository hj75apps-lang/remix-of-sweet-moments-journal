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
  days: WeatherDay[];
}

const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";
const cache = new Map<string, { at: number; data: WeatherReport }>();
const TTL = 15 * 60_000;

async function call(path: string, lovable: string, key: string) {
  const res = await fetch(`${GATEWAY}${path}`, { headers: { Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": key } });
  if (!res.ok) throw new Error(`Serviço de clima indisponível [${res.status}]: ${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<any>;
}

/** Current weather + 5-day forecast for a GPS position (Google Weather, pt-BR). */
export const getWeather = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).parse(d))
  .handler(async ({ data }): Promise<WeatherReport> => {
    const lovable = process.env["LOVABLE_API_KEY"];
    const key = process.env["GOOGLE_MAPS_API_KEY"];
    if (!lovable || !key) throw new Error("Fonte de clima não configurada");
    // ~1 km rounding: nearby requests share the cache and limit cost.
    const lat = Math.round(data.lat * 100) / 100;
    const lng = Math.round(data.lng * 100) / 100;
    const ck = `${lat},${lng}`;
    const hit = cache.get(ck);
    if (hit && Date.now() - hit.at < TTL) return hit.data;

    const loc = `location.latitude=${lat}&location.longitude=${lng}&languageCode=pt-BR`;
    const [cur, fc, geo] = await Promise.all([
      call(`/weather/v1/currentConditions:lookup?${loc}`, lovable, key),
      call(`/weather/v1/forecast/days:lookup?${loc}&days=5`, lovable, key),
      call(`/maps/api/geocode/json?latlng=${lat},${lng}&language=pt-BR&result_type=administrative_area_level_2|locality`, lovable, key).catch(() => null),
    ]);
    const comps: any[] = geo?.results?.[0]?.address_components ?? [];
    const city = comps.find((c) => c.types.includes("administrative_area_level_2") || c.types.includes("locality"))?.long_name ?? "";
    const state = comps.find((c) => c.types.includes("administrative_area_level_1"))?.short_name ?? "";
    const report: WeatherReport = {
      city: [city, state].filter(Boolean).join(" - "),
      temp: Math.round(cur.temperature?.degrees ?? 0),
      feels: Math.round(cur.feelsLikeTemperature?.degrees ?? 0),
      humidity: cur.relativeHumidity ?? 0,
      wind: Math.round(cur.wind?.speed?.value ?? 0),
      text: cur.weatherCondition?.description?.text ?? "",
      icon: cur.weatherCondition?.iconBaseUri ? `${cur.weatherCondition.iconBaseUri}.svg` : "",
      days: (fc.forecastDays ?? []).map((d: any) => ({
        date: `${d.displayDate?.year}-${String(d.displayDate?.month).padStart(2, "0")}-${String(d.displayDate?.day).padStart(2, "0")}`,
        min: Math.round(d.minTemperature?.degrees ?? 0),
        max: Math.round(d.maxTemperature?.degrees ?? 0),
        rain: d.daytimeForecast?.precipitation?.probability?.percent ?? 0,
        text: d.daytimeForecast?.weatherCondition?.description?.text ?? "",
        icon: d.daytimeForecast?.weatherCondition?.iconBaseUri ? `${d.daytimeForecast.weatherCondition.iconBaseUri}.svg` : "",
      })),
    };
    cache.set(ck, { at: Date.now(), data: report });
    return report;
  });
