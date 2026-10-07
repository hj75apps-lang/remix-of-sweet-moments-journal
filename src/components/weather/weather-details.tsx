import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  MapPin,
  Sunrise,
  Sunset,
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
  if (index === 0) return "Hoje";
  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
}

function fullDay(date: string, index: number) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "short",
  }).replace(".", "");
}

function hourLabel(time: string, index: number) {
  if (index === 0) return "Agora";
  return new Date(time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function clockLabel(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function WeatherDetails({ weather }: { weather: WeatherReport }) {
  return (
    <div className="weather-details-panel mx-auto grid min-h-full w-full max-w-7xl grid-rows-[auto_auto_auto_minmax(0,1fr)] p-3 sm:p-5 lg:p-7">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 pb-3">
        <div className="min-w-0">
          <h1 className="flex min-w-0 items-center gap-2 text-lg font-semibold sm:text-xl">
            <MapPin className="size-5 shrink-0 text-primary" aria-hidden="true" />
            <span className="truncate">{weather.city}</span>
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">Condições atuais e previsão meteorológica</p>
        </div>
        <CloudSun className="size-6 shrink-0 text-primary" aria-hidden="true" />
      </header>

      <section aria-label="Condição atual" className="weather-details-current grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-y py-3 sm:gap-5 sm:py-4">
        <div className="min-w-0">
          <p className="font-display text-5xl font-light leading-none tabular-nums sm:text-6xl">{weather.temp}°</p>
          <p className="mt-2 text-sm font-medium sm:text-base">{weather.text}</p>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">Sensação de {weather.feels}°</p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs font-medium sm:text-sm">
            <span>↑ {weather.days[0]?.max}°</span><span>↓ {weather.days[0]?.min}°</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-xs sm:gap-2">
          <div className="rounded-xl bg-secondary/70 px-2.5 py-2"><span className="flex items-center gap-1.5 text-muted-foreground"><Droplets className="size-3.5 text-primary" />Umidade</span><strong>{weather.humidity}%</strong></div>
          <div className="rounded-xl bg-secondary/70 px-2.5 py-2"><span className="flex items-center gap-1.5 text-muted-foreground"><Wind className="size-3.5 text-primary" />Vento</span><strong>{weather.wind} km/h</strong></div>
        </div>
      </section>

      <section aria-labelledby="hourly-title" className="weather-hourly pt-3 sm:pt-4">
        <div className="flex items-center justify-between">
          <h2 id="hourly-title" className="text-sm font-semibold sm:text-base">Próximas horas</h2>
          <div className="flex gap-3 text-[11px] text-muted-foreground"><span className="flex items-center gap-1"><Sunrise className="size-3.5" />{clockLabel(weather.sunrise)}</span><span className="flex items-center gap-1"><Sunset className="size-3.5" />{clockLabel(weather.sunset)}</span></div>
        </div>
        <div className="weather-hourly-strip mt-2 flex min-w-0 gap-1.5 overflow-x-auto pb-1">
          {weather.hours.slice(0, 8).map((hour, index) => (
            <div key={hour.time} className="weather-hour-card min-w-[4.25rem] rounded-xl bg-secondary/55 px-2 py-2 text-center">
              <span className="block text-[10px] font-semibold uppercase text-muted-foreground">{hourLabel(hour.time, index)}</span>
              {(() => { const HourIcon = weatherIcon(hour.code, hour.text); return <HourIcon className="mx-auto my-1 size-5 text-primary" aria-label={hour.text} />; })()}
              <strong className="block text-sm">{hour.temp}°</strong>
              {hour.rain > 0 && <span className="mt-0.5 block text-[10px] text-muted-foreground">💧 {hour.rain}%</span>}
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="five-day-title" className="flex min-h-0 flex-col pt-3 sm:pt-4">
        <h2 id="five-day-title" className="text-sm font-semibold sm:text-base">Próximos 5 dias</h2>
        <ul className="mt-2 grid min-h-0 flex-1 grid-rows-5 gap-1.5 sm:grid-cols-5 sm:grid-rows-1 sm:gap-2">
          {weather.days.slice(0, 6).map((day, index) => (
            <li key={day.date} className="weather-day-detail grid min-h-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 rounded-xl border bg-secondary/35 px-2.5 py-1.5 sm:flex sm:flex-col sm:items-stretch sm:p-2.5">
              <div className="min-w-0 sm:text-center">
                <p className="truncate text-xs font-semibold capitalize sm:whitespace-normal sm:text-sm">{fullDay(day.date, index)}</p>
                <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">{day.text}</p>
              </div>
              {(() => { const DayIcon = weatherIcon(day.code, day.text); return <DayIcon className="size-7 shrink-0 text-primary sm:mx-auto sm:size-9" aria-label={day.text} />; })()}
              <div className="grid grid-cols-3 gap-1 text-center text-xs sm:mt-auto sm:border-t sm:pt-2">
                <div><Thermometer className="mx-auto hidden size-3.5 text-primary sm:block" /><span className="font-semibold">{day.max}°</span><span className="block text-[10px] text-muted-foreground">máx.</span></div>
                <div><Thermometer className="mx-auto hidden size-3.5 text-muted-foreground sm:block" /><span className="font-semibold">{day.min}°</span><span className="block text-[10px] text-muted-foreground">mín.</span></div>
                <div><Umbrella className="mx-auto hidden size-3.5 text-primary sm:block" /><span className="font-semibold">{day.rain}%</span><span className="block text-[10px] text-muted-foreground">chuva</span></div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
