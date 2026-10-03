"use client";

import { guide, recordPosition } from "backend-core";
import { useEffect, useRef, useState, type Dispatch, type RefObject } from "react";
import type { Destination, Guidance, WalkingRoute } from "shared/contract";
import { requestRoute } from "../api";
import { isUsableRoute, type AppEvent, type CompassStatus } from "../app-state";
import { report } from "../debug";
import type { Flags } from "../env";
import { createHeadingFilter, isHeldUp } from "../sensors/heading";
import type { Fix } from "../sensors/location";
import type { NavSensors } from "../sensors/source";
import { COMPASS_RECOVER_MS, COMPASS_STALE_MS, COMPASS_WAIT_MS, GUIDE_MIN_INTERVAL_MS } from "../tuning";
import { initialReroute, rerouteLanded, stepReroute } from "./reroute-policy";

/** What the navigate screen renders. Changes at most ~10×/s. */
export type NavView = { guidance: Guidance | null; heldUp: boolean; fix: Fix | null };

/** Read every animation frame (the minimap): never goes through React state. */
export type NavLive = { headingDeg: number | null; fix: Fix | null };

type Args = {
  active: boolean; // the navigating screen is up
  sensors: NavSensors | null;
  route: WalkingRoute | null;
  destination: Destination | null;
  compass: CompassStatus | null;
  flags: Flags | null;
  tripSignal: () => AbortSignal | undefined; // aborts a reroute in flight when the trip ends
  dispatch: Dispatch<AppEvent>;
};

const IDLE: NavView = { guidance: null, heldUp: true, fix: null };

// The guidance loop (VISION → Technical shape): sensor samples → smoothed
// true heading → guide() → arrow, arrival, and (after a dwell, throttled)
// reroutes. Every fix also feeds the fog of war.
export function useNavigation(args: Args): { view: NavView; live: RefObject<NavLive> } {
  const [view, setView] = useState<NavView>(IDLE);
  const live = useRef<NavLive>({ headingDeg: null, fix: null });

  // Values the loop reads but must not restart for: a reroute swaps the route
  // mid-walk without resetting sensors or hysteresis.
  const latest = useRef(args);
  useEffect(() => {
    latest.current = args;
  });

  const { active, sensors } = args;

  useEffect(() => {
    if (!active || !sensors) return;
    const { dispatch, flags, tripSignal } = latest.current;
    const signal = tripSignal();
    const filter = createHeadingFilter();
    let guidance: Guidance | undefined;
    let heading: number | null = null;
    let fix: Fix | null = null;
    let heldUp = true;
    let lastGuideMs = -Infinity;
    let reroute = initialReroute;
    let compassLive = false; // trustworthy readings are arriving
    let compassDropped = false; // went quiet after working: recover only once readings are steady
    let recoveringSinceMs: number | null = null;
    let lastHeadingMs = 0;
    let arrived = false;

    const publish = () => setView({ guidance: guidance ?? null, heldUp, fix });

    const runGuide = () => {
      const { route, destination } = latest.current;
      if (!fix || !route || !destination || arrived) return;
      // A non-finite heading (no compass yet) still yields arrival and
      // off-route; the arrow just keeps its previous state.
      guidance = guide({ position: fix.position, accuracyM: fix.accuracyM, headingDeg: heading ?? NaN, route, previous: guidance });
      report("arrow", `${guidance.arrow} ${guidance.relativeAngleDeg.toFixed(0)}°${guidance.offRoute ? " off" : ""}`);

      // Arrival first: it can be true while the arrow says U_TURN (just past the store).
      if (guidance.arrived) {
        arrived = true;
        dispatch({ type: "ARRIVED" });
        publish();
        return;
      }

      const step = stepReroute(reroute, guidance.offRoute, Date.now());
      reroute = step.state;
      if (step.reroute && flags) {
        report("reroute", "asking");
        requestRoute({ origin: fix.position, destination: destination.location }, { flags, signal })
          .then((response) => {
            const ok = response.status === "OK" && Array.isArray(response.route?.path) && isUsableRoute(response.route);
            reroute = rerouteLanded(reroute, ok);
            report("reroute", ok ? "new route" : "failed, keeping route");
            if (ok) dispatch({ type: "ROUTE_UPDATED", route: response.route });
          })
          .catch(() => {
            // Never leave a reroute marked in flight, or rerouting stops for the trip.
            reroute = rerouteLanded(reroute, false);
          });
      }
      publish();
    };

    const stop = sensors.start({
      fix(next) {
        fix = next;
        live.current.fix = next;
        recordPosition(next.position, next.accuracyM);
        report("gps ±m", next.accuracyM, 0);
        runGuide();
      },
      heading(trueDeg, timeMs) {
        const now = performance.now();
        const gapMs = now - lastHeadingMs;
        lastHeadingMs = now;
        heading = filter.push(trueDeg, timeMs);
        if (!compassLive) {
          if (compassDropped) {
            // Interference can flicker readings on and off; don't flip the
            // screen (and the minimap's size) with every blip.
            if (recoveringSinceMs === null || gapMs > 500) recoveringSinceMs = now;
            if (now - recoveringSinceMs < COMPASS_RECOVER_MS) return;
          }
          compassLive = true;
          recoveringSinceMs = null;
          dispatch({ type: "COMPASS", compass: "ok" });
        }
        live.current.headingDeg = heading;
        if (timeMs - lastGuideMs >= GUIDE_MIN_INTERVAL_MS) {
          lastGuideMs = timeMs;
          report("heading", heading, 0);
          runGuide();
        }
      },
      pitch(deg) {
        const next = isHeldUp(deg, heldUp);
        report("pitch", deg, 0);
        if (next !== heldUp) {
          heldUp = next;
          publish();
        }
      },
    });

    // Motion allowed but no usable reading (no compass, or stuck uncalibrated).
    const compassTimer = setTimeout(() => {
      if (!compassLive && latest.current.compass === "pending") dispatch({ type: "COMPASS", compass: "unavailable" });
    }, COMPASS_WAIT_MS);

    // Readings that stop mid-walk (interference, recalibration) would freeze
    // the arrow on an old heading: hand over to the minimap until they return.
    const staleCheck = setInterval(() => {
      if (compassLive && performance.now() - lastHeadingMs > COMPASS_STALE_MS) {
        compassLive = false;
        compassDropped = true;
        heading = null;
        live.current.headingDeg = null;
        dispatch({ type: "COMPASS", compass: "unavailable" });
      }
    }, 1_000);

    return () => {
      stop();
      clearTimeout(compassTimer);
      clearInterval(staleCheck);
      live.current = { headingDeg: null, fix: null };
      setView(IDLE);
    };
  }, [active, sensors]);

  return { view, live };
}
