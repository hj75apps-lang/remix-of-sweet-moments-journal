import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  MapPin,
  Sun,
  Thermometer,
  Umbrella,
  Wind,
  type LucideIcon,
} from "lucide-react";
import type { WeatherReport } from "@/services/weather";

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

export function shortWeekday(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
}

function fullDay(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "short",
  }).replace(".", "");
}

export function WeatherDetails({ weather }: { weather: WeatherReport }) {
  const CurrentIcon = weatherIcon(weather.code, weather.text);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6 lg:p-8">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 border-b pb-5">
        <div className="min-w-0">
          <h1 className="flex min-w-0 items-center gap-2 text-xl font-semibold sm:text-2xl">
            <MapPin className="size-5 shrink-0 text-primary" aria-hidden="true" />
            <span className="truncate">{weather.city}</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Resumo e previsão para os próximos cinco dias</p>
        </div>
        <CloudSun className="size-6 shrink-0 text-primary" aria-hidden="true" />
      </header>

      <section aria-label="Condição atual" className="grid gap-5 border-b py-6 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-8">
        <div className="flex min-w-0 items-center gap-4 sm:gap-6">
          <div className="grid size-20 shrink-0 place-items-center rounded-3xl bg-primary/15 text-primary sm:size-28">
            <CurrentIcon className="size-12 sm:size-16" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-5xl font-semibold leading-none sm:text-7xl">{weather.temp}°</p>
            <p className="mt-2 text-base font-medium sm:text-lg">{weather.text}</p>
            <p className="mt-1 text-sm text-muted-foreground">Sensação térmica de {weather.feels}°</p>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-2 sm:min-w-64">
          <div className="rounded-2xl bg-secondary p-3">
            <dt className="flex items-center gap-2 text-xs text-muted-foreground"><Droplets className="size-4 text-primary" />Umidade</dt>
            <dd className="mt-1 text-lg font-semibold">{weather.humidity}%</dd>
          </div>
          <div className="rounded-2xl bg-secondary p-3">
            <dt className="flex items-center gap-2 text-xs text-muted-foreground"><Wind className="size-4 text-primary" />Vento</dt>
            <dd className="mt-1 text-lg font-semibold">{weather.wind} km/h</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="five-day-title" className="py-6">
        <h2 id="five-day-title" className="text-base font-semibold sm:text-lg">Próximos 5 dias</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-5 sm:gap-3">
          {weather.days.slice(0, 5).map((day) => {
            const DayIcon = weatherIcon(day.code, day.text);
            return (
              <li key={day.date} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border bg-secondary/35 p-3 sm:flex sm:min-h-56 sm:flex-col sm:items-stretch sm:p-4">
                <div className="min-w-0 sm:text-center">
                  <p className="font-semibold capitalize">{fullDay(day.date)}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground sm:whitespace-normal">{day.text}</p>
                </div>
                <DayIcon className="size-9 shrink-0 text-primary sm:mx-auto sm:my-3 sm:size-12" aria-label={day.text} />
                <div className="col-span-2 grid grid-cols-3 gap-2 border-t pt-3 text-center text-xs sm:mt-auto">
                  <div><Thermometer className="mx-auto mb-1 size-4 text-primary" /><span className="font-semibold">{day.max}°</span><span className="block text-muted-foreground">máx.</span></div>
                  <div><Thermometer className="mx-auto mb-1 size-4 text-muted-foreground" /><span className="font-semibold">{day.min}°</span><span className="block text-muted-foreground">mín.</span></div>
                  <div><Umbrella className="mx-auto mb-1 size-4 text-primary" /><span className="font-semibold">{day.rain}%</span><span className="block text-muted-foreground">chuva</span></div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}