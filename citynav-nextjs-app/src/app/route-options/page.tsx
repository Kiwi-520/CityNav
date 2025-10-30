"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  FiMapPin,
  FiNavigation,
  FiClock,
  FiZap,
  FiDollarSign,
} from "react-icons/fi";
import Link from "next/link";

interface RouteOption {
  id: string;
  type: "fastest" | "shortest" | "eco" | "public";
  name: string;
  duration: string;
  distance: string;
  cost?: string;
  description: string;
  icon: any;
  color: string;
}

function RouteOptionsContent() {
  const searchParams = useSearchParams();
  const [destination, setDestination] = useState("");
  const [startLocation, setStartLocation] = useState("Current Location");
  const [routes, setRoutes] = useState<RouteOption[]>([]);

  useEffect(() => {
    const dest = searchParams.get("destination");
    if (dest) {
      setDestination(decodeURIComponent(dest));
    }

    // Mock route data
    setRoutes([
      {
        id: "fastest",
        type: "fastest",
        name: "Fastest Route",
        duration: "12 min",
        distance: "5.2 km",
        description: "Via Main Road - Light traffic",
        icon: FiZap,
        color: "#ef4444",
      },
      {
        id: "shortest",
        type: "shortest",
        name: "Shortest Route",
        duration: "15 min",
        distance: "4.8 km",
        description: "Via Inner Roads - Some congestion",
        icon: FiNavigation,
        color: "#3b82f6",
      },
      {
        id: "eco",
        type: "eco",
        name: "Eco-Friendly",
        duration: "18 min",
        distance: "5.5 km",
        description: "Avoids heavy traffic areas",
        icon: FiMapPin,
        color: "#22c55e",
      },
      {
        id: "public",
        type: "public",
        name: "Public Transport",
        duration: "25 min",
        distance: "6.1 km",
        cost: "₹15",
        description: "Bus + 2 min walk",
        icon: FiDollarSign,
        color: "#f59e0b",
      },
    ]);
  }, [searchParams]);

  const handleStartNavigation = (route: RouteOption) => {
    // Here you would typically integrate with a mapping service
    alert(
      `Starting ${route.name} navigation to ${destination || "destination"}`
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white",
        padding: "20px",
      }}
    >
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "30px" }}>
          <Link
            href="/search-discovery"
            style={{ color: "white", textDecoration: "none", fontSize: "14px" }}
          >
            ← Back to Search
          </Link>
          <h1 style={{ fontSize: "2rem", fontWeight: "700", margin: "10px 0" }}>
            Route Options
          </h1>
        </div>

        {/* Route Details */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.1)",
            borderRadius: "16px",
            padding: "24px",
            marginBottom: "30px",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
          }}
        >
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  background: "#22c55e",
                  borderRadius: "50%",
                }}
              />
              <span style={{ opacity: 0.8 }}>From:</span>
              <strong>{startLocation}</strong>
            </div>

            <div
              style={{
                width: "2px",
                height: "20px",
                background: "rgba(255, 255, 255, 0.3)",
                marginLeft: "5px",
              }}
            />

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  background: "#ef4444",
                  borderRadius: "50%",
                }}
              />
              <span style={{ opacity: 0.8 }}>To:</span>
              <strong>{destination || "Selected Destination"}</strong>
            </div>
          </div>
        </div>

        {/* Route Options */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {routes.map((route) => {
            const IconComponent = route.icon;
            return (
              <div
                key={route.id}
                style={{
                  background: "rgba(255, 255, 255, 0.1)",
                  borderRadius: "16px",
                  padding: "24px",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  backdropFilter: "blur(10px)",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.background =
                    "rgba(255, 255, 255, 0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                    }}
                  >
                    <div
                      style={{
                        background: `${route.color}20`,
                        padding: "12px",
                        borderRadius: "12px",
                        border: `2px solid ${route.color}`,
                      }}
                    >
                      <IconComponent size={24} color={route.color} />
                    </div>

                    <div>
                      <h3
                        style={{
                          margin: "0 0 4px 0",
                          fontSize: "1.3rem",
                          fontWeight: "600",
                        }}
                      >
                        {route.name}
                      </h3>
                      <p
                        style={{
                          margin: "0 0 8px 0",
                          opacity: 0.7,
                          fontSize: "0.9rem",
                        }}
                      >
                        {route.description}
                      </p>

                      <div
                        style={{
                          display: "flex",
                          gap: "16px",
                          alignItems: "center",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <FiClock size={16} />
                          <span
                            style={{ fontSize: "0.9rem", fontWeight: "600" }}
                          >
                            {route.duration}
                          </span>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <FiNavigation size={16} />
                          <span style={{ fontSize: "0.9rem" }}>
                            {route.distance}
                          </span>
                        </div>

                        {route.cost && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <FiDollarSign size={16} />
                            <span
                              style={{ fontSize: "0.9rem", fontWeight: "600" }}
                            >
                              {route.cost}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleStartNavigation(route)}
                    style={{
                      background: route.color,
                      color: "white",
                      border: "none",
                      padding: "12px 24px",
                      borderRadius: "12px",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      fontWeight: "600",
                      transition: "all 0.3s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "scale(1.05)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  >
                    Start
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Additional Options */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            borderRadius: "16px",
            padding: "24px",
            marginTop: "30px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <h3 style={{ margin: "0 0 16px 0", color: "#fbbf24" }}>
            Additional Options
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
            }}
          >
            <Link
              href="/offline-onboarding"
              style={{
                background: "rgba(255, 255, 255, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "12px",
                padding: "16px",
                textDecoration: "none",
                color: "white",
                textAlign: "center",
                transition: "all 0.3s ease",
              }}
            >
              <strong>Offline Maps</strong>
              <p
                style={{
                  margin: "8px 0 0 0",
                  opacity: 0.7,
                  fontSize: "0.9rem",
                }}
              >
                Download for offline use
              </p>
            </Link>

            <button
              style={{
                background: "rgba(255, 255, 255, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "12px",
                padding: "16px",
                color: "white",
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
              onClick={() => alert("Traffic updates feature coming soon!")}
            >
              <strong>Live Traffic</strong>
              <p
                style={{
                  margin: "8px 0 0 0",
                  opacity: 0.7,
                  fontSize: "0.9rem",
                }}
              >
                Real-time updates
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RouteOptionsPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
          }}
        >
          <div>Loading route options...</div>
        </div>
      }
    >
      <RouteOptionsContent />
    </Suspense>
  );
}
