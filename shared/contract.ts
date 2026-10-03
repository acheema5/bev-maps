// The types both frontend/ and backend/ build against.
// Source: VISION.md, "Technical shape" section. Changes here go through
// the integration agent — see VISION.md > "Rules for every agent in this repo".

export type LatLng = { lat: number; lng: number };

// POST /api/find-bev
export type FindBevRequest = {
  origin: LatLng;
  accuracyM: number; // phone-reported accuracy, meters
};

export type FindBevResponse =
  | { status: "FOUND"; destination: Destination; route: WalkingRoute }
  | { status: "NONE_NEARBY"; searchedRadiusM: number }
  | { status: "ERROR"; message: string };

// POST /api/route — reroute when the user leaves the path
export type RouteRequest = { origin: LatLng; destination: LatLng };

export type RouteResponse =
  | { status: "OK"; route: WalkingRoute }
  | { status: "ERROR"; message: string };

export type Destination = {
  placeId: string;
  name: string; // "7-Eleven"
  kind: string; // e.g. "convenience_store"
  location: LatLng;
  closesAt?: string; // ISO 8601, when known
};

export type WalkingRoute = {
  path: LatLng[]; // user -> store
  distanceM: number;
  durationS: number;
};

export type ArrowState = "STRAIGHT" | "LEFT" | "RIGHT" | "U_TURN";

export type Guidance = {
  arrow: ArrowState;
  relativeAngleDeg: number; // -180..180; positive = route is to your right
  offRoute: boolean; // true -> call /api/route
  arrived: boolean;
};

// One sample in a simulated walk: a fake GPS+heading reading at a point in time,
// played back through the same code path as real sensors. See VISION.md >
// "Technical shape" > Testing, and backend/core/sim.ts.
export type SimSample = {
  tMs: number; // milliseconds since the simulated walk started
  position: LatLng;
  accuracyM: number;
  headingDeg: number; // where the back camera faces; 0 = north, clockwise
};
