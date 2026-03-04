"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  Polyline,
} from "@react-google-maps/api";
import { MultimodalRoute } from "@/types/multimodal";

interface NavigationStep {
  instruction: string;
  distance: number; // meters
  duration: number; // seconds
  maneuver: string;
  mode: string; // DRIVING | WALKING | TRANSIT
  transitDetails?: {
    lineName: string;
    lineShortName: string;
    vehicleType: string;
    departureStop: string;
    arrivalStop: string;
    numStops: number;
    color: string;
  };
  startLocation?: { lat: number; lng: number };
  endLocation?: { lat: number; lng: number };
}

interface SegmentPolyline {
  path: { lat: number; lng: number }[];
  color: string;
  mode: string;
}

interface Props {
  route: MultimodalRoute;
  sourceCoords: { lat: number; lng: number };
  destCoords: { lat: number; lng: number };
  sourceName: string;
  destName: string;
  onClose: () => void;
}

function decodeGooglePolyline(encoded: string): { lat: number; lng: number }[] {
  const points: { lat: number; lng: number }[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

function formatDist(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDur(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs} hr ${rem} min` : `${hrs} hr`;
}

function formatDurMin(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hrs = Math.floor(minutes / 60);
  const rem = Math.round(minutes % 60);
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

const MODE_COLORS: Record<string, string> = {
  walk: "#22c55e",
  bus: "#f59e0b",
  metro: "#3b82f6",
  auto: "#eab308",
  cab: "#8b5cf6",
  bike: "#06b6d4",
  DRIVING: "#4285F4",
  WALKING: "#22c55e",
  TRANSIT: "#f59e0b",
  BICYCLING: "#06b6d4",
};

const MODE_ICONS: Record<string, string> = {
  walk: "🚶",
  bus: "🚌",
  metro: "🚇",
  auto: "🛺",
  cab: "🚗",
  bike: "🚲",
  DRIVING: "🚗",
  WALKING: "🚶",
  TRANSIT: "🚌",
  BICYCLING: "🚲",
};

function getManeuverIcon(maneuver?: string): string {
  const map: Record<string, string> = {
    "turn-left": "↰",
    "turn-right": "↱",
    "turn-slight-left": "↖",
    "turn-slight-right": "↗",
    "turn-sharp-left": "⤹",
    "turn-sharp-right": "⤸",
    "uturn-left": "↩",
    "uturn-right": "↪",
    "keep-left": "←",
    "keep-right": "→",
    merge: "⇢",
    "fork-left": "⑂",
    "fork-right": "⑂",
    "roundabout-left": "↺",
    "roundabout-right": "↻",
    straight: "↑",
    depart: "🚀",
    arrive: "🏁",
  };
  return (maneuver && map[maneuver]) || "↑";
}

// Google Maps travel mode for API calls based on multimodal route modes
function getGoogleMode(route: MultimodalRoute): string {
  if (route.modesUsed.includes("cab") || route.modesUsed.includes("auto"))
    return "driving";
  if (
    route.modesUsed.includes("bus") ||
    route.modesUsed.includes("metro")
  )
    return "transit";
  if (route.modesUsed.includes("walk")) return "walking";
  return "driving";
}

const containerStyle = { width: "100%", height: "100%" };

export default function RouteNavigationView({
  route,
  sourceCoords,
  destCoords,
  sourceName,
  destName,
  onClose,
}: Props) {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  const mapRef = useRef<google.maps.Map | null>(null);

  // State
  const [polylineSegments, setPolylineSegments] = useState<SegmentPolyline[]>(
    []
  );
  const [steps, setSteps] = useState<NavigationStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [showDirections, setShowDirections] = useState(true);
  const [totalDistance, setTotalDistance] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [eta, setEta] = useState("");

  // All polyline points for bounds fitting
  const allPoints = useMemo(() => {
    return polylineSegments.flatMap((seg) => seg.path);
  }, [polylineSegments]);

  // Fit map bounds to route
  const fitBounds = useCallback(() => {
    if (!mapRef.current || allPoints.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    allPoints.forEach((p) => bounds.extend(p));
    // Also include source and dest
    bounds.extend(sourceCoords);
    bounds.extend(destCoords);
    mapRef.current.fitBounds(bounds, { top: 80, bottom: 300, left: 40, right: 40 });
  }, [allPoints, sourceCoords, destCoords]);

  const onMapLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      // Initial bounds
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(sourceCoords);
      bounds.extend(destCoords);
      map.fitBounds(bounds, { top: 80, bottom: 300, left: 40, right: 40 });
    },
    [sourceCoords, destCoords]
  );

  // Fetch directions and build polyline
  useEffect(() => {
    const fetchDirections = async () => {
      setLoading(true);
      setError(null);

      try {
        const googleMode = getGoogleMode(route);
        const url = `/api/google-directions?fromLat=${sourceCoords.lat}&fromLng=${sourceCoords.lng}&toLat=${destCoords.lat}&toLng=${destCoords.lng}&mode=${googleMode}`;

        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`API error: ${resp.status}`);

        const data = await resp.json();
        if (
          data.status !== "OK" ||
          !data.routes ||
          data.routes.length === 0
        ) {
          throw new Error("No route found from Google Directions");
        }

        const googleRoute = data.routes[0];
        const leg = googleRoute.legs[0];

        // Parse total metrics
        const dist = leg.distance?.value || 0;
        const dur = leg.duration?.value || 0;
        const durTraffic = leg.duration_in_traffic?.value || dur;
        setTotalDistance(dist);
        setTotalDuration(durTraffic);

        // Calculate ETA
        const now = new Date();
        const etaDate = new Date(now.getTime() + durTraffic * 1000);
        setEta(
          etaDate.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        );

        // Parse steps for turn-by-turn directions
        const parsedSteps: NavigationStep[] = [];
        const segments: SegmentPolyline[] = [];

        if (googleMode === "transit" && leg.steps) {
          // Transit mode: each step can be WALKING or TRANSIT with sub-steps
          for (const step of leg.steps) {
            const travelMode = step.travel_mode || "TRANSIT";
            const color = step.transit_details
              ? step.transit_details.line?.color || MODE_COLORS.TRANSIT
              : MODE_COLORS.WALKING;

            // Decode polyline for this step
            if (step.polyline?.points) {
              const decoded = decodeGooglePolyline(step.polyline.points);
              segments.push({ path: decoded, color, mode: travelMode });
            }

            // For transit steps with sub-steps (walking portions)
            if (step.steps && Array.isArray(step.steps)) {
              for (const subStep of step.steps) {
                parsedSteps.push({
                  instruction:
                    subStep.html_instructions?.replace(/<[^>]*>/g, "") ||
                    "Continue",
                  distance: subStep.distance?.value || 0,
                  duration: subStep.duration?.value || 0,
                  maneuver: subStep.maneuver || subStep.travel_mode || "",
                  mode: subStep.travel_mode || travelMode,
                  startLocation: subStep.start_location,
                  endLocation: subStep.end_location,
                });
              }
            } else {
              // Single transit/walking step
              const navStep: NavigationStep = {
                instruction:
                  step.html_instructions?.replace(/<[^>]*>/g, "") ||
                  "Continue",
                distance: step.distance?.value || 0,
                duration: step.duration?.value || 0,
                maneuver: step.maneuver || step.travel_mode || "",
                mode: travelMode,
                startLocation: step.start_location,
                endLocation: step.end_location,
              };

              if (step.transit_details) {
                navStep.transitDetails = {
                  lineName: step.transit_details.line?.name || "",
                  lineShortName:
                    step.transit_details.line?.short_name || "",
                  vehicleType:
                    step.transit_details.line?.vehicle?.type || "",
                  departureStop:
                    step.transit_details.departure_stop?.name || "",
                  arrivalStop:
                    step.transit_details.arrival_stop?.name || "",
                  numStops: step.transit_details.num_stops || 0,
                  color,
                };
              }
              parsedSteps.push(navStep);
            }
          }
        } else {
          // Driving/Walking mode: simpler step structure
          const overallColor =
            route.modesUsed.includes("cab")
              ? MODE_COLORS.cab
              : route.modesUsed.includes("auto")
              ? MODE_COLORS.auto
              : route.modesUsed.includes("walk")
              ? MODE_COLORS.walk
              : MODE_COLORS.DRIVING;

          // Use overview polyline for the full route
          if (googleRoute.overview_polyline?.points) {
            const decoded = decodeGooglePolyline(
              googleRoute.overview_polyline.points
            );
            segments.push({
              path: decoded,
              color: overallColor,
              mode: googleMode.toUpperCase(),
            });
          }

          // Parse individual steps
          if (leg.steps) {
            for (const step of leg.steps) {
              parsedSteps.push({
                instruction:
                  step.html_instructions?.replace(/<[^>]*>/g, "") ||
                  "Continue",
                distance: step.distance?.value || 0,
                duration: step.duration?.value || 0,
                maneuver: step.maneuver || step.travel_mode || "",
                mode: step.travel_mode || googleMode.toUpperCase(),
                startLocation: step.start_location,
                endLocation: step.end_location,
              });
            }
          }
        }

        setPolylineSegments(segments);
        setSteps(parsedSteps);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to fetch route directions";
        console.error("Navigation fetch error:", err);
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchDirections();
  }, [route, sourceCoords, destCoords]);

  // Fit bounds once polyline is loaded
  useEffect(() => {
    if (allPoints.length > 0) fitBounds();
  }, [allPoints, fitBounds]);

  // Navigate to step on map
  const goToStep = (index: number) => {
    setActiveStepIndex(index);
    const step = steps[index];
    if (step?.startLocation && mapRef.current) {
      mapRef.current.panTo(step.startLocation);
      mapRef.current.setZoom(17);
    }
  };

  if (!isLoaded) {
    return (
      <div style={overlayStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            color: "white",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: 16 }}>🗺️</div>
            <p>Loading Google Maps...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={overlayStyle}>
      <div style={topBarStyle}>
        <button onClick={onClose} style={closeButtonStyle}>
          ✕
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 4,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#22c55e",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: "0.8rem",
                color: "#ddd",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {sourceName}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#ef4444",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: "0.8rem",
                color: "#ddd",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {destName}
            </span>
          </div>
        </div>

        {/* Route mode pills */}
        <div
          style={{
            display: "flex",
            gap: 6,
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          {route.modesUsed.map((mode) => (
            <span
              key={mode}
              style={{
                background: `${MODE_COLORS[mode] || "#666"}30`,
                border: `1px solid ${MODE_COLORS[mode] || "#666"}`,
                borderRadius: 8,
                padding: "4px 10px",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "white",
              }}
            >
              {MODE_ICONS[mode] || "🚗"} {mode}
            </span>
          ))}
        </div>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: "relative" }}>
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={sourceCoords}
          zoom={14}
          options={{
            disableDefaultUI: true,
            zoomControl: true,
            fullscreenControl: false,
            mapTypeControl: false,
            streetViewControl: false,
            styles: mapDarkStyle,
          }}
          onLoad={onMapLoad}
        >
          {/* Source marker */}
          <Marker
            position={sourceCoords}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: "#22c55e",
              fillOpacity: 1,
              strokeColor: "white",
              strokeWeight: 3,
            }}
            title={sourceName}
          />

          {/* Destination marker */}
          <Marker
            position={destCoords}
            icon={{
              path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
              scale: 7,
              fillColor: "#ef4444",
              fillOpacity: 1,
              strokeColor: "white",
              strokeWeight: 2,
              rotation: 0,
            }}
            title={destName}
          />

          {/* Route polyline segments */}
          {polylineSegments.map((seg, i) => (
            <React.Fragment key={`seg-${i}`}>
              {/* Shadow line for depth */}
              <Polyline
                path={seg.path}
                options={{
                  strokeColor: "#000",
                  strokeOpacity: 0.15,
                  strokeWeight: 8,
                }}
              />
              {/* Main line */}
              <Polyline
                path={seg.path}
                options={{
                  strokeColor: seg.color,
                  strokeOpacity: 0.85,
                  strokeWeight: 6,
                  ...(seg.mode === "WALKING"
                    ? {
                        strokeOpacity: 0,
                        icons: [
                          {
                            icon: {
                              path: "M 0,-1 0,1",
                              strokeOpacity: 0.8,
                              strokeColor: seg.color,
                              scale: 3,
                            },
                            offset: "0",
                            repeat: "12px",
                          },
                        ],
                      }
                    : {}),
                }}
              />
            </React.Fragment>
          ))}

          {/* Active step marker */}
          {steps[activeStepIndex]?.startLocation && (
            <Marker
              position={steps[activeStepIndex].startLocation!}
              icon={{
                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                scale: 6,
                fillColor: "#4285F4",
                fillOpacity: 1,
                strokeColor: "white",
                strokeWeight: 2,
                rotation: 0,
              }}
            />
          )}
        </GoogleMap>

        {/* Loading overlay */}
        {loading && (
          <div style={mapOverlayStyle}>
            <div
              style={{
                background: "rgba(0,0,0,0.8)",
                borderRadius: 16,
                padding: "24px 32px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  border: "3px solid rgba(255,255,255,0.2)",
                  borderTop: "3px solid #4285F4",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                  margin: "0 auto 12px",
                }}
              />
              <p style={{ color: "white", margin: 0 }}>
                Fetching route directions...
              </p>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div style={mapOverlayStyle}>
            <div
              style={{
                background: "rgba(220,38,38,0.9)",
                borderRadius: 16,
                padding: "24px 32px",
                maxWidth: 400,
                textAlign: "center",
              }}
            >
              <p style={{ color: "white", margin: "0 0 12px" }}>
                ⚠️ {error}
              </p>
              <button
                onClick={onClose}
                style={{
                  background: "white",
                  color: "#dc2626",
                  border: "none",
                  padding: "8px 20px",
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Go Back
              </button>
            </div>
          </div>
        )}

        {/* Re-center button */}
        <button
          onClick={fitBounds}
          style={{
            position: "absolute",
            bottom: showDirections ? 340 : 160,
            right: 16,
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "white",
            border: "none",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            cursor: "pointer",
            fontSize: "1.2rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "bottom 0.3s ease",
            zIndex: 10,
          }}
          title="Re-center map"
        >
          ⊕
        </button>
      </div>

      {/*  Bottom Navigation Panel */}
      <div style={bottomPanelStyle}>
        {/* Summary bar */}
        <div style={summaryBarStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div>
              <div
                style={{ fontSize: "1.5rem", fontWeight: 800, color: "#22c55e" }}
              >
                {formatDurMin(totalDuration / 60)}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#999" }}>
                {formatDist(totalDistance)}
              </div>
            </div>

            <div
              style={{
                width: 1,
                height: 36,
                background: "rgba(255,255,255,0.15)",
              }}
            />

            <div>
              <div style={{ fontSize: "0.85rem", color: "#ddd" }}>
                ETA {eta || "--:--"}
              </div>
              <div
                style={{ fontSize: "0.75rem", color: "#fbbf24", fontWeight: 700 }}
              >
                ₹{route.totalCost}
              </div>
            </div>
          </div>

          {/* Segment overview strip */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {route.segments.map((seg, i) => {
              const width = Math.max(
                30,
                (seg.duration / route.totalDuration) * 180
              );
              return (
                <React.Fragment key={seg.id}>
                  <div
                    style={{
                      height: 6,
                      width,
                      borderRadius: 3,
                      background: MODE_COLORS[seg.mode] || "#666",
                    }}
                    title={`${MODE_ICONS[seg.mode] || ""} ${seg.mode} · ${formatDurMin(seg.duration)}`}
                  />
                  {i < route.segments.length - 1 && (
                    <span
                      style={{ color: "#666", fontSize: "0.6rem" }}
                    >
                      ▸
                    </span>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Toggle directions */}
          <button
            onClick={() => setShowDirections((v) => !v)}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 8,
              padding: "6px 12px",
              color: "white",
              cursor: "pointer",
              fontSize: "0.8rem",
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {showDirections ? "Hide Steps" : "Show Steps"}
          </button>
        </div>

        {/* Current step highlight */}
        {steps.length > 0 && (
          <div style={currentStepStyle}>
            <div
              style={{
                fontSize: "1.5rem",
                flexShrink: 0,
                width: 40,
                textAlign: "center",
              }}
            >
              {steps[activeStepIndex]?.transitDetails
                ? MODE_ICONS[steps[activeStepIndex].mode] || "🚌"
                : getManeuverIcon(steps[activeStepIndex]?.maneuver)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: "white",
                  lineHeight: 1.3,
                }}
              >
                {steps[activeStepIndex]?.transitDetails ? (
                  <>
                    Board{" "}
                    <span
                      style={{
                        color:
                          steps[activeStepIndex].transitDetails!.color ||
                          "#4285F4",
                        fontWeight: 800,
                      }}
                    >
                      {steps[activeStepIndex].transitDetails!.lineName ||
                        steps[activeStepIndex].transitDetails!.lineShortName}
                    </span>{" "}
                    at{" "}
                    {steps[activeStepIndex].transitDetails!.departureStop}
                  </>
                ) : (
                  steps[activeStepIndex]?.instruction || "Continue"
                )}
              </div>
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "#aaa",
                  marginTop: 2,
                }}
              >
                {formatDist(steps[activeStepIndex]?.distance || 0)} ·{" "}
                {formatDur(steps[activeStepIndex]?.duration || 0)}
                {steps[activeStepIndex]?.transitDetails &&
                  ` · ${steps[activeStepIndex].transitDetails!.numStops} stops`}
              </div>
            </div>

            {/* Step navigation */}
            <div
              style={{
                display: "flex",
                gap: 8,
                flexShrink: 0,
              }}
            >
              <button
                onClick={() => goToStep(Math.max(0, activeStepIndex - 1))}
                disabled={activeStepIndex === 0}
                style={stepNavBtnStyle(activeStepIndex === 0)}
              >
                ‹
              </button>
              <span style={{ color: "#999", fontSize: "0.75rem", alignSelf: "center" }}>
                {activeStepIndex + 1}/{steps.length}
              </span>
              <button
                onClick={() =>
                  goToStep(Math.min(steps.length - 1, activeStepIndex + 1))
                }
                disabled={activeStepIndex === steps.length - 1}
                style={stepNavBtnStyle(activeStepIndex === steps.length - 1)}
              >
                ›
              </button>
            </div>
          </div>
        )}

        {/* Directions list */}
        {showDirections && steps.length > 0 && (
          <div style={stepsListStyle}>
            {steps.map((step, i) => {
              const isActive = i === activeStepIndex;
              const isTransit = !!step.transitDetails;
              return (
                <div
                  key={i}
                  onClick={() => goToStep(i)}
                  style={{
                    display: "flex",
                    gap: 12,
                    padding: "12px 16px",
                    cursor: "pointer",
                    background: isActive ? "rgba(66,133,244,0.15)" : "transparent",
                    borderLeft: isActive ? "3px solid #4285F4" : "3px solid transparent",
                    transition: "all 0.15s ease",
                  }}
                >
                  {/* Step icon */}
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: isTransit
                        ? `${step.transitDetails!.color || MODE_COLORS.TRANSIT}30`
                        : i === 0
                        ? "#22c55e20"
                        : i === steps.length - 1
                        ? "#ef444420"
                        : "#ffffff10",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1rem",
                      flexShrink: 0,
                      border: isActive ? "2px solid #4285F4" : "2px solid transparent",
                    }}
                  >
                    {i === 0
                      ? "🚀"
                      : i === steps.length - 1
                      ? "🏁"
                      : isTransit
                      ? MODE_ICONS[step.mode] || "🚌"
                      : getManeuverIcon(step.maneuver)}
                  </div>

                  {/* Step content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? "white" : "#ddd",
                        lineHeight: 1.4,
                      }}
                    >
                      {isTransit ? (
                        <>
                          <span
                            style={{
                              background: `${step.transitDetails!.color || "#f59e0b"}30`,
                              border: `1px solid ${step.transitDetails!.color || "#f59e0b"}`,
                              borderRadius: 6,
                              padding: "2px 8px",
                              marginRight: 6,
                              fontSize: "0.75rem",
                              fontWeight: 700,
                            }}
                          >
                            {step.transitDetails!.lineShortName ||
                              step.transitDetails!.lineName}
                          </span>
                          {step.transitDetails!.departureStop} →{" "}
                          {step.transitDetails!.arrivalStop}
                        </>
                      ) : (
                        step.instruction
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#888",
                        marginTop: 2,
                        display: "flex",
                        gap: 8,
                      }}
                    >
                      <span>{formatDist(step.distance)}</span>
                      <span>{formatDur(step.duration)}</span>
                      {isTransit && (
                        <span>{step.transitDetails!.numStops} stops</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* End Navigation button */}
        <div style={{ padding: "12px 16px" }}>
          <button onClick={onClose} style={endNavBtnStyle}>
            End Navigation
          </button>
        </div>
      </div>

      {/* Spin animation */}
      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

// Styles 

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  display: "flex",
  flexDirection: "column",
  background: "#1a1a2e",
};

const topBarStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "12px 16px",
  background: "rgba(26,26,46,0.95)",
  borderBottom: "1px solid rgba(255,255,255,0.1)",
  backdropFilter: "blur(12px)",
  zIndex: 20,
};

const closeButtonStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: "50%",
  background: "rgba(255,255,255,0.1)",
  border: "1px solid rgba(255,255,255,0.2)",
  color: "white",
  fontSize: "1rem",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const bottomPanelStyle: React.CSSProperties = {
  background: "rgba(26,26,46,0.97)",
  borderTop: "1px solid rgba(255,255,255,0.1)",
  backdropFilter: "blur(12px)",
  maxHeight: "45vh",
  display: "flex",
  flexDirection: "column",
  zIndex: 20,
};

const summaryBarStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "12px 16px",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  flexWrap: "wrap",
};

const currentStepStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "12px 16px",
  background: "rgba(66,133,244,0.08)",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
};

const stepsListStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  maxHeight: "25vh",
};

const mapOverlayStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(0,0,0,0.5)",
  zIndex: 15,
};

const endNavBtnStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  borderRadius: 12,
  border: "none",
  background: "#ef4444",
  color: "white",
  fontSize: "0.95rem",
  fontWeight: 700,
  cursor: "pointer",
  transition: "background 0.2s",
};

function stepNavBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: disabled ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.15)",
    border: "none",
    color: disabled ? "#555" : "white",
    fontSize: "1.2rem",
    cursor: disabled ? "default" : "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
}

// Dark-styled Google Map
const mapDarkStyle: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#212121" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "on" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ color: "#757575" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#2a2a3e" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#1b3d1b" }],
  },
  {
    featureType: "road",
    elementType: "geometry.fill",
    stylers: [{ color: "#383850" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#2a2a3e" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#444466" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#333355" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#1a1a3e" }],
  },
];
