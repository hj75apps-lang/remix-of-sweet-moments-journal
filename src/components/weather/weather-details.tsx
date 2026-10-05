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
    <div className="grid min-h-0 flex-1 grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden p-3 sm:p-4 lg:p-5">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b pb-3">
        <div className="min-w-0">
          <h1 className="flex min-w-0 items-center gap-2 text-lg font-semibold sm:text-xl">
            <MapPin className="size-5 shrink-0 text-primary" aria-hidden="true" />
            <span className="truncate">{weather.city}</span>
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">Resumo e previsão para os próximos cinco dias</p>
        </div>
        <CloudSun className="size-5 shrink-0 text-primary sm:size-6" aria-hidden="true" />
      </header>

      <section aria-label="Condição atual" className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b py-3 sm:gap-5 sm:py-4">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary sm:size-20">
            <CurrentIcon className="size-9 sm:size-11" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-4xl font-semibold leading-none sm:text-5xl">{weather.temp}°</p>
            <p className="mt-1 truncate text-sm font-medium sm:text-base">{weather.text}</p>
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">Sensação de {weather.feels}°</p>
          </div>
        </div>
        <dl className="grid gap-1.5 sm:grid-cols-2 sm:gap-2">
          <div className="rounded-xl bg-secondary px-2.5 py-2 sm:min-w-28">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Droplets className="size-3.5 text-primary" />Umidade</dt>
            <dd className="text-sm font-semibold sm:text-base">{weather.humidity}%</dd>
          </div>
          <div className="rounded-xl bg-secondary px-2.5 py-2 sm:min-w-28">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Wind className="size-3.5 text-primary" />Vento</dt>
            <dd className="text-sm font-semibold sm:text-base">{weather.wind} km/h</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="five-day-title" className="flex min-h-0 flex-col pt-3 sm:pt-4">
        <h2 id="five-day-title" className="text-sm font-semibold sm:text-base">Próximos 5 dias</h2>
        <ul className="mt-2 grid min-h-0 flex-1 grid-rows-5 gap-1.5 sm:grid-cols-5 sm:grid-rows-1 sm:gap-2">
          {weather.days.slice(0, 5).map((day) => {
            const DayIcon = weatherIcon(day.code, day.text);
            return (
              <li key={day.date} className="grid min-h-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 rounded-xl border bg-secondary/35 px-2.5 py-1.5 sm:flex sm:flex-col sm:items-stretch sm:p-2.5">
                <div className="min-w-0 sm:text-center">
                  <p className="truncate text-xs font-semibold capitalize sm:whitespace-normal sm:text-sm">{fullDay(day.date)}</p>
                  <p className="truncate text-xs text-muted-foreground sm:mt-0.5 sm:whitespace-normal">{day.text}</p>
                </div>
                <DayIcon className="size-7 shrink-0 text-primary sm:mx-auto sm:size-9" aria-label={day.text} />
                <div className="grid grid-cols-3 gap-1 text-center text-xs sm:mt-auto sm:border-t sm:pt-2">
                  <div><Thermometer className="mx-auto hidden size-3.5 text-primary sm:block" /><span className="font-semibold">{day.max}°</span><span className="block text-[10px] text-muted-foreground">máx.</span></div>
                  <div><Thermometer className="mx-auto hidden size-3.5 text-muted-foreground sm:block" /><span className="font-semibold">{day.min}°</span><span className="block text-[10px] text-muted-foreground">mín.</span></div>
                  <div><Umbrella className="mx-auto hidden size-3.5 text-primary sm:block" /><span className="font-semibold">{day.rain}%</span><span className="block text-[10px] text-muted-foreground">chuva</span></div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}