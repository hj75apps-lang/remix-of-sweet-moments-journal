export interface WeatherHour {
  time: string;
  temp: number;
  rain: number;
  text: string;
  code: number | undefined;
}

export interface WeatherDay {
  date: string;
  min: number;
  max: number;
  rain: number;
  text: string;
  code: number | undefined;
}

export interface WeatherReport {
  city: string;
  temp: number;
  feels: number;
  humidity: number;
  wind: number;
  text: string;
  code: number | undefined;
  source: "Open-Meteo";
  updatedAt?: number;
  sunrise?: string;
  sunset?: string;
  hours: WeatherHour[];
  days: WeatherDay[];
}

export interface WeatherPosition {
  lat: number;
  lng: number;
}

interface OpenMeteoForecast {
  current?: {
    temperature_2m?: number;
    apparent_temperature?: number;
    relative_humidity_2m?: number;
    wind_speed_10m?: number;
    weather_code?: number;
  };
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    weather_code?: number[];
    precipitation_probability?: number[];
  };
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
    sunrise?: string[];
    sunset?: string[];
  };
}

interface ReverseGeocodeResult {
  city?: string;
  locality?: string;
  principalSubdivisionCode?: string;
  principalSubdivision?: string;
}

interface NominatimReverseResult {
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    state_code?: string;
  };
}

const OPEN_METEO_API = "https://api.open-meteo.com/v1/forecast";
const REQUEST_TIMEOUT = 12_000;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) throw new Error(`Serviço indisponível (${response.status})`);
    return (await response.json()) as T;
  } finally {
    window.clearTimeout(timeout);
  }
}

function rounded(value: unknown, min = -Infinity, max = Infinity): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new Error("Previsão incompleta");
  }
  return Math.round(value);
}

export function isWeatherPosition(value: unknown): value is WeatherPosition {
  if (!value || typeof value !== "object") return false;
  const position = value as Partial<WeatherPosition>;
  return typeof position.lat === "number" && Number.isFinite(position.lat) && Math.abs(position.lat) <= 90 &&
    typeof position.lng === "number" && Number.isFinite(position.lng) && Math.abs(position.lng) <= 180;
}

export function isWeatherDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function conditionCode(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) ? value : undefined;
}

function weatherDescription(code: number | undefined): string {
  if (code === 0) return "Céu limpo";
  if (code === 1) return "Predominantemente limpo";
  if (code === 2) return "Parcialmente nublado";
  if (code === 3) return "Nublado";
  if (code === 45 || code === 48) return "Neblina";
  if (code === 51 || code === 53 || code === 55) return "Garoa";
  if (code === 56 || code === 57) return "Garoa congelante";
  if (code === 61 || code === 63 || code === 65) return "Chuva";
  if (code === 66 || code === 67) return "Chuva congelante";
  if (code === 71 || code === 73 || code === 75 || code === 77) return "Neve";
  if (code === 80 || code === 81 || code === 82) return "Pancadas de chuva";
  if (code === 85 || code === 86) return "Pancadas de neve";
  if (code === 95 || code === 96 || code === 99) return "Tempestade";
  return "Condição não informada";
}

async function resolvePlace(lat: number, lng: number): Promise<string> {
  try {
    const place = await fetchJson<ReverseGeocodeResult>(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=pt`,
    );
    const city = place.city ?? place.locality;
    const stateParts = place.principalSubdivisionCode?.split("-");
    const state = stateParts?.[stateParts.length - 1] ?? place.principalSubdivision;
    return [city, state].filter(Boolean).join(" - ") || `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
  } catch {
    try {
      const place = await fetchJson<NominatimReverseResult>(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&zoom=10&accept-language=pt-BR`,
        { headers: { "Accept-Language": "pt-BR", "X-Requested-With": "SmartAutoLauncher" } },
      );
      const address = place.address;
      const city = address?.city ?? address?.town ?? address?.village ?? address?.municipality;
      const state = address?.state_code ?? address?.state;
      return [city, state].filter(Boolean).join(" - ") || `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
    } catch {
      return `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
    }
  }
}

export function weatherPositionKey(position: WeatherPosition): string {
  return `${position.lat.toFixed(2)},${position.lng.toFixed(2)}`;
}

export async function fetchWeather(position: WeatherPosition): Promise<WeatherReport> {
  if (!isWeatherPosition(position)) throw new Error("Localização inválida");
  const lat = Math.round(position.lat * 100) / 100;
  const lng = Math.round(position.lng * 100) / 100;
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code",
    hourly: "temperature_2m,weather_code,precipitation_probability",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset",
    timezone: "auto",
    forecast_days: "6",
    forecast_hours: "12",
    wind_speed_unit: "kmh",
  });
  const [forecast, city] = await Promise.all([
    fetchJson<OpenMeteoForecast>(`${OPEN_METEO_API}?${params.toString()}`),
    resolvePlace(lat, lng),
  ]);
  const current = forecast.current;
  const hourly = forecast.hourly;
  const daily = forecast.daily;
  if (!current || !Array.isArray(daily?.time) || daily.time.length < 6) throw new Error("Previsão incompleta");

  const days = daily.time.slice(0, 6).map((date, index) => {
    if (!isWeatherDate(date) || (index > 0 &&
        Date.parse(date) - Date.parse(daily.time![index - 1]!) !== 86_400_000)) throw new Error("Previsão incompleta");
    const min = rounded(daily.temperature_2m_min?.[index]);
    const max = rounded(daily.temperature_2m_max?.[index]);
    if (min > max) throw new Error("Previsão incompleta");
    const code = conditionCode(daily.weather_code?.[index]);
    return { date, min, max, rain: rounded(daily.precipitation_probability_max?.[index], 0, 100), code, text: weatherDescription(code) };
  });
  const hours = (Array.isArray(hourly?.time) ? hourly.time : []).slice(0, 8).flatMap((time, index) => {
    if (typeof time !== "string" || !Number.isFinite(Date.parse(time))) return [];
    try {
      const code = conditionCode(hourly?.weather_code?.[index]);
      return [{ time, temp: rounded(hourly?.temperature_2m?.[index]),
        rain: rounded(hourly?.precipitation_probability?.[index], 0, 100), code, text: weatherDescription(code) }];
    } catch { return []; }
  });
  const code = conditionCode(current.weather_code);
  const sunrise = daily.sunrise?.[0];
  const sunset = daily.sunset?.[0];

  return {
    city,
    temp: rounded(current.temperature_2m),
    feels: rounded(current.apparent_temperature),
    humidity: rounded(current.relative_humidity_2m, 0, 100),
    wind: rounded(current.wind_speed_10m, 0),
    text: weatherDescription(code),
    code,
    source: "Open-Meteo",
    updatedAt: Date.now(),
    ...(typeof sunrise === "string" && Number.isFinite(Date.parse(sunrise)) ? { sunrise } : {}),
    ...(typeof sunset === "string" && Number.isFinite(Date.parse(sunset)) ? { sunset } : {}),
    hours,
    days,
  };
}
