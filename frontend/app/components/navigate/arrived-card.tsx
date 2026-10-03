import type { Destination } from "shared/contract";
import styles from "./arrived-card.module.css";

export function ArrivedCard({ destination, onDone }: { destination: Destination; onDone: () => void }) {
  return (
    <div className={`glass ${styles.card}`} role="status">
      <div className={styles.text}>
        <p className={styles.title}>You found Bev</p>
        <p className={styles.place}>{destination.name}</p>
      </div>
      <button type="button" className={styles.done} onClick={onDone}>
        Done
      </button>
    </div>
  );
}
