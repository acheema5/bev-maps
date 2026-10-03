import { describe, expect, it } from "vitest";
import { metersPerPx, toScreen, worldPx, zoomFor } from "./projection";

const here = { lat: 40.7553, lng: -73.9563 };

describe("projection", () => {
  it("picks a zoom that fits ~150 m in 150 px", () => {
    const z = zoomFor(here.lat, 150, 150);
    expect(metersPerPx(here.lat, z)).toBeCloseTo(1, 6);
    expect(z).toBeGreaterThan(16.5);
    expect(z).toBeLessThan(17.2);
  });

  it("puts the center in the middle, north up when heading is 0", () => {
    const z = 17;
    const center = worldPx(here, z);
    expect(toScreen(center, { center, headingDeg: 0, size: 150 })).toEqual({ x: 75, y: 75 });
    const north = worldPx({ lat: here.lat + 0.0003, lng: here.lng }, z);
    const p = toScreen(north, { center, headingDeg: 0, size: 150 });
    expect(p.x).toBeCloseTo(75, 6);
    expect(p.y).toBeLessThan(75);
  });

  it("turns heading-up: facing east, a point to the east is straight up", () => {
    const z = 17;
    const center = worldPx(here, z);
    const east = worldPx({ lat: here.lat, lng: here.lng + 0.0004 }, z);
    const p = toScreen(east, { center, headingDeg: 90, size: 150 });
    expect(p.x).toBeCloseTo(75, 6);
    expect(p.y).toBeLessThan(75);
    // …and facing west, it's straight down.
    expect(toScreen(east, { center, headingDeg: 270, size: 150 }).y).toBeGreaterThan(75);
  });

  it("scales meters to pixels consistently", () => {
    const z = zoomFor(here.lat, 150, 150);
    const a = worldPx(here, z);
    const b = worldPx({ lat: here.lat + 15 / 111_320, lng: here.lng }, z); // ~15 m north
    expect(Math.abs(a.y - b.y)).toBeCloseTo(15, 0);
  });
});
