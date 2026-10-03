import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findBevFound } from "shared/fixtures";
import { readFlags } from "./env";
import { findFlow } from "./find-flow";
import type { Fix, LocationSource } from "./sensors/location";
import { Session } from "./session";

// A GPS we control: push fixes or a denial from the test.
function scriptedLocation() {
  let push: (fix: Fix) => void = () => {};
  let deny: () => void = () => {};
  let stopped = false;
  const source: LocationSource = {
    start(onFix, onDenied) {
      push = onFix;
      deny = onDenied;
      return () => (stopped = true);
    },
  };
  return {
    source,
    fix: (accuracyM: number) => push({ position: { lat: 37.78583, lng: -122.40641 }, accuracyM, timestampMs: Date.now() }),
    deny: () => deny(),
    stopped: () => stopped,
  };
}

const fixtures = readFlags("?fixture=found");

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("findFlow", () => {
  it("searches as soon as a good fix arrives and returns the result", async () => {
    const gps = scriptedLocation();
    const session = new Session(gps.source);
    const flow = findFlow(session, fixtures, new AbortController().signal);
    gps.fix(20);
    await vi.runAllTimersAsync();
    await expect(flow).resolves.toEqual({ kind: "result", response: findBevFound });
  });

  it("holds the shimmer for at least 800 ms even when the answer is instant", async () => {
    const gps = scriptedLocation();
    const session = new Session(gps.source);
    let settled = false;
    const flow = findFlow(session, readFlags("?fixture=error"), new AbortController().signal).then((o) => {
      settled = true;
      return o;
    });
    gps.fix(20);
    await vi.advanceTimersByTimeAsync(790);
    // The fixture answers in 600-1200 ms; either way nothing lands before 800 ms.
    expect(settled).toBe(false);
    await vi.runAllTimersAsync();
    await expect(flow).resolves.toMatchObject({ kind: "result" });
  });

  it("reports a location denial", async () => {
    const gps = scriptedLocation();
    const session = new Session(gps.source);
    const flow = findFlow(session, fixtures, new AbortController().signal);
    gps.deny();
    await vi.runAllTimersAsync();
    await expect(flow).resolves.toEqual({ kind: "location-failed", notice: "location-denied" });
  });

  it("reports precise-off when every fix stays city-sized", async () => {
    const gps = scriptedLocation();
    const session = new Session(gps.source);
    const flow = findFlow(session, fixtures, new AbortController().signal);
    gps.fix(3_000);
    await vi.advanceTimersByTimeAsync(8_500);
    await expect(flow).resolves.toEqual({ kind: "location-failed", notice: "precise-off" });
  });

  it("gives up with no-fix when GPS never answers", async () => {
    const session = new Session(scriptedLocation().source);
    const flow = findFlow(session, fixtures, new AbortController().signal);
    await vi.advanceTimersByTimeAsync(15_500);
    await expect(flow).resolves.toEqual({ kind: "location-failed", notice: "no-fix" });
  });

  it("stops quietly when cancelled, and ending the session stops the GPS", async () => {
    const gps = scriptedLocation();
    const session = new Session(gps.source);
    const controller = new AbortController();
    const flow = findFlow(session, fixtures, controller.signal);
    controller.abort();
    await vi.runAllTimersAsync();
    await expect(flow).resolves.toEqual({ kind: "aborted" });
    session.end();
    expect(gps.stopped()).toBe(true);
  });
});
