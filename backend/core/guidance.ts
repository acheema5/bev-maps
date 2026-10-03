import type { Guidance, LatLng, WalkingRoute } from "shared/contract";

// Pure logic, no UI. Runs on the phone. See VISION.md > "On-phone logic".
//
// Starting values to tune on a real sidewalk:
// - snap the user onto the route, aim ~25m further along it
// - arrow state thresholds: within 30° = STRAIGHT, 30-135° = LEFT/RIGHT, >135° = U_TURN
// - ~10° hysteresis at each boundary
// - off-route: farther than max(30m, 2 x accuracyM) from the path for ~5s -> reroute, throttled to ~15s
// - arrived: within ~20m of the store
export function guide(input: {
  position: LatLng;
  accuracyM: number;
  headingDeg: number; // where the back camera faces; 0 = north, clockwise
  route: WalkingRoute;
  previous?: Guidance; // enables hysteresis
}): Guidance {
  throw new Error("not implemented");
}
