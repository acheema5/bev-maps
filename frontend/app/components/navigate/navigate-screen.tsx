"use client";

import type { AppState } from "../../lib/app-state";
import { CameraView } from "./camera-view";
import styles from "./navigate-screen.module.css";

type Props = {
  state: Extract<AppState, { screen: "navigating" | "arrived" }>;
  stream: MediaStream | null;
  onCameraLost: () => void;
  onExit: () => void;
};

// The camera view (VISION → 4. Navigate). The guide, minimap, and arrival
// card arrive in the navigate and minimap PRs. Without a camera, the
// background stays dark and navigation carries on (VISION → Edge states).
export function NavigateScreen({ stream, onCameraLost, onExit }: Props) {
  return (
    <main className={styles.screen}>
      {stream && <CameraView stream={stream} onLost={onCameraLost} />}
      <button type="button" className={`glass-dark ${styles.exit}`} onClick={onExit} aria-label="End navigation">
        <svg viewBox="0 0 14 14" aria-hidden>
          <path d="M1.5 1.5l11 11M12.5 1.5l-11 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </main>
  );
}
