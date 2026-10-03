"use client";

import type { AppState } from "../../lib/app-state";
import styles from "./navigate-screen.module.css";

type Props = {
  state: Extract<AppState, { screen: "navigating" | "arrived" }>;
  onExit: () => void;
};

// The camera view (VISION → 4. Navigate). The camera, guide, minimap, and
// arrival card arrive in the navigate and minimap PRs; for now this is the
// dark "camera denied" background and the way out.
export function NavigateScreen({ onExit }: Props) {
  return (
    <main className={styles.screen}>
      <button type="button" className={`glass-dark ${styles.exit}`} onClick={onExit} aria-label="End navigation">
        <svg viewBox="0 0 14 14" aria-hidden>
          <path d="M1.5 1.5l11 11M12.5 1.5l-11 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </main>
  );
}
