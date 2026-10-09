import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun, type LucideIcon } from "lucide-react";

export function weatherIcon(code: number | undefined, description: string): LucideIcon {
  if (code === 0) return Sun;
  if (code === 1 || code === 2) return CloudSun;
  if (code === 3) return Cloud;
  if (code === 45 || code === 48) return CloudFog;
  if ((code !== undefined && code >= 51 && code <= 67) || (code !== undefined && code >= 80 && code <= 82)) return CloudRain;
  if (code !== undefined && code >= 71 && code <= 86) return CloudSnow;
  if (code !== undefined && code >= 95) return CloudLightning;
  const normalized = description.toLocaleLowerCase("pt-BR");
  if (normalized.includes("tempestade")) return CloudLightning;
  if (normalized.includes("neve")) return CloudSnow;
  if (normalized.includes("chuva") || normalized.includes("garoa")) return CloudRain;
  if (normalized.includes("neblina")) return CloudFog;
  if (normalized.includes("nublado")) return Cloud;
  return CloudSun;
}

export function isNightBySun(weather: { sunrise?: string; sunset?: string }) {
  const now = Date.now();
  const sunrise = weather.sunrise ? Date.parse(weather.sunrise) : NaN;
  const sunset = weather.sunset ? Date.parse(weather.sunset) : NaN;
  return Number.isFinite(sunrise) && Number.isFinite(sunset)
    ? now < sunrise || now >= sunset
    : new Date().getHours() < 6 || new Date().getHours() >= 18;
}
