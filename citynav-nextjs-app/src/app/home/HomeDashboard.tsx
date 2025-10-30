"use client";

import { useEffect, useState } from "react";
import {
  FiSun,
  FiMapPin,
  FiClock,
  FiWifi,
  FiWifiOff,
  FiNavigation,
} from "react-icons/fi";
import QuickActions from "../../components/QuickActions";
import PageHeader from "../../components/PageHeader";
import { useLocation } from "@/hooks/useLiveLocation";

export default function HomeDashboard() {
  const [currentTime, setCurrentTime] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const { location, error, loading, requestLocation } = useLocation();

  useEffect(() => {
    // Update clock
    const updateTime = () => {
      const now = new Date();
      const timeString = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      setCurrentTime(timeString);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);

    // Check online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, var(--primary) 0%, var(--tertiary) 100%)",
      }}
    >
      <PageHeader title="CityNav" showMenu />

      <div style={{ padding: "20px" }}>
        {/* Welcome Card */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.95)",
            borderRadius: "20px",
            padding: "24px",
            marginBottom: "24px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <div>
              <h2
                style={{
                  margin: "0 0 8px 0",
                  fontSize: "1.5rem",
                  fontWeight: "700",
                  color: "var(--on-surface)",
                }}
              >
                Welcome to {location ? location.city : "CityNav"}
              </h2>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "var(--on-surface-variant)",
                  fontSize: "0.9rem",
                }}
              >
                <FiClock size={16} />
                <span>Today, {currentTime}</span>
              </div>

              {location && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    color: "var(--primary)",
                    fontSize: "0.85rem",
                    marginTop: "4px",
                  }}
                >
                  <FiMapPin size={14} />
                  <span>
                    {location.city}, {location.country}
                  </span>
                </div>
              )}

              {!location && !loading && (
                <button
                  onClick={requestLocation}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "var(--primary)",
                    color: "white",
                    border: "none",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    marginTop: "8px",
                  }}
                >
                  <FiNavigation size={14} />
                  <span>Enable Location</span>
                </button>
              )}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <FiSun size={32} color="var(--warning)" />
              <span
                style={{
                  fontSize: "1.2rem",
                  fontWeight: "600",
                  color: "var(--on-surface)",
                }}
              >
                24°C
              </span>
            </div>
          </div>

          {/* Status Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              padding: "12px 16px",
              background: "rgba(46, 125, 94, 0.1)",
              borderRadius: "12px",
              border: "1px solid rgba(46, 125, 94, 0.2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <FiMapPin size={16} color="var(--primary)" />
              <span style={{ fontSize: "0.9rem", color: "var(--on-surface)" }}>
                Location Services Active
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginLeft: "auto",
              }}
            >
              {isOnline ? (
                <>
                  <FiWifi size={16} color="var(--success)" />
                  <span style={{ fontSize: "0.9rem", color: "var(--success)" }}>
                    Online
                  </span>
                </>
              ) : (
                <>
                  <FiWifiOff size={16} color="var(--error)" />
                  <span style={{ fontSize: "0.9rem", color: "var(--error)" }}>
                    Offline
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.95)",
            borderRadius: "20px",
            padding: "24px",
            marginBottom: "24px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
            backdropFilter: "blur(10px)",
          }}
        >
          <h3
            style={{
              margin: "0 0 20px 0",
              fontSize: "1.2rem",
              fontWeight: "600",
              color: "var(--on-surface)",
            }}
          >
            Quick Actions
          </h3>
          <QuickActions />
        </div>

        {/* Tips Card */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.95)",
            borderRadius: "20px",
            padding: "24px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
            backdropFilter: "blur(10px)",
          }}
        >
          <h3
            style={{
              margin: "0 0 16px 0",
              fontSize: "1.2rem",
              fontWeight: "600",
              color: "var(--on-surface)",
            }}
          >
            Daily Tip
          </h3>
          <div
            style={{
              background: "var(--primary-container)",
              padding: "16px",
              borderRadius: "12px",
              border: "1px solid var(--primary)",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "var(--on-primary-container)",
                fontSize: "0.9rem",
                lineHeight: "1.5",
              }}
            >
              💡 Download offline maps before traveling to avoid data charges
              and ensure navigation even without internet connectivity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
