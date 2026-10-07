import { Cloud, CloudLightning, CloudRain, CloudSnow, CloudSun, Moon, Sun } from "lucide-react";
import { weatherIcon } from "./weather-details";

function isNight() {
  const hour = new Date().getHours();
  return hour < 6 || hour >= 18;
}

export function WeatherSymbol({
  code,
  text,
  large = false,
  night,
}: {
  code: number | undefined;
  text: string;
  large?: boolean;
  night?: boolean;
}) {
  const Icon = weatherIcon(code, text);
  const partlyCloudy = code === 1 || code === 2;
  const storm = code !== undefined && code >= 95;
  const snow = code !== undefined && code >= 71 && code <= 86;
  const rain = (code !== undefined && code >= 51 && code <= 67) ||
    (code !== undefined && code >= 80 && code <= 82);
  const isNightMode = night ?? (isNight() && (code === 0 || code === 1 || code === 2));

  return (
    <span
      className={`weather-symbol ${large ? "weather-symbol-large" : ""} ${isNightMode ? "weather-night" : ""} ${storm ? "weather-symbol-storm" : ""} ${rain ? "weather-symbol-rain" : ""} ${snow ? "weather-symbol-snow" : ""}`}
      role="img"
      aria-label={text}
    >
      <span className="weather-symbol-glow" aria-hidden="true" />
      {isNightMode ? (
        <Moon className="weather-symbol-moon" aria-hidden="true" />
      ) : partlyCloudy ? (
        <>
          <Sun className="weather-symbol-sun weather-sun" aria-hidden="true" />
          <Cloud className="weather-symbol-cloud weather-cloud" aria-hidden="true" />
        </>
      ) : (
        <Icon className={`weather-symbol-single ${storm ? "weather-storm" : rain ? "weather-rain" : snow ? "weather-cloud" : "weather-sun"}`} aria-hidden="true" />
      )}
      {rain && <span className="weather-rain-drops" aria-hidden="true"><i /><i /><i /></span>}
      {snow && <span className="weather-snowflakes" aria-hidden="true"><i>·</i><i>·</i><i>·</i></span>}
      {storm && <span className="weather-lightning" aria-hidden="true" />}
    </span>
  );
}
