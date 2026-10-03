"use client";

import { useLayoutEffect, useRef, useState } from "react";
import styles from "./glass-button.module.css";

export type ButtonPhase = "find" | "finding" | "enable" | "retry";

const LABELS: Record<ButtonPhase, string> = {
  find: "Find Bev",
  finding: "Finding Bev",
  enable: "Enable camera",
  retry: "Try again",
};

const PHASES = Object.keys(LABELS) as ButtonPhase[];
const PADDING_X = 34;

type Props = {
  phase: ButtonPhase;
  busy?: boolean; // ignore taps (a search or permission prompt is in flight)
  onPress: () => void;
};

export function GlassButton({ phase, busy = false, onPress }: Props) {
  const measureRef = useRef<HTMLSpanElement>(null);
  const [widths, setWidths] = useState<Record<ButtonPhase, number> | null>(null);

  // System font, nothing to load: measure every label once, before paint.
  useLayoutEffect(() => {
    const spans = measureRef.current?.children;
    if (!spans) return;
    const measured = {} as Record<ButtonPhase, number>;
    PHASES.forEach((p, i) => (measured[p] = Math.ceil((spans[i] as HTMLElement).getBoundingClientRect().width)));
    setWidths(measured);
  }, []);

  const inert = busy || phase === "finding";

  return (
    <button
      type="button"
      className={`glass ${styles.button}`}
      style={widths ? { width: widths[phase] + PADDING_X * 2 } : undefined}
      aria-disabled={inert}
      aria-live="polite"
      onClick={() => {
        if (!inert) onPress();
      }}
    >
      {PHASES.map((p) => (
        <span key={p} className={styles.label} data-active={p === phase ? "" : undefined} aria-hidden={p !== phase}>
          <span className={p === "finding" ? styles.shimmer : undefined}>{LABELS[p]}</span>
        </span>
      ))}
      <span ref={measureRef} className={styles.measure} aria-hidden>
        {PHASES.map((p) => (
          <span key={p}>{LABELS[p]}</span>
        ))}
      </span>
    </button>
  );
}
