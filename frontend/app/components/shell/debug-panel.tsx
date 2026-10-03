"use client";

import { useEffect, useState, type Dispatch } from "react";
import { findBevFound } from "shared/fixtures";
import type { AppEvent, AppState } from "../../lib/app-state";
import { debugKnobs, debugReadout } from "../../lib/debug";
import styles from "./debug-panel.module.css";

// ?debug=1 only, lazy-loaded so it never ships in the main bundle.
// - Jumps straight to any screen or edge state with the fixture trip.
// - Shows raw sensor readings: the tool for checking the compass on a real
//   iPhone (magnetic vs. true heading, accuracy, declination, pitch, GPS).
// - In ?sim, a heading offset rotates the simulated phone to demo turns.
const trip =
  findBevFound.status === "FOUND" ? { destination: findBevFound.destination, route: findBevFound.route } : null;

const JUMPS: [string, AppState][] = trip
  ? [
      ["home", { screen: "home" }],
      ["finding", { screen: "finding", attempt: -1 }],
      ["found", { screen: "found", ...trip }],
      ["navigate", { screen: "navigating", ...trip, camera: "denied", compass: "unavailable" }],
      ["arrived", { screen: "arrived", ...trip, compass: "ok" }],
      ["no location", { screen: "notice", notice: "location-denied" }],
      ["precise off", { screen: "notice", notice: "precise-off" }],
      ["no fix", { screen: "notice", notice: "no-fix" }],
      ["none nearby", { screen: "notice", notice: "none-nearby" }],
      ["network", { screen: "notice", notice: "network" }],
    ]
  : [];

export function DebugPanel({ dispatch, sim }: { dispatch: Dispatch<AppEvent>; sim: boolean }) {
  const [open, setOpen] = useState(false);
  const [readout, setReadout] = useState<[string, string][]>([]);
  const [offset, setOffset] = useState(debugKnobs.headingOffsetDeg);

  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => setReadout(Object.entries(debugReadout)), 250);
    return () => clearInterval(timer);
  }, [open]);

  return (
    <div className={styles.panel}>
      {open && readout.length > 0 && (
        <dl className={styles.readout}>
          {readout.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {open && sim && (
        <label className={styles.slider}>
          turn phone {offset}°
          <input
            type="range"
            min={-180}
            max={180}
            step={5}
            value={offset}
            onChange={(e) => {
              const deg = Number(e.target.value);
              debugKnobs.headingOffsetDeg = deg;
              setOffset(deg);
            }}
          />
        </label>
      )}
      {open && (
        <div className={styles.jumps}>
          {JUMPS.map(([label, state]) => (
            <button key={label} type="button" className={styles.jump} onClick={() => dispatch({ type: "DEBUG_SET", state })}>
              {label}
            </button>
          ))}
        </div>
      )}
      <button type="button" className={styles.toggle} onClick={() => setOpen((o) => !o)}>
        {open ? "close" : "debug"}
      </button>
    </div>
  );
}
