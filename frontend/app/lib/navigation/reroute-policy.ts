import { OFF_ROUTE_DWELL_MS, REROUTE_MIN_INTERVAL_MS } from "../tuning";

// guide() says offRoute the instant you're too far from the path; the timing
// is ours (VISION → Off route): reroute only after it has held ~5 s, at most
// once every ~15 s, and never while a reroute is already in flight.
export type RerouteState = {
  offRouteSinceMs: number | null;
  lastRerouteAtMs: number | null;
  inFlight: boolean;
};

export const initialReroute: RerouteState = { offRouteSinceMs: null, lastRerouteAtMs: null, inFlight: false };

export function stepReroute(
  state: RerouteState,
  offRoute: boolean,
  nowMs: number,
): { state: RerouteState; reroute: boolean } {
  if (!offRoute) return { state: { ...state, offRouteSinceMs: null }, reroute: false };

  const since = state.offRouteSinceMs ?? nowMs;
  const dwelled = nowMs - since >= OFF_ROUTE_DWELL_MS;
  const rested = state.lastRerouteAtMs === null || nowMs - state.lastRerouteAtMs >= REROUTE_MIN_INTERVAL_MS;

  if (dwelled && rested && !state.inFlight) {
    return { state: { offRouteSinceMs: since, lastRerouteAtMs: nowMs, inFlight: true }, reroute: true };
  }
  return { state: { ...state, offRouteSinceMs: since }, reroute: false };
}

/** The reroute came back. A new route restarts the dwell clock. */
export function rerouteLanded(state: RerouteState, gotNewRoute: boolean): RerouteState {
  return { ...state, inFlight: false, offRouteSinceMs: gotNewRoute ? null : state.offRouteSinceMs };
}
