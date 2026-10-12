import { describe, expect, it } from "vitest";
import { VEHICLE_ICONS, vehicleIconMarkup } from "./vehicle-icon";

describe("shared vehicle artwork", () => {
  it("renders a standalone rounded cyan arrow instead of a circular badge", () => {
    const markup = vehicleIconMarkup("arrow");
    expect(markup).toContain('class="vehicle-arrow-shape"');
    expect(markup).toContain('id="vehicle-arrow-cyan"');
    expect(markup).toContain("Q32 1 36 8");
    expect(markup).toContain("Q32 48 28 50");
    expect(markup).not.toContain("<circle");
    expect(markup).toContain('class="vehicle-orientation"');
  });
  it.each(VEHICLE_ICONS.filter(({ value }) => value !== "arrow"))("preserves $label artwork", ({ value }) => {
    const markup = vehicleIconMarkup(value);
    expect(markup).toContain(`vehicle-art-${value}`);
    expect(markup).toContain('class="vehicle-body"');
    expect(markup).not.toContain("vehicle-arrow-cyan");
    expect(markup).not.toContain("<circle");
  });
});