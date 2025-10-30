"use client";

import Link from "next/link";
import { FiSearch, FiNavigation, FiMap, FiDownload } from "react-icons/fi";
import styles from "../styles/components.module.css";

export default function QuickActions() {
  return (
    <div className={styles.quickActions}>
      <Link href="/search-discovery" className={styles.actionButton}>
        <button className="btn btn-icon btn-large">
          <FiSearch size={24} />
        </button>
        <span className={styles.actionLabel}>Find Place</span>
      </Link>

      <Link href="/route-options" className={styles.actionButton}>
        <button className="btn btn-icon btn-large">
          <FiNavigation size={24} />
        </button>
        <span className={styles.actionLabel}>Plan Route</span>
      </Link>

      <Link href="/essential-maps" className={styles.actionButton}>
        <button className="btn btn-icon btn-large">
          <FiMap size={24} />
        </button>
        <span className={styles.actionLabel}>Essentials</span>
      </Link>

      <Link href="/offline-onboarding" className={styles.actionButton}>
        <button className="btn btn-icon btn-large">
          <FiDownload size={24} />
        </button>
        <span className={styles.actionLabel}>Offline Maps</span>
      </Link>
    </div>
  );
}
