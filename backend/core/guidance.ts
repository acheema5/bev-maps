import type { ArrowState, Guidance, LatLng, WalkingRoute } from "shared/contract";

// Pure logic, no UI. Runs on the phone. See VISION.md > "On-phone logic".
//
// Tuned constants (adjust on a real sidewalk):
// - snap the user onto the route, aim ~25m further along it
// - arrow state thresholds: within 30 deg = STRAIGHT, 30-135 deg = LEFT/RIGHT, >135 deg = U_TURN
// - ~10 deg hysteresis at each boundary
// - off-route: farther than max(30m, 2 x accuracyM) from the path
// - arrived: within ~20m of the destination (final path point), widened to
//   accuracyM (capped at 50m) when GPS is weak

const LOOKAHEAD_M = 25;
const STRAIGHT_THRESHOLD_DEG = 30;
const UTURN_THRESHOLD_DEG = 135;
const HYSTERESIS_DEG = 10;
const MIN_OFF_ROUTE_M = 30;
const OFF_ROUTE_ACCURACY_MULTIPLIER = 2;
const ARRIVED_RADIUS_M = 20;
const MAX_ARRIVED_RADIUS_M = 50;

const EARTH_RADIUS_M = 6371000;

/** Mean radians per degree. */
function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Approximate planar distance in meters between two LatLngs, using an
 * equirectangular approximation. Accurate enough at city-block scales.
 */
function distanceM(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const meanLat = (lat1 + lat2) / 2;
  const dLat = lat2 - lat1;
  const dLng = toRad(b.lng - a.lng);

  const x = dLng * Math.cos(meanLat);
  const y = dLat;

  return Math.sqrt(x * x + y * y) * EARTH_RADIUS_M;
}

/**
 * Compass bearing in degrees [0, 360) from point `a` to point `b`.
 * 0 = north, clockwise.
 */
function bearingDeg(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  const bearing = toDeg(Math.atan2(y, x));
  return (bearing + 360) % 360;
}

/**
 * Normalize an angle difference to (-180, 180]. Handles the 359 -> 1
 * wraparound correctly (e.g. heading=359, bearing=2 -> +3, not -357).
 */
function normalizeAngle(deg: number): number {
  let result = deg % 360;
  if (result > 180) result -= 360;
  if (result <= -180) result += 360;
  return result;
}

type ProjectedPoint = {
  point: LatLng;
  /** Index of the path segment this point lies on (segment i -> i+1). */
  segmentIndex: number;
  /** Fraction along the segment, 0..1. */
  t: number;
  distanceToPathM: number;
};

/**
 * Projects a point onto a single segment [a, b], using a local planar
 * approximation (good enough at the short segment lengths a walking
 * route path will have).
 */
function projectOntoSegment(p: LatLng, a: LatLng, b: LatLng): { point: LatLng; t: number } {
  const meanLat = toRad((a.lat + b.lat) / 2);
  const cosLat = Math.cos(meanLat);

  // Convert to a local planar (x = lng scaled, y = lat) coordinate system.
  const ax = a.lng * cosLat;
  const ay = a.lat;
  const bx = b.lng * cosLat;
  const by = b.lat;
  const px = p.lng * cosLat;
  const py = p.lat;

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  let t: number;
  if (lenSq === 0) {
    t = 0;
  } else {
    t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
  }

  return {
    point: { lat: a.lat + t * (b.lat - a.lat), lng: a.lng + t * (b.lng - a.lng) },
    t,
  };
}

/**
 * Finds the nearest point on a (possibly multi-segment) path to `p`.
 * Returns the snapped point, which segment it falls on, the fraction
 * along that segment, and the distance from `p` to the path.
 */
function nearestPointOnPath(p: LatLng, path: LatLng[]): ProjectedPoint {
  if (path.length === 0) {
    throw new Error("guide(): route.path must have at least one point");
  }
  if (path.length === 1) {
    return {
      point: path[0],
      segmentIndex: 0,
      t: 0,
      distanceToPathM: distanceM(p, path[0]),
    };
  }

  let best: ProjectedPoint | null = null;

  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const { point, t } = projectOntoSegment(p, a, b);
    const d = distanceM(p, point);

    if (best === null || d < best.distanceToPathM) {
      best = { point, segmentIndex: i, t, distanceToPathM: d };
    }
  }

  // path.length >= 2, so best is always set.
  return best as ProjectedPoint;
}

/**
 * Walks forward from a projected point on the path by `aheadM` meters,
 * following the polyline. If the remaining path is shorter than
 * `aheadM`, returns the final point of the path (the destination).
 */
function pointAheadOnPath(path: LatLng[], from: ProjectedPoint, aheadM: number): LatLng {
  let remaining = aheadM;
  let currentPoint = from.point;

  for (let i = from.segmentIndex; i < path.length - 1; i++) {
    const segStart = i === from.segmentIndex ? from.point : path[i];
    const segEnd = path[i + 1];
    const segLen = distanceM(segStart, segEnd);

    if (segLen >= remaining) {
      if (segLen === 0) {
        currentPoint = segEnd;
        continue;
      }
      const frac = remaining / segLen;
      return {
        lat: segStart.lat + frac * (segEnd.lat - segStart.lat),
        lng: segStart.lng + frac * (segEnd.lng - segStart.lng),
      };
    }

    remaining -= segLen;
    currentPoint = segEnd;
  }

  // Ran out of path before covering `aheadM`: aim at the destination.
  return currentPoint;
}

/**
 * Maps a relative angle (-180..180, positive = right) to an arrow state,
 * applying ~10 deg hysteresis around the 30 deg and 135 deg boundaries
 * based on the previous arrow state to avoid flicker.
 */
function arrowStateFor(relativeAngleDeg: number, previous?: ArrowState): ArrowState {
  const abs = Math.abs(relativeAngleDeg);
  const right = relativeAngleDeg >= 0;

  // Boundary thresholds, shifted by hysteresis depending on the previous state.
  let straightBoundary = STRAIGHT_THRESHOLD_DEG;
  let uturnBoundary = UTURN_THRESHOLD_DEG;

  if (previous === "STRAIGHT") {
    // Resist leaving STRAIGHT: require exceeding 30 + 10 = 40 deg.
    straightBoundary = STRAIGHT_THRESHOLD_DEG + HYSTERESIS_DEG;
  } else if (previous === "LEFT" || previous === "RIGHT") {
    // Resist re-entering STRAIGHT: require dropping below 30 - 10 = 20 deg.
    straightBoundary = STRAIGHT_THRESHOLD_DEG - HYSTERESIS_DEG;
  }

  if (previous === "U_TURN") {
    // Resist leaving U_TURN: require dropping below 135 - 10 = 125 deg.
    uturnBoundary = UTURN_THRESHOLD_DEG - HYSTERESIS_DEG;
  } else if (previous === "LEFT" || previous === "RIGHT") {
    // Resist entering U_TURN: require exceeding 135 + 10 = 145 deg.
    uturnBoundary = UTURN_THRESHOLD_DEG + HYSTERESIS_DEG;
  }

  if (abs > uturnBoundary) return "U_TURN";
  if (abs <= straightBoundary) return "STRAIGHT";
  return right ? "RIGHT" : "LEFT";
}

/**
 * One guidance tick. Pure: call it on every position/heading update.
 *
 * The caller owns timing, since a pure function can't:
 * - `offRoute` reflects only the current position. Reroute (POST /api/route)
 *   only after it has stayed true for ~5 s, and at most once every ~15 s.
 * - Check `arrived` before `arrow`: it can be true while the arrow says U_TURN
 *   (e.g. just past the store).
 * - Pass a smoothed heading. Until the compass reports, a non-finite heading
 *   keeps the previous arrow.
 *
 * Never throws: an empty route returns `offRoute: true` so the caller reroutes.
 */
export function guide(input: {
  position: LatLng;
  accuracyM: number;
  headingDeg: number; // where the back camera faces; 0 = north, clockwise
  route: WalkingRoute;
  previous?: Guidance; // enables hysteresis
}): Guidance {
  const { position, accuracyM, headingDeg, route, previous } = input;
  const path = route.path;

  if (path.length === 0) {
    return {
      arrow: previous?.arrow ?? "STRAIGHT",
      relativeAngleDeg: 0,
      offRoute: true,
      arrived: false,
    };
  }

  const snapped = nearestPointOnPath(position, path);
  const finalPoint = path[path.length - 1];

  const offRouteThresholdM = Math.max(MIN_OFF_ROUTE_M, OFF_ROUTE_ACCURACY_MULTIPLIER * accuracyM);
  const offRoute = snapped.distanceToPathM > offRouteThresholdM;

  const arrivedRadiusM = Number.isFinite(accuracyM)
    ? Math.max(ARRIVED_RADIUS_M, Math.min(accuracyM, MAX_ARRIVED_RADIUS_M))
    : ARRIVED_RADIUS_M;
  const arrived = distanceM(position, finalPoint) <= arrivedRadiusM;

  const target = pointAheadOnPath(path, snapped, LOOKAHEAD_M);
  const bearingToTarget = bearingDeg(position, target);
  if (!Number.isFinite(headingDeg)) {
    return {
      arrow: previous?.arrow ?? "STRAIGHT",
      relativeAngleDeg: previous?.relativeAngleDeg ?? 0,
      offRoute,
      arrived,
    };
  }

  const relativeAngleDeg = normalizeAngle(bearingToTarget - headingDeg);

  const arrow = arrowStateFor(relativeAngleDeg, previous?.arrow);

  return {
    arrow,
    relativeAngleDeg,
    offRoute,
    arrived,
  };
}
