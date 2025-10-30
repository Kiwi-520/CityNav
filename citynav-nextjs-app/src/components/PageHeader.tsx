"use client";

import Link from "next/link";
import { FiArrowLeft, FiMenu, FiSettings } from "react-icons/fi";

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
  backHref?: string;
  showMenu?: boolean;
  onMenuClick?: () => void;
}

export default function PageHeader({
  title,
  showBack = false,
  backHref = "/",
  showMenu = false,
  onMenuClick,
}: PageHeaderProps) {
  return (
    <header
      style={{
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(0, 0, 0, 0.1)",
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {showBack && (
          <Link
            href={backHref}
            style={{
              color: "var(--primary)",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              padding: "8px",
            }}
          >
            <FiArrowLeft size={20} />
          </Link>
        )}
        <h1
          style={{
            margin: 0,
            fontSize: "1.5rem",
            fontWeight: "700",
            color: "var(--on-surface)",
          }}
        >
          {title}
        </h1>
      </div>

      {showMenu && (
        <button
          onClick={onMenuClick}
          style={{
            background: "transparent",
            border: "none",
            padding: "8px",
            color: "var(--on-surface)",
            cursor: "pointer",
          }}
        >
          <FiSettings size={20} />
        </button>
      )}
    </header>
  );
}
