import { magvar } from "magvar";
import type { LatLng } from "shared/contract";
import { HEADING_TAU_MS, HOLD_UP_HIDE_DEG, HOLD_UP_SHOW_DEG } from "../tuning";

// Heading = where the back camera faces, 0 = true north, clockwise
// (VISION → Heading). On iPhone, webkitCompassHeading reports that when the
// phone is held upright, but against MAGNETIC north: add the local
// declination or the arrow is off by ~13° in New York or San Francisco.

export type CompassSample = {
  magneticDeg: number | null; // webkitCompassHeading; null where the browser has none
  accuracyDeg: number | null; // webkitCompassAccuracy; negative = uncalibrated
  pitchDeg: number | null; // beta: ~90 upright, ~0 flat
  timeMs: number;
};

/** Listens to the phone's orientation sensor. Needs motion permission on iOS. */
export function watchCompass(onSample: (sample: CompassSample) => void): () => void {
  const handler = (event: DeviceOrientationEvent) => {
    const ios = event as DeviceOrientationEvent & { webkitCompassHeading?: number; webkitCompassAccuracy?: number };
    onSample({
      magneticDeg: finiteOrNull(ios.webkitCompassHeading),
      accuracyDeg: finiteOrNull(ios.webkitCompassAccuracy),
      pitchDeg: finiteOrNull(event.beta),
      timeMs: performance.now(),
    });
  };
  window.addEventListener("deviceorientation", handler);
  return () => window.removeEventListener("deviceorientation", handler);
}

/** A reading we can steer by: a heading, and not flagged uncalibrated. */
export function isTrustworthy(sample: CompassSample): sample is CompassSample & { magneticDeg: number } {
  return sample.magneticDeg !== null && (sample.accuracyDeg === null || sample.accuracyDeg >= 0);
}

/** Degrees to add to a magnetic heading to get a true one, at this spot. */
export function declinationAt(position: LatLng, when: Date = new Date()): number {
  const d = magvar(position.lat, position.lng, 0, when);
  return Number.isFinite(d) ? d : 0;
}

export function toTrueHeading(magneticDeg: number, declinationDeg: number): number {
  return normalizeDeg(magneticDeg + declinationDeg);
}

export function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * Low-pass filter for a compass angle. Averages unit vectors, not degrees, so
 * 359° → 1° is a 2° step rather than a 358° swing. Frame-rate independent:
 * the blend depends on time since the last sample.
 */
export function createHeadingFilter(tauMs: number = HEADING_TAU_MS) {
  let x = 0;
  let y = 0;
  let lastMs: number | null = null;
  return {
    push(headingDeg: number, timeMs: number): number {
      const rad = (headingDeg * Math.PI) / 180;
      const sx = Math.sin(rad);
      const sy = Math.cos(rad);
      if (lastMs === null) {
        x = sx;
        y = sy;
      } else {
        const alpha = 1 - Math.exp(-Math.max(0, timeMs - lastMs) / tauMs);
        x += alpha * (sx - x);
        y += alpha * (sy - y);
      }
      lastMs = timeMs;
      return normalizeDeg((Math.atan2(x, y) * 180) / Math.PI);
    },
    reset() {
      lastMs = null;
    },
  };
}

/**
 * Is the phone held up like a camera? Hysteresis keeps "Hold your phone up"
 * from flickering at the threshold. A phone tipped past vertical (beta > 90)
 * is still up.
 */
export function isHeldUp(pitchDeg: number, wasHeldUp: boolean): boolean {
  const tilt = Math.abs(pitchDeg);
  return wasHeldUp ? tilt >= HOLD_UP_SHOW_DEG : tilt >= HOLD_UP_HIDE_DEG;
}

function finiteOrNull(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
