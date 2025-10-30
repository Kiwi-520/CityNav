"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FiHome,
  FiSearch,
  FiNavigation,
  FiMap,
  FiDownload,
} from "react-icons/fi";

export default function BottomNavigation() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", icon: FiHome, label: "Home" },
    { href: "/search-discovery", icon: FiSearch, label: "Search" },
    { href: "/route-options", icon: FiNavigation, label: "Routes" },
    { href: "/essential-maps", icon: FiMap, label: "Maps" },
    { href: "/offline-onboarding", icon: FiDownload, label: "Offline" },
  ];

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(10px)",
        borderTop: "1px solid rgba(0, 0, 0, 0.1)",
        padding: "12px 0",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
          maxWidth: "600px",
          margin: "0 auto",
        }}
      >
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
                textDecoration: "none",
                color: isActive
                  ? "var(--primary)"
                  : "var(--on-surface-variant)",
                fontSize: "12px",
                fontWeight: isActive ? "600" : "400",
                transition: "all 0.3s ease",
                padding: "8px",
                borderRadius: "8px",
                minWidth: "60px",
              }}
            >
              <IconComponent
                size={20}
                style={{
                  color: isActive
                    ? "var(--primary)"
                    : "var(--on-surface-variant)",
                }}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
