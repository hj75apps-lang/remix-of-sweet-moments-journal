export interface WeatherDay {
  date: string;
  min: number;
  max: number;
  rain: number;
  text: string;
}

export interface WeatherReport {
  city: string;
  temp: number;
  feels: number;
  humidity: number;
  wind: number;
  text: string;
  source: "Open-Meteo";
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
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
  };
}

interface ReverseGeocodeResult {
  city?: string;
  locality?: string;
  principalSubdivisionCode?: string;
  principalSubdivision?: string;
}

const OPEN_METEO_API = "https://api.open-meteo.com/v1/forecast";
const REQUEST_TIMEOUT = 12_000;

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Serviço indisponível (${response.status})`);
    return await response.json() as T;
  } finally {
    window.clearTimeout(timeout);
  }
}

function rounded(value: number | undefined): number {
  return Math.round(value ?? 0);
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
    return `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
  }
}

export function weatherPositionKey(position: WeatherPosition): string {
  return `${position.lat.toFixed(2)},${position.lng.toFixed(2)}`;
}

export async function fetchWeather(position: WeatherPosition): Promise<WeatherReport> {
  const lat = Math.round(position.lat * 100) / 100;
  const lng = Math.round(position.lng * 100) / 100;
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: "auto",
    forecast_days: "5",
    wind_speed_unit: "kmh",
  });
  const [forecast, city] = await Promise.all([
    fetchJson<OpenMeteoForecast>(`${OPEN_METEO_API}?${params.toString()}`),
    resolvePlace(lat, lng),
  ]);
  const current = forecast.current;
  const daily = forecast.daily;
  if (!current || !daily?.time?.length) throw new Error("Previsão incompleta");

  return {
    city,
    temp: rounded(current.temperature_2m),
    feels: rounded(current.apparent_temperature),
    humidity: rounded(current.relative_humidity_2m),
    wind: rounded(current.wind_speed_10m),
    text: weatherDescription(current.weather_code),
    source: "Open-Meteo",
    days: daily.time.slice(0, 5).map((date, index) => ({
      date,
      min: rounded(daily.temperature_2m_min?.[index]),
      max: rounded(daily.temperature_2m_max?.[index]),
      rain: rounded(daily.precipitation_probability_max?.[index]),
      text: weatherDescription(daily.weather_code?.[index]),
    })),
  };
}