import styles from "./shell.module.css";

// VISION → Edge states: opened in a Safari tab, not installed.
export function InstallHint() {
  return (
    <p className={`glass ${styles.installHint}`}>
      Tap
      <svg className={styles.shareIcon} viewBox="0 0 15 18" aria-label="Share" role="img">
        <path
          d="M7.5 1v10M4 4.5 7.5 1 11 4.5M4.5 7.5H3a1.5 1.5 0 0 0-1.5 1.5v6.5A1.5 1.5 0 0 0 3 17h9a1.5 1.5 0 0 0 1.5-1.5V9A1.5 1.5 0 0 0 12 7.5h-1.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      then Add to Home Screen
    </p>
  );
}
