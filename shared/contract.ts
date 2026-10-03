// The contract between frontend/ and backend/. Both sides build against these
// types and nothing else. Changing this file is a "contract change": it needs
// sign-off from both owners (see CLAUDE.md). Source: VISION.md → Technical shape.

export type LatLng = { lat: number; lng: number };

// ── Server API ──────────────────────────────────────────────────────────────

// POST /api/find-bev
export type FindBevRequest = {
  origin: LatLng;
  accuracyM: number; // phone-reported accuracy, meters
};

export type FindBevResponse =
  | { status: "FOUND"; destination: Destination; route: WalkingRoute }
  | { status: "NONE_NEARBY"; searchedRadiusM: number }
  | { status: "ERROR"; message: string };

// POST /api/route: reroute when the user leaves the path
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
  path: LatLng[]; // user → store
  distanceM: number;
  durationS: number;
};

// ── On-phone logic (implemented in backend/core, called by frontend) ────────

export type ArrowState = "STRAIGHT" | "LEFT" | "RIGHT" | "U_TURN";

export type Guidance = {
  arrow: ArrowState;
  relativeAngleDeg: number; // -180..180; positive = route is to your right
  offRoute: boolean; // true → call /api/route
  arrived: boolean;
};

export type GuideInput = {
  position: LatLng;
  accuracyM: number;
  headingDeg: number; // where the back camera faces; 0 = north, clockwise
  route: WalkingRoute;
  previous?: Guidance; // enables hysteresis
};

export type GuideFn = (input: GuideInput) => Guidance;

// Fog of war
export type RecordPositionFn = (position: LatLng, accuracyM: number) => void;
export type RevealedPointsFn = () => LatLng[]; // each reveals REVEAL_RADIUS_M

// ── Shared constants ────────────────────────────────────────────────────────

export const REVEAL_RADIUS_M = 15;

export const ARROW_THRESHOLDS_DEG = {
  straight: 30, // |angle| ≤ 30 → STRAIGHT
  turn: 135, // 30 < |angle| ≤ 135 → LEFT/RIGHT; beyond → U_TURN
  hysteresis: 10,
} as const;
