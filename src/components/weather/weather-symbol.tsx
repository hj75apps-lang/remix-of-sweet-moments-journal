import { Cloud, Sun } from "lucide-react";
import { weatherIcon } from "./weather-details";

/** Multicolour condition artwork; the existing weather mapping remains authoritative. */
export function WeatherSymbol({ code, text }: { code: number | undefined; text: string }) {
  const Icon = weatherIcon(code, text);
  const partlyCloudy = code === 1 || code === 2;
  const tone = Icon === Sun ? "weather-sun" : code !== undefined && code >= 95
    ? "weather-storm" : /chuva|garoa/i.test(text) ? "weather-rain" : "weather-cloud";
  return (
    <span className="weather-symbol" role="img" aria-label={text}>
      {partlyCloudy ? <>
        <Sun className="weather-symbol-sun weather-sun" aria-hidden="true" />
        <Cloud className="weather-symbol-cloud weather-cloud" aria-hidden="true" />
      </> : <Icon className={`weather-symbol-single ${tone}`} aria-hidden="true" />}
    </span>
  );
}