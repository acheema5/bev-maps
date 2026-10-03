import { describe, expect, it } from "vitest";
import { createHeadingFilter, declinationAt, isHeldUp, isTrustworthy, toTrueHeading } from "./heading";

describe("declination", () => {
  it("has the right sign: east of true north is positive", () => {
    const sf = declinationAt({ lat: 37.7858, lng: -122.4064 }, new Date("2026-10-03"));
    const nyc = declinationAt({ lat: 40.7128, lng: -74.006 }, new Date("2026-10-03"));
    expect(sf).toBeGreaterThan(11);
    expect(sf).toBeLessThan(15);
    expect(nyc).toBeLessThan(-11);
    expect(nyc).toBeGreaterThan(-14);
  });

  it("turns a magnetic heading into a true one, wrapping at 360", () => {
    // Facing true north in SF reads ~347° on the compass.
    expect(toTrueHeading(347.2, 12.8)).toBeCloseTo(0, 5);
    expect(toTrueHeading(5, -12.5)).toBeCloseTo(352.5, 5);
  });
});

describe("createHeadingFilter", () => {
  it("starts at the first reading", () => {
    expect(createHeadingFilter(200).push(90, 0)).toBeCloseTo(90, 5);
  });

  it("crosses north the short way", () => {
    const filter = createHeadingFilter(200);
    filter.push(358, 0);
    const next = filter.push(2, 200);
    // Halfway-ish between 358 and 2 is near 0, never near 180.
    expect(Math.min(next, 360 - next)).toBeLessThan(3);
  });

  it("smooths a single jittery sample", () => {
    const filter = createHeadingFilter(200);
    filter.push(100, 0);
    const jumped = filter.push(140, 16); // one 60 Hz frame later
    expect(jumped).toBeGreaterThan(100);
    expect(jumped).toBeLessThan(105);
  });

  it("settles on a new steady heading", () => {
    const filter = createHeadingFilter(200);
    filter.push(0, 0);
    let value = 0;
    for (let t = 16; t <= 2_000; t += 16) value = filter.push(90, t);
    expect(value).toBeCloseTo(90, 1);
  });
});

describe("isTrustworthy", () => {
  it("rejects missing or uncalibrated readings", () => {
    expect(isTrustworthy({ magneticDeg: null, accuracyDeg: 10, pitchDeg: 90, timeMs: 0 })).toBe(false);
    expect(isTrustworthy({ magneticDeg: 120, accuracyDeg: -1, pitchDeg: 90, timeMs: 0 })).toBe(false);
    expect(isTrustworthy({ magneticDeg: 120, accuracyDeg: 15, pitchDeg: 90, timeMs: 0 })).toBe(true);
    expect(isTrustworthy({ magneticDeg: 120, accuracyDeg: null, pitchDeg: 90, timeMs: 0 })).toBe(true);
  });
});

describe("isHeldUp", () => {
  it("uses hysteresis between 40° and 50°", () => {
    expect(isHeldUp(45, true)).toBe(true); // stays up until below 40
    expect(isHeldUp(35, true)).toBe(false);
    expect(isHeldUp(45, false)).toBe(false); // must come back above 50
    expect(isHeldUp(55, false)).toBe(true);
    expect(isHeldUp(120, false)).toBe(true); // tipped past vertical is still up
  });
});
