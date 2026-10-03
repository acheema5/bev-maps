import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { simulatedWalk } from "backend-core";
import { findBevFound } from "shared/fixtures";
import { simSensors } from "./source";

if (findBevFound.status !== "FOUND") throw new Error("findBevFound fixture must be FOUND");
const route = findBevFound.route;

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("simSensors", () => {
  it("passes the sim's true-north headings through unchanged (no declination)", () => {
    const expected = simulatedWalk(route)[0].headingDeg;
    const headings: number[] = [];
    const stop = simSensors(route, 1).start({ fix: () => {}, heading: (deg) => headings.push(deg), pitch: () => {} });
    vi.advanceTimersByTime(120);
    stop();
    expect(headings.length).toBeGreaterThan(0);
    expect(headings[0]).toBeCloseTo(expected, 6);
  });

  it("walks the route as fixes and holds the phone upright", () => {
    const fixes: number[] = [];
    const pitches: number[] = [];
    const stop = simSensors(route, 10).start({
      fix: (f) => fixes.push(f.accuracyM),
      heading: () => {},
      pitch: (p) => pitches.push(p),
    });
    vi.advanceTimersByTime(60_000);
    stop();
    expect(fixes.length).toBe(simulatedWalk(route).length);
    expect(pitches).toEqual([90]);
  });

  it("applies the debug heading offset live", () => {
    let offset = 0;
    const headings: number[] = [];
    const stop = simSensors(route, 1, () => offset).start({ fix: () => {}, heading: (d) => headings.push(d), pitch: () => {} });
    vi.advanceTimersByTime(60);
    offset = 90;
    vi.advanceTimersByTime(60);
    stop();
    const [first, last] = [headings[0], headings[headings.length - 1]];
    expect((last - first + 360) % 360).toBeCloseTo(90, 6);
  });

  it("stops emitting once stopped", () => {
    const headings: number[] = [];
    const stop = simSensors(route, 1).start({ fix: () => {}, heading: (d) => headings.push(d), pitch: () => {} });
    vi.advanceTimersByTime(100);
    stop();
    const count = headings.length;
    vi.advanceTimersByTime(5_000);
    expect(headings.length).toBe(count);
  });
});
