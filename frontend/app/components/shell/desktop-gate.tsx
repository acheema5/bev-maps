import styles from "./shell.module.css";

// VISION → Edge states: "Opened on a computer". ?sim=1 and ?debug=1 bypass it.
export function DesktopGate() {
  return <main className={styles.center}>Bev Maps lives on your phone.</main>;
}
