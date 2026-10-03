import styles from "./shell.module.css";

export function RotateOverlay() {
  return (
    <div className={styles.rotate} aria-live="polite">
      Turn your phone upright
    </div>
  );
}
