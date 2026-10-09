import { Moon } from "lucide-react";
import { weatherIcon } from "./weather-presentation";

function isNight() {
  const hour = new Date().getHours();
  return hour < 6 || hour >= 18;
}

export function WeatherSymbol({
  code,
  text,
  large = false,
  night,
  className = "",
}: {
  code: number | undefined;
  text: string;
  large?: boolean;
  night?: boolean;
  className?: string;
}) {
  const Icon = weatherIcon(code, text);
  const storm = code !== undefined && code >= 95;
  const snow = code !== undefined && code >= 71 && code <= 86;
  const rain = (code !== undefined && code >= 51 && code <= 67) ||
    (code !== undefined && code >= 80 && code <= 82);
  const isNightMode = (night ?? isNight()) && (code === 0 || code === 1 || code === 2);

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${className} ${large ? "weather-symbol-large" : ""} ${isNightMode ? "weather-night" : ""} ${storm ? "weather-symbol-storm" : ""} ${rain ? "weather-symbol-rain" : ""} ${snow ? "weather-symbol-snow" : ""}`}
      role="img"
      aria-label={text}
      style={{ fontSize: "2.5em", lineHeight: 1 }}
    >
      {isNightMode ? (
        <Moon className="weather-symbol-moon" aria-hidden="true" style={{ width: "1em", height: "1em" }} />
      ) : (
        <Icon className={`weather-symbol-single ${storm ? "weather-storm" : rain ? "weather-rain" : snow || code === 3 || code === 45 || code === 48 ? "weather-cloud" : "weather-sun"}`} aria-hidden="true" style={{ width: "1em", height: "1em" }} />
      )}
    </span>
  );
}
