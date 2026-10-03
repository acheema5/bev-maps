import { test } from "node:test";
import assert from "node:assert/strict";
import { guide } from "./guidance";
import type { ArrowState, Guidance, LatLng, WalkingRoute } from "shared/contract";

const EARTH_RADIUS_M = 6371000;
const METERS_PER_DEG_LAT = (EARTH_RADIUS_M * Math.PI) / 180; // ~111194.93

function metersToLatDeg(m: number): number {
  return m / METERS_PER_DEG_LAT;
}

/** North-south route starting at the equator/prime-meridian; bearing is
 * exactly 0 (due north) for every point along it, independent of the
 * spherical-bearing formula's rounding — handy for exact-angle tests. */
function northRoute(lengthM = 200): WalkingRoute {
  const path: LatLng[] = [
    { lat: 0, lng: 0 },
    { lat: metersToLatDeg(lengthM), lng: 0 },
  ];
  return { path, distanceM: lengthM, durationS: lengthM };
}

/** headingDeg that makes relativeAngleDeg (bearing 0 - heading, normalized)
 * equal `desiredDeg`, for use with northRoute(). */
function headingFor(desiredDeg: number): number {
  return (((-desiredDeg % 360) + 360) % 360);
}

function prevWith(arrow: ArrowState): Guidance {
  return { arrow, relativeAngleDeg: 0, offRoute: false, arrived: false };
}

function eastRoute(lengthM: number): WalkingRoute {
  const path: LatLng[] = [
    { lat: 0, lng: 0 },
    { lat: 0, lng: metersToLatDeg(lengthM) }, // reuse same deg-per-meter at equator for lng too
  ];
  return { path, distanceM: lengthM, durationS: lengthM };
}

// --- Straight route, user facing it ---

test("straight route, user facing it -> STRAIGHT", () => {
  const route = northRoute(200);
  const result = guide({
    position: { lat: 0, lng: 0 },
    accuracyM: 5,
    headingDeg: 0,
    route,
  });
  assert.equal(result.arrow, "STRAIGHT");
  assert.ok(Math.abs(result.relativeAngleDeg) < 0.1, `expected ~0, got ${result.relativeAngleDeg}`);
  assert.equal(result.offRoute, false);
  assert.equal(result.arrived, false);
});

// --- 30 deg boundary, no hysteresis (no previous) ---

test("just under 30 deg right -> STRAIGHT", () => {
  const route = northRoute(200);
  const result = guide({
    position: { lat: 0, lng: 0 },
    accuracyM: 5,
    headingDeg: headingFor(29),
    route,
  });
  assert.equal(result.arrow, "STRAIGHT");
});

test("just over 30 deg right -> RIGHT", () => {
  const route = northRoute(200);
  const result = guide({
    position: { lat: 0, lng: 0 },
    accuracyM: 5,
    headingDeg: headingFor(31),
    route,
  });
  assert.equal(result.arrow, "RIGHT");
});

test("just under 30 deg left -> STRAIGHT", () => {
  const route = northRoute(200);
  const result = guide({
    position: { lat: 0, lng: 0 },
    accuracyM: 5,
    headingDeg: headingFor(-29),
    route,
  });
  assert.equal(result.arrow, "STRAIGHT");
});

test("just over 30 deg left -> LEFT", () => {
  const route = northRoute(200);
  const result = guide({
    position: { lat: 0, lng: 0 },
    accuracyM: 5,
    headingDeg: headingFor(-31),
    route,
  });
  assert.equal(result.arrow, "LEFT");
});

// --- 135 deg boundary, no hysteresis ---

test("just under 135 deg right -> RIGHT", () => {
  const route = northRoute(200);
  const result = guide({
    position: { lat: 0, lng: 0 },
    accuracyM: 5,
    headingDeg: headingFor(134),
    route,
  });
  assert.equal(result.arrow, "RIGHT");
});

test("just over 135 deg right -> U_TURN", () => {
  const route = northRoute(200);
  const result = guide({
    position: { lat: 0, lng: 0 },
    accuracyM: 5,
    headingDeg: headingFor(136),
    route,
  });
  assert.equal(result.arrow, "U_TURN");
});

test("just under 135 deg left -> LEFT", () => {
  const route = northRoute(200);
  const result = guide({
    position: { lat: 0, lng: 0 },
    accuracyM: 5,
    headingDeg: headingFor(-134),
    route,
  });
  assert.equal(result.arrow, "LEFT");
});

test("just over 135 deg left -> U_TURN", () => {
  const route = northRoute(200);
  const result = guide({
    position: { lat: 0, lng: 0 },
    accuracyM: 5,
    headingDeg: headingFor(-136),
    route,
  });
  assert.equal(result.arrow, "U_TURN");
});

// --- Hysteresis around the 30 deg boundary ---

test("hysteresis: previous STRAIGHT resists flipping to RIGHT at 31 deg", () => {
  const route = northRoute(200);
  const result = guide({
    position: { lat: 0, lng: 0 },
    accuracyM: 5,
    headingDeg: headingFor(31),
    route,
    previous: prevWith("STRAIGHT"),
  });
  assert.equal(result.arrow, "STRAIGHT");
});

test("hysteresis: previous STRAIGHT flips to RIGHT at ~41 deg", () => {
  const route = northRoute(200);
  const result = guide({
    position: { lat: 0, lng: 0 },
    accuracyM: 5,
    headingDeg: headingFor(41),
    route,
    previous: prevWith("STRAIGHT"),
  });
  assert.equal(result.arrow, "RIGHT");
});

test("hysteresis: previous RIGHT resists dropping to STRAIGHT at 21 deg", () => {
  const route = northRoute(200);
  const result = guide({
    position: { lat: 0, lng: 0 },
    accuracyM: 5,
    headingDeg: headingFor(21),
    route,
    previous: prevWith("RIGHT"),
  });
  assert.equal(result.arrow, "RIGHT");
});

test("hysteresis: previous RIGHT drops to STRAIGHT under 20 deg", () => {
  const route = northRoute(200);
  const result = guide({
    position: { lat: 0, lng: 0 },
    accuracyM: 5,
    headingDeg: headingFor(19),
    route,
    previous: prevWith("RIGHT"),
  });
  assert.equal(result.arrow, "STRAIGHT");
});

// --- Hysteresis around the 135 deg boundary ---

test("hysteresis: previous RIGHT resists entering U_TURN at 144 deg", () => {
  const route = northRoute(200);
  const result = guide({
    position: { lat: 0, lng: 0 },
    accuracyM: 5,
    headingDeg: headingFor(144),
    route,
    previous: prevWith("RIGHT"),
  });
  assert.equal(result.arrow, "RIGHT");
});

test("hysteresis: previous RIGHT enters U_TURN at 146 deg", () => {
  const route = northRoute(200);
  const result = guide({
    position: { lat: 0, lng: 0 },
    accuracyM: 5,
    headingDeg: headingFor(146),
    route,
    previous: prevWith("RIGHT"),
  });
  assert.equal(result.arrow, "U_TURN");
});

test("hysteresis: previous U_TURN resists dropping to RIGHT at 126 deg", () => {
  const route = northRoute(200);
  const result = guide({
    position: { lat: 0, lng: 0 },
    accuracyM: 5,
    headingDeg: headingFor(126),
    route,
    previous: prevWith("U_TURN"),
  });
  assert.equal(result.arrow, "U_TURN");
});

test("hysteresis: previous U_TURN drops to RIGHT under 125 deg", () => {
  const route = northRoute(200);
  const result = guide({
    position: { lat: 0, lng: 0 },
    accuracyM: 5,
    headingDeg: headingFor(124),
    route,
    previous: prevWith("U_TURN"),
  });
  assert.equal(result.arrow, "RIGHT");
});

// --- Off-route ---

test("off-route: false just under threshold (accuracyM=5 -> 30m floor)", () => {
  const route = eastRoute(2000);
  const result = guide({
    position: { lat: metersToLatDeg(29), lng: metersToLatDeg(1000) },
    accuracyM: 5,
    headingDeg: 90,
    route,
  });
  assert.equal(result.offRoute, false);
});

test("off-route: true just over threshold (accuracyM=5 -> 30m floor)", () => {
  const route = eastRoute(2000);
  const result = guide({
    position: { lat: metersToLatDeg(31), lng: metersToLatDeg(1000) },
    accuracyM: 5,
    headingDeg: 90,
    route,
  });
  assert.equal(result.offRoute, true);
});

test("off-route threshold scales with accuracyM (accuracyM=50 -> 100m floor)", () => {
  const route = eastRoute(2000);
  const under = guide({
    position: { lat: metersToLatDeg(99), lng: metersToLatDeg(1000) },
    accuracyM: 50,
    headingDeg: 90,
    route,
  });
  const over = guide({
    position: { lat: metersToLatDeg(101), lng: metersToLatDeg(1000) },
    accuracyM: 50,
    headingDeg: 90,
    route,
  });
  assert.equal(under.offRoute, false);
  assert.equal(over.offRoute, true);
});

// --- Arrived ---

test("arrived: true within ~20m of destination", () => {
  const route = eastRoute(2000);
  const finalPoint = route.path[route.path.length - 1];
  const result = guide({
    position: { lat: metersToLatDeg(19), lng: finalPoint.lng },
    accuracyM: 20,
    headingDeg: 90,
    route,
  });
  assert.equal(result.arrived, true);
});

test("arrived: false just outside ~20m of destination", () => {
  const route = eastRoute(2000);
  const finalPoint = route.path[route.path.length - 1];
  const result = guide({
    position: { lat: metersToLatDeg(21), lng: finalPoint.lng },
    accuracyM: 20,
    headingDeg: 90,
    route,
  });
  assert.equal(result.arrived, false);
});

// --- Heading wraparound ---

test("heading wraparound: heading 350, bearing ~10 -> +20, not -340", () => {
  // Build a route whose initial bearing from the origin is exactly 10 deg,
  // using the spherical destination-point formula (inverse of the bearing
  // formula), so the computed bearing matches 10 deg to high precision.
  const lat1 = 0;
  const lng1 = 0;
  const bearing = (10 * Math.PI) / 180;
  const d = 200; // meters
  const angDist = d / EARTH_RADIUS_M;

  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = Math.asin(
    Math.sin(lat1Rad) * Math.cos(angDist) + Math.cos(lat1Rad) * Math.sin(angDist) * Math.cos(bearing)
  );
  const lng2Rad =
    (lng1 * Math.PI) / 180 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angDist) * Math.cos(lat1Rad),
      Math.cos(angDist) - Math.sin(lat1Rad) * Math.sin(lat2Rad)
    );

  const dest: LatLng = { lat: (lat2Rad * 180) / Math.PI, lng: (lng2Rad * 180) / Math.PI };
  const route: WalkingRoute = { path: [{ lat: lat1, lng: lng1 }, dest], distanceM: d, durationS: d };

  const result = guide({
    position: { lat: lat1, lng: lng1 },
    accuracyM: 5,
    headingDeg: 350,
    route,
  });

  assert.ok(
    Math.abs(result.relativeAngleDeg - 20) < 1,
    `expected ~+20, got ${result.relativeAngleDeg}`
  );
  assert.ok(result.relativeAngleDeg > -180 && result.relativeAngleDeg <= 180);
});

// --- Degenerate input ---

test("empty route: does not throw, reports offRoute so the caller reroutes", () => {
  const result = guide({
    position: { lat: 0, lng: 0 },
    accuracyM: 5,
    headingDeg: 0,
    route: { path: [], distanceM: 0, durationS: 0 },
    previous: prevWith("LEFT"),
  });
  assert.deepEqual(result, { arrow: "LEFT", relativeAngleDeg: 0, offRoute: true, arrived: false });
});

test("non-finite heading: keeps the previous arrow instead of NaN", () => {
  const result = guide({
    position: { lat: 0, lng: 0 },
    accuracyM: 5,
    headingDeg: NaN,
    route: northRoute(),
    previous: prevWith("RIGHT"),
  });
  assert.equal(result.arrow, "RIGHT");
  assert.ok(Number.isFinite(result.relativeAngleDeg));
});

// --- Arrival with weak GPS ---

test("arrived: radius widens with weak GPS (accuracyM=40 -> 40m)", () => {
  const route = eastRoute(2000);
  const finalPoint = route.path[route.path.length - 1];
  const result = guide({
    position: { lat: metersToLatDeg(35), lng: finalPoint.lng },
    accuracyM: 40,
    headingDeg: 90,
    route,
  });
  assert.equal(result.arrived, true);
});

test("arrived: widened radius is capped at 50m", () => {
  const route = eastRoute(2000);
  const finalPoint = route.path[route.path.length - 1];
  const result = guide({
    position: { lat: metersToLatDeg(60), lng: finalPoint.lng },
    accuracyM: 200,
    headingDeg: 90,
    route,
  });
  assert.equal(result.arrived, false);
});
