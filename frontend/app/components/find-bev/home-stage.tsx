"use client";

import type { AppState } from "../../lib/app-state";
import { foundLine } from "../../lib/app-state";
import { NOTICE_COPY } from "./copy";
import { GlassButton, type ButtonPhase } from "./glass-button";
import styles from "./home-stage.module.css";

export type HomeScreen = Extract<AppState, { screen: "home" | "finding" | "found" | "starting" | "notice" }>;

type Props = {
  state: HomeScreen;
  onFind: () => void;
  onEnableCamera: () => void;
};

// Home, Finding, Found, and every edge-state notice: one glass button that
// morphs, with at most one quiet line above it (VISION → The flow).
export function HomeStage({ state, onFind, onEnableCamera }: Props) {
  const phase = phaseFor(state);
  const onPress = phase === "enable" ? onEnableCamera : onFind;

  return (
    <main className={styles.stage}>
      <div className={styles.anchor}>
        <Message state={state} />
        <GlassButton phase={phase} busy={state.screen === "starting"} onPress={onPress} />
      </div>
    </main>
  );
}

function Message({ state }: { state: HomeScreen }) {
  if (state.screen === "found" || state.screen === "starting") {
    return (
      <p key="found" className={`${styles.message} ${styles.quiet}`}>
        {foundLine(state.destination, state.route)}
      </p>
    );
  }
  if (state.screen === "notice") {
    const copy = NOTICE_COPY[state.notice];
    return (
      <div key={state.notice} className={styles.message} role="status">
        <p className={styles.line}>{copy.line}</p>
        {copy.hint && <p className={styles.hint}>{copy.hint}</p>}
      </div>
    );
  }
  return null;
}

function phaseFor(state: HomeScreen): ButtonPhase {
  switch (state.screen) {
    case "home":
      return "find";
    case "finding":
      return "finding";
    case "found":
    case "starting":
      return "enable";
    case "notice":
      return "retry";
  }
}
