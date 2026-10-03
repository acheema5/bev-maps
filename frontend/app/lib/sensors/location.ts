import type { LatLng } from "shared/contract";
import {
  FALLBACK_FIX_M,
  FIX_GIVE_UP_MS,
  FIX_WAIT_MS,
  GIVE_UP_FIX_M,
  GOOD_FIX_M,
  PRECISE_OFF_M,
} from "../tuning";

export type Fix = { position: LatLng; accuracyM: number; timestampMs: number };

export type LocationSource = {
  /** Starts watching; returns a stop function. `denied` is the only terminal error. */
  start(onFix: (fix: Fix) => void, onDenied: () => void): () => void;
};

// The phone's GPS. One high-accuracy watch runs from the Find Bev tap until the
// trip ends, so navigation starts with a warm fix. Timeouts and "position
// unavailable" are transient (indoors, a tunnel): keep watching.
export const realLocation: LocationSource = {
  start(onFix, onDenied) {
    if (!("geolocation" in navigator)) {
      onDenied();
      return () => {};
    }
    const id = navigator.geolocation.watchPosition(
      (p) =>
        onFix({
          position: { lat: p.coords.latitude, lng: p.coords.longitude },
          accuracyM: p.coords.accuracy,
          timestampMs: p.timestamp,
        }),
      (error) => {
        if (error.code === error.PERMISSION_DENIED) onDenied();
      },
      { enableHighAccuracy: true, maximumAge: 1_000, timeout: 20_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  },
};

/** A location that never moves: the sim's starting point, before the walk begins. */
export function fixedLocation(position: LatLng, accuracyM = 5): LocationSource {
  return {
    start(onFix) {
      const timer = setTimeout(() => onFix({ position, accuracyM, timestampMs: Date.now() }), 0);
      return () => clearTimeout(timer);
    },
  };
}

export type FixDecision =
  | { kind: "wait" }
  | { kind: "use"; fix: Fix }
  | { kind: "fail"; notice: "precise-off" | "no-fix" };

/**
 * When is a fix good enough to search from? (VISION → 2. Finding Bev)
 * - Any fix within GOOD_FIX_M: go now.
 * - After FIX_WAIT_MS: settle for the best within FALLBACK_FIX_M. If every fix
 *   is city-sized, Precise Location is off and waiting won't help.
 * - After FIX_GIVE_UP_MS: the best within GIVE_UP_FIX_M, or give up.
 */
export function decideFix(fixes: readonly Fix[], elapsedMs: number): FixDecision {
  const best = mostAccurate(fixes);
  if (best && best.accuracyM <= GOOD_FIX_M) return { kind: "use", fix: best };
  if (elapsedMs < FIX_WAIT_MS) return { kind: "wait" };

  if (best && best.accuracyM <= FALLBACK_FIX_M) return { kind: "use", fix: best };
  const preciseOff = fixes.length > 0 && fixes.every((f) => f.accuracyM > PRECISE_OFF_M);
  if (preciseOff) return { kind: "fail", notice: "precise-off" };
  if (elapsedMs < FIX_GIVE_UP_MS) return { kind: "wait" };

  if (best && best.accuracyM <= GIVE_UP_FIX_M) return { kind: "use", fix: best };
  return { kind: "fail", notice: "no-fix" };
}

function mostAccurate(fixes: readonly Fix[]): Fix | undefined {
  let best: Fix | undefined;
  for (const fix of fixes) {
    // Ties go to the newer fix.
    if (!best || fix.accuracyM <= best.accuracyM) best = fix;
  }
  return best;
}
