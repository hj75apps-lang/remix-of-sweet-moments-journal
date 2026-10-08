import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { WeatherSymbol } from "./weather-symbol";

afterEach(cleanup);

describe("outlined weather symbols", () => {
  it.each([{ code: 61, text: "Chuva", icon: "lucide-cloud-rain" }, { code: 95, text: "Tempestade", icon: "lucide-cloud-lightning" }])("keeps the $text condition visible at night", ({ code, text, icon }) => {
    render(<WeatherSymbol code={code} text={text} night />);
    expect(screen.getByRole("img", { name: text }).querySelector("svg")).toHaveClass(icon);
  });
  it.each([1, 2])("uses one integrated partly cloudy icon for code %s", (code) => {
    render(<WeatherSymbol code={code} text="Parcialmente nublado" night={false} />);
    const symbol = screen.getByRole("img", { name: "Parcialmente nublado" });
    expect(symbol.querySelectorAll("svg")).toHaveLength(1);
    expect(symbol.querySelector("svg")).toHaveClass("lucide-cloud-sun", "weather-sun");
    expect(symbol.querySelector(".weather-symbol-sun, .weather-symbol-cloud")).toBeNull();
  });

  it.each([
    { code: 0, text: "Céu limpo", icon: "lucide-sun" },
    { code: 3, text: "Nublado", icon: "lucide-cloud" },
    { code: 61, text: "Chuva", icon: "lucide-cloud-rain" },
  ])("preserves the symbol for $text", ({ code, text, icon }) => {
    render(<WeatherSymbol code={code} text={text} night={false} />);
    const symbol = screen.getByRole("img", { name: text });
    expect(symbol.querySelectorAll("svg")).toHaveLength(1);
    expect(symbol.querySelector("svg")).toHaveClass(icon);
  });
});
