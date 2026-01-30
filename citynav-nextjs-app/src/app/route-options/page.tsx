"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  FiMapPin,
  FiNavigation,
  FiClock,
  FiZap,
  FiDollarSign,
  FiTrendingUp,
  FiUsers,
  FiShield,
} from "react-icons/fi";
import Link from "next/link";
import { multimodalEngine } from "@/services/multimodal.service";
import { enhancedMultimodalEngine } from "@/services/enhanced-multimodal.service";
import { MultimodalRoute, RouteRequest, RouteSegment } from "@/types/multimodal";

// Helper to get mode icon and color
const getModeDisplay = (mode: string) => {
  const displays: Record<string, { icon: string; color: string; label: string }> = {
    walk: { icon: '🚶', color: '#22c55e', label: 'Walk' },
    bus: { icon: '🚌', color: '#f59e0b', label: 'Bus' },
    metro: { icon: '🚇', color: '#3b82f6', label: 'Metro' },
    auto: { icon: '🛺', color: '#eab308', label: 'Auto' },
    cab: { icon: '🚗', color: '#8b5cf6', label: 'Cab' },
  };
  return displays[mode] || displays.walk;
};

// Helper to format time
const formatTime = (minutes: number): string => {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${mins}m`;
};

// Helper to format distance
const formatDistance = (meters: number): string => {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

function RouteOptionsContent() {
  const searchParams = useSearchParams();
  const [destination, setDestination] = useState("");
  const [startLocation, setStartLocation] = useState("Current Location");
  const [startLocationName, setStartLocationName] = useState("Your Location");
  const [destinationName, setDestinationName] = useState("Destination");
  const [routes, setRoutes] = useState<MultimodalRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceCoords, setSourceCoords] = useState({ lat: 28.5355, lng: 77.3910 }); // Default: Delhi
  const [destCoords, setDestCoords] = useState({ lat: 28.6139, lng: 77.2090 }); // Default: Connaught Place

  // Fetch location name from coordinates using reverse geocoding
  const fetchLocationName = async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&addressdetails=1&zoom=18`,
        {
          headers: {
            'User-Agent': 'CityNav/1.0'
          }
        }
      );
      if (!response.ok) return "Unknown Location";
      
      const data = await response.json();
      const addr = data.address || {};
      
      // Build location name from address components
      const parts: string[] = [];
      if (addr.neighbourhood) parts.push(addr.neighbourhood);
      else if (addr.suburb) parts.push(addr.suburb);
      else if (addr.locality) parts.push(addr.locality);
      
      if (addr.city || addr.town) parts.push(addr.city || addr.town);
      else if (addr.state) parts.push(addr.state);
      
      return parts.length > 0 ? parts.join(', ') : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (error) {
      console.error('Error fetching location name:', error);
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  };

  useEffect(() => {
    const calculateRoutes = async () => {
      setLoading(true);
      
      const dest = searchParams.get("destination");
      if (dest) {
        setDestination(decodeURIComponent(dest));
      }

      // Get coordinates from URL params or use current location
      const sourceLat = parseFloat(searchParams.get("sourceLat") || "28.5355");
      const sourceLng = parseFloat(searchParams.get("sourceLng") || "77.3910");
      const destLat = parseFloat(searchParams.get("destLat") || "28.6139");
      const destLng = parseFloat(searchParams.get("destLng") || "77.2090");

      setSourceCoords({ lat: sourceLat, lng: sourceLng });
      setDestCoords({ lat: destLat, lng: destLng });

      // Fetch location names
      const [sourceName, destName] = await Promise.all([
        fetchLocationName(sourceLat, sourceLng),
        dest ? Promise.resolve(dest) : fetchLocationName(destLat, destLng)
      ]);
      
      setStartLocationName(sourceName);
      setDestinationName(destName);

      // Create route request
      const request: RouteRequest = {
        source: {
          lat: sourceLat,
          lng: sourceLng,
          name: sourceName,
        },
        destination: {
          lat: destLat,
          lng: destLng,
          name: destName,
        },
        preferences: {
          prioritize: 'time', // Can be made dynamic based on user choice
          maxWalkingDistance: 1000,
        },
      };

      try {
        // Calculate routes using ENHANCED multimodal engine with named stops
        const response = await enhancedMultimodalEngine.calculateRoutesWithStops(request);
        setRoutes(response.routes);
      } catch (error) {
        console.error('Error calculating routes:', error);
        // Fallback to basic engine
        try {
          const fallbackResponse = await multimodalEngine.calculateRoutes(request);
          setRoutes(fallbackResponse.routes);
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
          setRoutes([]);
        }
      } finally {
        setLoading(false);
      }
    };

    calculateRoutes();
  }, [searchParams, startLocation]);

  const handleStartNavigation = (route: MultimodalRoute) => {
    // Here you would typically integrate with a mapping service
    alert(
      `Starting ${route.name} navigation to ${destination || "destination"}\n\n` +
      `Total Time: ${formatTime(route.totalDuration)}\n` +
      `Total Cost: ₹${route.totalCost}\n` +
      `Modes: ${route.modesUsed.map(m => getModeDisplay(m).label).join(' → ')}`
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white",
        padding: "20px",
        backgroundAttachment: "fixed",
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
              <strong>{startLocationName}</strong>
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
              <strong>{destinationName}</strong>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{ 
            background: "rgba(255, 255, 255, 0.1)",
            borderRadius: "16px",
            padding: "40px",
            textAlign: "center",
            backdropFilter: "blur(10px)",
          }}>
            <div style={{ fontSize: "2rem", marginBottom: "16px" }}>🔄</div>
            <p>Calculating best multimodal routes...</p>
            <p style={{ fontSize: "0.875rem", opacity: 0.8, marginTop: "8px" }}>
              ⏱️ Estimated time: 3-5 seconds
            </p>
          </div>
        )}

        {/* Quick Comparison Summary */}
        {!loading && routes.length > 0 && (
          <>
            <div style={{
              background: "rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "20px 24px",
              marginBottom: "24px",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              backdropFilter: "blur(10px)",
            }}>
              <h3 style={{ 
                margin: "0 0 16px 0", 
                fontSize: "1.1rem",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <span>📊</span>
                Quick Comparison
              </h3>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "16px",
              }}>
                {/* Fastest Route */}
                {(() => {
                  const fastestRoute = [...routes].sort((a, b) => a.totalDuration - b.totalDuration)[0];
                  const fastestMode = getModeDisplay(fastestRoute.modesUsed[0]);
                  return (
                    <div style={{
                      background: "rgba(34, 197, 94, 0.15)",
                      border: "1px solid rgba(34, 197, 94, 0.3)",
                      borderRadius: "12px",
                      padding: "12px",
                    }}>
                      <div style={{ fontSize: "0.75rem", opacity: 0.8, marginBottom: "4px" }}>⚡ FASTEST</div>
                      <div style={{ fontSize: "1.3rem", fontWeight: "700", marginBottom: "4px" }}>
                        {formatTime(fastestRoute.totalDuration)}
                      </div>
                      <div style={{ fontSize: "0.8rem", opacity: 0.9 }}>
                        {fastestMode.icon} {fastestRoute.name}
                      </div>
                      <div style={{ fontSize: "0.75rem", marginTop: "4px", color: "#fbbf24" }}>
                        ₹{fastestRoute.totalCost}
                      </div>
                    </div>
                  );
                })()}

                {/* Cheapest Route */}
                {(() => {
                  const cheapestRoute = [...routes].sort((a, b) => a.totalCost - b.totalCost)[0];
                  const cheapestMode = getModeDisplay(cheapestRoute.modesUsed[0]);
                  return (
                    <div style={{
                      background: "rgba(251, 191, 36, 0.15)",
                      border: "1px solid rgba(251, 191, 36, 0.3)",
                      borderRadius: "12px",
                      padding: "12px",
                    }}>
                      <div style={{ fontSize: "0.75rem", opacity: 0.8, marginBottom: "4px" }}>💰 CHEAPEST</div>
                      <div style={{ fontSize: "1.3rem", fontWeight: "700", marginBottom: "4px", color: "#fbbf24" }}>
                        ₹{cheapestRoute.totalCost}
                      </div>
                      <div style={{ fontSize: "0.8rem", opacity: 0.9 }}>
                        {cheapestMode.icon} {cheapestRoute.name}
                      </div>
                      <div style={{ fontSize: "0.75rem", marginTop: "4px" }}>
                        ⏱️ {formatTime(cheapestRoute.totalDuration)}
                      </div>
                    </div>
                  );
                })()}

                {/* Most Balanced Route */}
                {(() => {
                  const balancedRoute = routes.find(r => r.type === 'balanced') || routes[0];
                  const balancedMode = getModeDisplay(balancedRoute.modesUsed[0]);
                  return (
                    <div style={{
                      background: "rgba(139, 92, 246, 0.15)",
                      border: "1px solid rgba(139, 92, 246, 0.3)",
                      borderRadius: "12px",
                      padding: "12px",
                    }}>
                      <div style={{ fontSize: "0.75rem", opacity: 0.8, marginBottom: "4px" }}>⚖️ BALANCED</div>
                      <div style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "4px" }}>
                        {formatTime(balancedRoute.totalDuration)} • ₹{balancedRoute.totalCost}
                      </div>
                      <div style={{ fontSize: "0.8rem", opacity: 0.9 }}>
                        {balancedMode.icon} {balancedRoute.name}
                      </div>
                      <div style={{ fontSize: "0.75rem", marginTop: "4px", opacity: 0.7 }}>
                        {balancedRoute.carbonFootprint && `🌿 ${balancedRoute.carbonFootprint} carbon`}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Comparison Table */}
            <div style={{
              background: "rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "20px 24px",
              marginBottom: "24px",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              backdropFilter: "blur(10px)",
              overflowX: "auto",
            }}>
              <h3 style={{ 
                margin: "0 0 16px 0", 
                fontSize: "1.1rem",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <span>📋</span>
                Detailed Comparison
              </h3>
              <table style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.9rem",
              }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid rgba(255, 255, 255, 0.2)" }}>
                    <th style={{ padding: "12px 8px", textAlign: "left", fontWeight: "600" }}>Route</th>
                    <th style={{ padding: "12px 8px", textAlign: "center", fontWeight: "600" }}>Time</th>
                    <th style={{ padding: "12px 8px", textAlign: "center", fontWeight: "600" }}>Cost</th>
                    <th style={{ padding: "12px 8px", textAlign: "center", fontWeight: "600" }}>Distance</th>
                    <th style={{ padding: "12px 8px", textAlign: "center", fontWeight: "600" }}>Modes</th>
                    <th style={{ padding: "12px 8px", textAlign: "center", fontWeight: "600" }}>Transfers</th>
                    <th style={{ padding: "12px 8px", textAlign: "center", fontWeight: "600" }}>Carbon</th>
                  </tr>
                </thead>
                <tbody>
                  {routes.map((route, index) => {
                    const primaryMode = getModeDisplay(route.modesUsed[0]);
                    return (
                      <tr 
                        key={route.id} 
                        style={{ 
                          borderBottom: index < routes.length - 1 ? "1px solid rgba(255, 255, 255, 0.1)" : "none",
                          transition: "background 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <td style={{ padding: "12px 8px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "1.2rem" }}>{primaryMode.icon}</span>
                            <div>
                              <div style={{ fontWeight: "600" }}>{route.name}</div>
                              {index === 0 && (
                                <span style={{
                                  fontSize: "0.65rem",
                                  background: "#10b981",
                                  padding: "2px 6px",
                                  borderRadius: "6px",
                                  fontWeight: "600",
                                }}>
                                  RECOMMENDED
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "12px 8px", textAlign: "center", fontWeight: "600" }}>
                          {formatTime(route.totalDuration)}
                        </td>
                        <td style={{ padding: "12px 8px", textAlign: "center", fontWeight: "700", color: "#fbbf24" }}>
                          ₹{route.totalCost}
                        </td>
                        <td style={{ padding: "12px 8px", textAlign: "center" }}>
                          {formatDistance(route.totalDistance)}
                        </td>
                        <td style={{ padding: "12px 8px", textAlign: "center" }}>
                          <div style={{ display: "flex", justifyContent: "center", gap: "4px" }}>
                            {route.modesUsed.map(mode => {
                              const modeDisp = getModeDisplay(mode);
                              return (
                                <span key={mode} title={modeDisp.label} style={{ fontSize: "1.1rem" }}>
                                  {modeDisp.icon}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td style={{ padding: "12px 8px", textAlign: "center" }}>
                          {route.transferCount > 0 ? `${route.transferCount}×` : '-'}
                        </td>
                        <td style={{ padding: "12px 8px", textAlign: "center" }}>
                          <span style={{
                            padding: "4px 8px",
                            borderRadius: "8px",
                            fontSize: "0.75rem",
                            fontWeight: "600",
                            background: route.carbonFootprint === 'low' ? 'rgba(34, 197, 94, 0.2)' : 
                                       route.carbonFootprint === 'medium' ? 'rgba(251, 191, 36, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            color: route.carbonFootprint === 'low' ? '#22c55e' : 
                                   route.carbonFootprint === 'medium' ? '#fbbf24' : '#ef4444',
                          }}>
                            {route.carbonFootprint || 'N/A'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Route Options */}
        {!loading && routes.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {routes.map((route, index) => {
              // Get primary mode color
              const primaryMode = route.modesUsed[0];
              const modeDisplay = getModeDisplay(primaryMode);
              const routeColor = modeDisplay.color;
              
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
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                  }}
                >
                  {/* Route Header */}
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "flex-start",
                    marginBottom: "16px" 
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "12px",
                        marginBottom: "8px" 
                      }}>
                        <h3 style={{
                          margin: 0,
                          fontSize: "1.4rem",
                          fontWeight: "700",
                        }}>
                          {route.name}
                        </h3>
                        {index === 0 && (
                          <span style={{
                            background: "#10b981",
                            padding: "4px 12px",
                            borderRadius: "12px",
                            fontSize: "0.75rem",
                            fontWeight: "600",
                          }}>
                            RECOMMENDED
                          </span>
                        )}
                      </div>
                      <p style={{
                        margin: "0 0 12px 0",
                        opacity: 0.8,
                        fontSize: "0.9rem",
                      }}>
                        {route.description}
                      </p>

                      {/* Journey Segments */}
                      <div style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                        flexWrap: "wrap",
                        marginBottom: "12px",
                      }}>
                        {route.segments.map((segment, idx) => {
                          const segMode = getModeDisplay(segment.mode);
                          return (
                            <div key={segment.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <div style={{
                                background: `${segMode.color}30`,
                                border: `2px solid ${segMode.color}`,
                                borderRadius: "8px",
                                padding: "6px 12px",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                fontSize: "0.85rem",
                                fontWeight: "600",
                              }}>
                                <span style={{ fontSize: "1.1rem" }}>{segMode.icon}</span>
                                <span>{segMode.label}</span>
                                <span style={{ opacity: 0.7 }}>
                                  {formatTime(segment.duration)}
                                </span>
                              </div>
                              {idx < route.segments.length - 1 && (
                                <span style={{ opacity: 0.5 }}>→</span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Metrics */}
                      <div style={{
                        display: "flex",
                        gap: "20px",
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}>
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}>
                          <FiClock size={18} />
                          <span style={{ fontSize: "1rem", fontWeight: "700" }}>
                            {formatTime(route.totalDuration)}
                          </span>
                        </div>

                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}>
                          <FiNavigation size={18} />
                          <span style={{ fontSize: "0.95rem" }}>
                            {formatDistance(route.totalDistance)}
                          </span>
                        </div>

                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}>
                          <FiDollarSign size={18} />
                          <span style={{ fontSize: "1rem", fontWeight: "700", color: "#fbbf24" }}>
                            ₹{route.totalCost}
                          </span>
                        </div>

                        {route.transferCount > 0 && (
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            opacity: 0.8,
                          }}>
                            <FiTrendingUp size={16} />
                            <span style={{ fontSize: "0.85rem" }}>
                              {route.transferCount} transfer{route.transferCount > 1 ? 's' : ''}
                            </span>
                          </div>
                        )}

                        {/* Carbon Footprint Badge */}
                        {route.carbonFootprint && (
                          <div style={{
                            background: route.carbonFootprint === 'low' ? '#10b98130' : 
                                       route.carbonFootprint === 'medium' ? '#f59e0b30' : '#ef444430',
                            border: `1px solid ${route.carbonFootprint === 'low' ? '#10b981' : 
                                     route.carbonFootprint === 'medium' ? '#f59e0b' : '#ef4444'}`,
                            borderRadius: "12px",
                            padding: "4px 10px",
                            fontSize: "0.75rem",
                            fontWeight: "600",
                          }}>
                            🌿 {route.carbonFootprint} carbon
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Start Button */}
                    <button
                      onClick={() => handleStartNavigation(route)}
                      style={{
                        background: routeColor,
                        color: "white",
                        border: "none",
                        padding: "14px 28px",
                        borderRadius: "12px",
                        cursor: "pointer",
                        fontSize: "0.95rem",
                        fontWeight: "700",
                        transition: "all 0.3s ease",
                        whiteSpace: "nowrap",
                        marginLeft: "16px",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "scale(1.05)";
                        e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.3)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "scale(1)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      Start
                    </button>
                  </div>

                  {/* Detailed Segments (Expandable) */}
                  {route.segments.length > 1 && (
                    <details style={{ marginTop: "16px" }}>
                      <summary style={{
                        cursor: "pointer",
                        opacity: 0.7,
                        fontSize: "0.85rem",
                        userSelect: "none",
                      }}>
                        View step-by-step instructions
                      </summary>
                      <div style={{ marginTop: "12px", paddingLeft: "12px", borderLeft: "2px solid rgba(255,255,255,0.3)" }}>
                        {route.segments.map((segment, idx) => {
                          const segMode = getModeDisplay(segment.mode);
                          return (
                            <div key={segment.id} style={{
                              padding: "12px 0",
                              borderBottom: idx < route.segments.length - 1 ? "1px solid rgba(255,255,255,0.1)" : "none",
                            }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                <span style={{ fontSize: "1.2rem" }}>{segMode.icon}</span>
                                <strong>{segMode.label}</strong>
                              </div>
                              <p style={{ margin: "4px 0", opacity: 0.9, fontSize: "0.9rem" }}>
                                {segment.instruction}
                              </p>
                              <div style={{ 
                                display: "flex", 
                                gap: "12px", 
                                fontSize: "0.8rem", 
                                opacity: 0.7,
                                marginTop: "4px" 
                              }}>
                                <span>⏱️ {formatTime(segment.duration)}</span>
                                <span>📏 {formatDistance(segment.distance)}</span>
                                <span>💰 ₹{segment.cost}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* No Routes Found */}
        {!loading && routes.length === 0 && (
          <div style={{
            background: "rgba(255, 255, 255, 0.1)",
            borderRadius: "16px",
            padding: "40px",
            textAlign: "center",
            backdropFilter: "blur(10px)",
          }}>
            <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🗺️</div>
            <h3 style={{ margin: "0 0 8px 0" }}>No Routes Found</h3>
            <p style={{ opacity: 0.7, margin: 0 }}>
              Unable to calculate routes for this journey. Please try different locations.
            </p>
          </div>
        )}

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
              href="/essential-maps"
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
            backgroundAttachment: "fixed",
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
