import { describe, expect, it } from "vitest";
import { followHeading, headingDelta, INITIAL_HEADING } from "./navigation-heading";
import type { VehiclePosition } from "./navigation-location";
const fix = (patch: Partial<VehiclePosition> = {}): VehiclePosition => ({ latitude: 0, longitude: 0, heading: null, speed: null, accuracy: 5, timestamp: 1000, ...patch });
describe("heading-up navigation", () => {
  it.each([0, 90, 180, 270])("follows GPS direction %i degrees", (heading) => {
    expect(followHeading(INITIAL_HEADING, fix({ heading, speed: 12 })).heading).toBe(heading);
  });
  it("holds direction when stopped despite changing GPS bearing", () => {
    const moving = followHeading(INITIAL_HEADING, fix({ heading: 90, speed: 12 }));
    expect(followHeading(moving, fix({ heading: 270, speed: 0, timestamp: 2000 })).heading).toBe(90);
  });
  it.each([{ latitude: .001, longitude: 0, expected: 0 }, { latitude: 0, longitude: .001, expected: 90 }, { latitude: -.001, longitude: 0, expected: 180 }, { latitude: 0, longitude: -.001, expected: 270 }])("derives course from real displacement: $expected", ({ expected, ...coordinates }) => {
    const start = followHeading(INITIAL_HEADING, fix());
    expect(followHeading(start, fix({ ...coordinates, timestamp: 2000 })).heading).toBeCloseTo(expected);
  });
  it("does not rotate for GPS jitter or missing direction", () => {
    const start = followHeading(INITIAL_HEADING, fix({ heading: 90 }));
    expect(followHeading(start, fix({ latitude: .00001, timestamp: 2000 })).heading).toBe(90);
    expect(followHeading(start, fix({ heading: Number.NaN, timestamp: 2000 })).heading).toBe(90);
  });
  it("turns across north by the shortest arc", () => {
    expect(headingDelta(359, 1)).toBe(2);
    expect(headingDelta(1, 359)).toBe(-2);
  });
});