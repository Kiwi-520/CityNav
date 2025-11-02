"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiMap, FiDownload } from "react-icons/fi";
import styles from "./FeatureNavigation.module.css";

interface FeatureTab {
  href: string;
  icon: React.ElementType;
  label: string;
  description: string;
}

const featureTabs: FeatureTab[] = [
  {
    href: "/essential-maps",
    icon: FiMap,
    label: "Essential Maps",
    description: "Live POI discovery",
  },
  {
    href: "/offline-onboarding",
    icon: FiDownload,
    label: "Offline Maps",
    description: "Offline data management",
  },
];

export default function FeatureNavigation() {
  const pathname = usePathname();

  return (
    <div className={styles.featureNav}>
      {featureTabs.map((tab) => {
        const IconComponent = tab.icon;
        const isActive = pathname === tab.href;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`${styles.featureTab} ${isActive ? styles.active : ""}`}
          >
            <IconComponent size={20} />
            <div className={styles.tabContent}>
              <span className={styles.tabLabel}>{tab.label}</span>
              <span className={styles.tabDescription}>{tab.description}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
