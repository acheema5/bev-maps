import { playSimulatedWalk, simulatedWalk } from "backend-core";
import type { WalkingRoute } from "shared/contract";
import type { Session } from "../session";
import { declinationAt, isTrustworthy, normalizeDeg, toTrueHeading, watchCompass } from "./heading";
import type { Fix } from "./location";

// What navigation listens to. Real sensors and the simulated walk feed the
// exact same handlers (VISION → How we build it: the ?sim=1 desk demo).
// Headings are TRUE north, raw (unsmoothed): smoothing happens downstream,
// once, for both sources.
export type NavHandlers = {
  fix(fix: Fix): void;
  heading(trueDeg: number, timeMs: number): void;
  pitch(deg: number): void;
};

export type NavSensors = { start(handlers: NavHandlers): () => void };

/** The phone: GPS from the trip's watch, compass corrected magnetic → true. */
export function realSensors(session: Session): NavSensors {
  return {
    start(handlers) {
      // Declination barely changes over a walk: compute it once, from the first fix.
      let declination: number | null = null;
      const onFix = () => {
        const fix = session.latest;
        if (!fix) return;
        declination ??= declinationAt(fix.position);
        handlers.fix(fix);
      };
      onFix();
      const stopFixes = session.onChange(onFix);
      const stopCompass = watchCompass((sample) => {
        if (sample.pitchDeg !== null) handlers.pitch(sample.pitchDeg);
        if (isTrustworthy(sample) && declination !== null) {
          handlers.heading(toTrueHeading(sample.magneticDeg, declination), sample.timeMs);
        }
      });
      return () => {
        stopFixes();
        stopCompass();
      };
    },
  };
}

/**
 * A walk along `route` at walking pace × speed. Sim headings are already true
 * north (bearings between route points), so no declination here. The debug
 * panel's heading offset applies live, so turns can be demoed at a desk.
 */
export function simSensors(route: WalkingRoute, speed: number, headingOffset: () => number = () => 0): NavSensors {
  return {
    start(handlers) {
      let lastHeading: number | null = null;
      handlers.pitch(90);
      const stopWalk = playSimulatedWalk(
        simulatedWalk(route),
        (sample) => {
          handlers.fix({ position: sample.position, accuracyM: sample.accuracyM, timestampMs: Date.now() });
          lastHeading = sample.headingDeg;
        },
        { speedMultiplier: speed },
      );
      // A compass reports continuously; so does the sim.
      const ticker = setInterval(() => {
        if (lastHeading !== null) handlers.heading(normalizeDeg(lastHeading + headingOffset()), performance.now());
      }, 50);
      return () => {
        stopWalk();
        clearInterval(ticker);
      };
    },
  };
}
