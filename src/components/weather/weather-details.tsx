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
export function shortWeekday(date: string, index = 1) {
  if (index === 0) return "Hoje";
  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
}

function fullWeekday(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long" });
}

function calendarDay(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short",
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
  const CurrentIcon = weatherIcon(weather.code, weather.text);
  const days = Array.isArray(weather.days) ? weather.days : [];
  const hours = Array.isArray(weather.hours) ? weather.hours : [];
  const today = days[0];

  return (
    <div className="weather-details-panel weather-week-panel">
      <header className="weather-week-header">
        <div>
          <p className="weather-week-location"><MapPin aria-hidden="true" />{weather.city}</p>
          <h1>Previsão da semana</h1>
           <p className="weather-week-subtitle">Previsão para cinco dias</p>
        </div>
        <span className="weather-week-source">{weather.source}</span>
      </header>

      <section aria-label="Condição atual" className="weather-week-current">
        <div className="weather-week-current-reading">
          <CurrentIcon className="weather-week-current-icon" aria-label={weather.text} />
          <p className="weather-week-current-temp">{weather.temp}<span>°C</span></p>
          <div className="weather-week-current-copy">
            <p>{weather.text}</p>
            <span>Sensação de {weather.feels}°</span>
            {today && <span>Máx. {today.max}° · Mín. {today.min}°</span>}
          </div>
        </div>
        <dl className="weather-week-current-metrics">
          <div><dt><Droplets aria-hidden="true" />Umidade</dt><dd>{weather.humidity}%</dd></div>
          <div><dt><Wind aria-hidden="true" />Vento atual</dt><dd>{weather.wind}<span> km/h</span></dd></div>
        </dl>
      </section>

      <section aria-labelledby="five-day-title" className="weather-week-forecast">
         <h2 id="five-day-title" className="weather-week-section-title">Próximos 5 dias</h2>
         <ul className="weather-week-grid" aria-label="Previsão de cinco dias">
           {days.slice(0, 5).map((day, index) => {
            const DayIcon = weatherIcon(day.code, day.text);
            const cloudy = DayIcon === Cloud || DayIcon === CloudFog;
            const wet = DayIcon === CloudRain || DayIcon === CloudSnow || DayIcon === CloudLightning;
            return (
              <li key={day.date} className={`weather-day-detail weather-week-day${index === 0 ? " weather-week-today" : ""}`}>
                <div className="weather-week-day-heading">
                  <h3>{index === 0 ? "Hoje" : fullWeekday(day.date)}</h3>
                  <time dateTime={day.date}>{calendarDay(day.date)}</time>
                </div>
                <div className="weather-week-day-condition">
                  <DayIcon className={`weather-week-day-icon${cloudy ? " weather-week-cloud" : wet ? " weather-week-rain" : ""}`} aria-label={day.text} />
                  <p>{day.text}</p>
                </div>
                <dl className="weather-week-day-temperatures">
                  <div className="weather-week-day-high"><dt>Máxima</dt><dd>{day.max}<span>°C</span></dd></div>
                  <div className="weather-week-day-low"><dt>Mínima</dt><dd>{day.min}<span>°C</span></dd></div>
                </dl>
                <dl className="weather-week-day-rain">
                  <div><dt>Chance de chuva</dt><dd><Umbrella aria-hidden="true" />{day.rain}<span>%</span></dd></div>
                </dl>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="hourly-title" className="weather-week-hourly">
        <div className="weather-week-hourly-heading">
          <h2 id="hourly-title" className="weather-week-section-title">Próximas horas</h2>
          <div className="weather-week-sun-times">
            <span><Sunrise aria-hidden="true" /><span className="sr-only">Nascer do sol: </span>{clockLabel(weather.sunrise)}</span>
            <span><Sunset aria-hidden="true" /><span className="sr-only">Pôr do sol: </span>{clockLabel(weather.sunset)}</span>
          </div>
        </div>
        <div className="weather-hourly-strip weather-week-hourly-strip">
          {hours.length === 0 && <p className="text-sm text-muted-foreground" role="status">Previsão por hora indisponível no momento.</p>}
          {hours.slice(0, 8).map((hour, index) => (
            <div key={hour.time} className="weather-hour-card weather-week-hour">
              <span>{hourLabel(hour.time, index)}</span>
              {(() => { const HourIcon = weatherIcon(hour.code, hour.text); return <HourIcon aria-label={hour.text} />; })()}
              <strong>{hour.temp}°</strong>
              <span className="weather-week-hour-rain"><Droplets aria-hidden="true" />{hour.rain}%</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

