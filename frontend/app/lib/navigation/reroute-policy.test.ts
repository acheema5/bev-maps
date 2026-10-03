import { describe, expect, it } from "vitest";
import { initialReroute, rerouteLanded, stepReroute, type RerouteState } from "./reroute-policy";

function run(samples: [offRoute: boolean, atMs: number][], start: RerouteState = initialReroute) {
  let state = start;
  const fired: number[] = [];
  for (const [offRoute, at] of samples) {
    const step = stepReroute(state, offRoute, at);
    state = step.state;
    if (step.reroute) fired.push(at);
  }
  return { state, fired };
}

describe("stepReroute", () => {
  it("waits ~5 s of continuous off-route before rerouting", () => {
    expect(run([[true, 0], [true, 4_000]]).fired).toEqual([]);
    expect(run([[true, 0], [true, 5_000]]).fired).toEqual([5_000]);
  });

  it("restarts the clock when you step back on route", () => {
    expect(run([[true, 0], [true, 4_000], [false, 4_500], [true, 5_000], [true, 9_000]]).fired).toEqual([]);
  });

  it("reroutes at most once every ~15 s", () => {
    const first = run([[true, 0], [true, 5_000]]);
    const fired = first.fired;
    const state = rerouteLanded(first.state, false); // the reroute failed; still off route
    const later = run([[true, 10_000], [true, 19_000], [true, 20_000]], state);
    expect(fired).toEqual([5_000]);
    expect(later.fired).toEqual([20_000]);
  });

  it("never fires while a reroute is in flight", () => {
    const { state } = run([[true, 0], [true, 5_000]]);
    expect(state.inFlight).toBe(true);
    expect(run([[true, 30_000]], state).fired).toEqual([]);
  });

  it("a new route restarts the dwell", () => {
    const { state } = run([[true, 0], [true, 5_000]]);
    const landed = rerouteLanded(state, true);
    expect(landed).toMatchObject({ inFlight: false, offRouteSinceMs: null });
    // 15 s later and off route again: needs a fresh 5 s dwell.
    expect(run([[true, 21_000], [true, 25_000], [true, 26_000]], landed).fired).toEqual([26_000]);
  });
});
