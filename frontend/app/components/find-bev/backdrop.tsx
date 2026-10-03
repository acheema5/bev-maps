import styles from "./backdrop.module.css";

export function Backdrop() {
  return (
    <div className={styles.backdrop} aria-hidden>
      <div className={`${styles.light} ${styles.one}`} />
      <div className={`${styles.light} ${styles.two}`} />
      <div className={`${styles.light} ${styles.three}`} />
    </div>
  );
}
