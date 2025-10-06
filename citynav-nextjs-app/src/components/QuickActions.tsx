import styles from "../styles/components.module.css";

export default function QuickActions() {
  return (
    <div className={styles.quickActions}>
      <a href="/search-discovery" className={styles.actionButton}>
        <button className="btn btn-icon btn-large">
          <span className="material-icons">search</span>
        </button>
        <span className={styles.actionLabel}>Find Place</span>
      </a>

      <a href="/route-options" className={styles.actionButton}>
        <button className="btn btn-icon btn-large">
          <span className="material-icons">directions</span>
        </button>
        <span className={styles.actionLabel}>Plan Route</span>
      </a>

      <a href="/interactive-map" className={styles.actionButton}>
        <button className="btn btn-icon btn-large">
          <span className="material-icons">map</span>
        </button>
        <span className={styles.actionLabel}>Essentials</span>
      </a>
    </div>
  );
}
