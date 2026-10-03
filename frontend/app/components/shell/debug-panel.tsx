"use client";

import { useState, type Dispatch } from "react";
import { findBevFound } from "shared/fixtures";
import type { AppEvent, AppState } from "../../lib/app-state";
import styles from "./debug-panel.module.css";

// ?debug=1 only, lazy-loaded so it never ships in the main bundle. Jumps
// straight to any screen or edge state with the fixture trip.
const trip =
  findBevFound.status === "FOUND" ? { destination: findBevFound.destination, route: findBevFound.route } : null;

const JUMPS: [string, AppState][] = trip
  ? [
      ["home", { screen: "home" }],
      ["finding", { screen: "finding", attempt: -1 }],
      ["found", { screen: "found", ...trip }],
      ["navigate", { screen: "navigating", ...trip, camera: "denied", compass: "unavailable" }],
      ["arrived", { screen: "arrived", ...trip }],
      ["no location", { screen: "notice", notice: "location-denied" }],
      ["precise off", { screen: "notice", notice: "precise-off" }],
      ["no fix", { screen: "notice", notice: "no-fix" }],
      ["none nearby", { screen: "notice", notice: "none-nearby" }],
      ["network", { screen: "notice", notice: "network" }],
    ]
  : [];

export function DebugPanel({ dispatch }: { dispatch: Dispatch<AppEvent> }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.panel}>
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
