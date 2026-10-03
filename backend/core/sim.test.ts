import { test } from "node:test";
import assert from "node:assert/strict";
import type { SimSample, WalkingRoute } from "shared/contract";
import { playSimulatedWalk, simulatedWalk } from "./sim";

// Straight north route, ~111m, well over one sample interval's worth of
// walking at the default pace.
const straightNorthRoute: WalkingRoute = {
  path: [
    { lat: 37.0, lng: -122.0 },
    { lat: 37.001, lng: -122.0 },
  ],
  distanceM: 111,
  durationS: 85,
};

test("simulatedWalk: t starts at 0 and increases monotonically", () => {
  const samples = simulatedWalk(straightNorthRoute);
  assert.ok(samples.length >= 2);
  assert.equal(samples[0].t, 0);
  for (let i = 1; i < samples.length; i++) {
    assert.ok(samples[i].t > samples[i - 1].t, `t should increase at index ${i}`);
  }
});

test("simulatedWalk: last sample lands exactly on the route's final point", () => {
  const samples = simulatedWalk(straightNorthRoute);
  const last = samples[samples.length - 1];
  const destination = straightNorthRoute.path[straightNorthRoute.path.length - 1];
  assert.equal(last.position.lat, destination.lat);
  assert.equal(last.position.lng, destination.lng);
});

test("simulatedWalk: headingDeg on a straight-north route is ~0deg", () => {
  const samples = simulatedWalk(straightNorthRoute);
  // All but the last sample should point ~north, since the whole path is
  // a single north-pointing segment.
  for (let i = 0; i < samples.length - 1; i++) {
    const heading = samples[i].headingDeg;
    const distanceFromNorth = Math.min(heading, 360 - heading);
    assert.ok(distanceFromNorth < 0.5, `heading ${heading} at index ${i} should be ~0deg`);
  }
});

test("simulatedWalk: a single-point route (already arrived) returns exactly one sample", () => {
  const arrivedRoute: WalkingRoute = {
    path: [{ lat: 37.5, lng: -122.4 }],
    distanceM: 0,
    durationS: 0,
  };
  const samples = simulatedWalk(arrivedRoute);
  assert.equal(samples.length, 1);
  assert.equal(samples[0].t, 0);
  assert.deepEqual(samples[0].position, arrivedRoute.path[0]);
});

test("simulatedWalk: a route shorter than one sample interval still yields a start and an end sample", () => {
  const shortRoute: WalkingRoute = {
    path: [
      { lat: 37.0, lng: -122.0 },
      { lat: 37.00001, lng: -122.0 }, // ~1.1m, well under 1.3m/sample
    ],
    distanceM: 1.1,
    durationS: 1,
  };
  const samples = simulatedWalk(shortRoute);
  assert.equal(samples.length, 2);
  assert.equal(samples[0].t, 0);
  assert.deepEqual(samples[1].position, shortRoute.path[1]);
});

test("simulatedWalk: accuracyM is not a flat constant (simulates GPS jitter) but is deterministic across runs", () => {
  const run1 = simulatedWalk(straightNorthRoute).map((s) => s.accuracyM);
  const run2 = simulatedWalk(straightNorthRoute).map((s) => s.accuracyM);
  assert.deepEqual(run1, run2, "accuracyM should be deterministic/reproducible");
  const distinctValues = new Set(run1.map((v) => v.toFixed(6)));
  assert.ok(distinctValues.size > 1, "accuracyM should vary across samples");
});

// Small, hand-built sample set for the playback tests, so they're fast and
// independent of simulatedWalk's own sampling density.
function makeTestSamples(count: number, spacingMs: number): SimSample[] {
  return Array.from({ length: count }, (_, i) => ({
    t: i * spacingMs,
    position: { lat: 37.0 + i * 0.0001, lng: -122.0 },
    accuracyM: 7,
    headingDeg: 0,
  }));
}

test("playSimulatedWalk: calls onSample once per sample", async () => {
  const samples = makeTestSamples(5, 20);
  const received: number[] = [];

  const stop = playSimulatedWalk(
    samples,
    (sample) => {
      received.push(sample.t);
    },
    { speedMultiplier: 20 } // fast playback for a quick test
  );

  // Let the whole walk play out, then stop (idempotent, should be a no-op).
  const totalDurationMs = samples[samples.length - 1].t / 20 + 50;
  await new Promise((resolve) => setTimeout(resolve, totalDurationMs));
  stop();

  assert.equal(received.length, samples.length);
  assert.deepEqual(
    received,
    samples.map((s) => s.t)
  );
});

test("playSimulatedWalk: cancel function stops further onSample calls", async () => {
  const samples = makeTestSamples(20, 20);
  let callCount = 0;

  const stop = playSimulatedWalk(
    samples,
    () => {
      callCount++;
    },
    { speedMultiplier: 20 }
  );

  // Let a couple of samples fire, then cancel well before completion.
  await new Promise((resolve) => setTimeout(resolve, 5));
  stop();
  const countAtCancel = callCount;

  // Wait long enough that, if cancellation didn't work, the rest of the
  // walk would have played out.
  const totalDurationMs = samples[samples.length - 1].t / 20 + 50;
  await new Promise((resolve) => setTimeout(resolve, totalDurationMs));

  assert.ok(countAtCancel < samples.length, "sanity check: cancel happened before completion");
  assert.equal(callCount, countAtCancel, "no further onSample calls after cancel");
});
