"use client";

import type { AppState } from "../../lib/app-state";
import type { NavView } from "../../lib/navigation/use-navigation";
import { ArrivedCard } from "./arrived-card";
import { CameraView } from "./camera-view";
import { Guide } from "./guide";
import styles from "./navigate-screen.module.css";

type Props = {
  state: Extract<AppState, { screen: "navigating" | "arrived" }>;
  stream: MediaStream | null;
  view: NavView;
  onCameraLost: () => void;
  onExit: () => void;
};

// The camera view (VISION → 4. Navigate): live camera, the guide, and the way
// out. Without a camera the background stays dark and navigation carries on;
// without a compass the guide hides and the minimap takes over (Edge states).
export function NavigateScreen({ state, stream, view, onCameraLost, onExit }: Props) {
  const arrived = state.screen === "arrived";
  const compass = state.screen === "navigating" ? state.compass : "ok";
  const steering = compass === "ok" && view.guidance !== null;
  const holdUp = steering && !view.heldUp && !arrived;

  return (
    <main className={styles.screen}>
      {stream && <CameraView stream={stream} onLost={onCameraLost} />}

      {view.guidance && (
        <Guide
          arrow={view.guidance.arrow}
          relativeAngleDeg={view.guidance.relativeAngleDeg}
          // Held flat, the compass measures the top edge, not the camera.
          hidden={!steering || !view.heldUp || arrived}
        />
      )}

      {holdUp && <p className={`glass-dark ${styles.pill} ${styles.holdUp}`}>Hold your phone up</p>}
      {compass === "denied" && !arrived && (
        <p className={`glass-dark ${styles.pill} ${styles.compassHint}`}>Reopen Bev Maps to allow compass</p>
      )}

      {arrived ? (
        <ArrivedCard destination={state.destination} onDone={onExit} />
      ) : (
        <button type="button" className={`glass-dark ${styles.exit}`} onClick={onExit} aria-label="End navigation">
          <svg viewBox="0 0 14 14" aria-hidden>
            <path d="M1.5 1.5l11 11M12.5 1.5l-11 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </main>
  );
}
