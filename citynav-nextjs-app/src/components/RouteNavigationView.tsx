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
  distance: number;
  duration: number;
  maneuver: string;
  mode: string;
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

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
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
  const isMobile = useIsMobile();

  // State
  const [polylineSegments, setPolylineSegments] = useState<SegmentPolyline[]>([]);
  const [steps, setSteps] = useState<NavigationStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [showDirections, setShowDirections] = useState(true);
  const [totalDistance, setTotalDistance] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [eta, setEta] = useState("");

  // Bottom sheet drag state (mobile)
  const [sheetHeight, setSheetHeight] = useState(200);
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const SHEET_PEEK = 140; // collapsed height showing summary
  const SHEET_MID = 320;  // mid-height showing current step
  const SHEET_MAX = typeof window !== 'undefined' ? window.innerHeight * 0.75 : 600;

  // All polyline points for bounds fitting
  const allPoints = useMemo(() => {
    return polylineSegments.flatMap((seg) => seg.path);
  }, [polylineSegments]);

  // Fit map bounds to route
  const fitBounds = useCallback(() => {
    if (!mapRef.current || allPoints.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    allPoints.forEach((p) => bounds.extend(p));
    bounds.extend(sourceCoords);
    bounds.extend(destCoords);
    const padding = isMobile
      ? { top: 60, bottom: sheetHeight + 20, left: 20, right: 20 }
      : { top: 80, bottom: 300, left: 40, right: 40 };
    mapRef.current.fitBounds(bounds, padding);
  }, [allPoints, sourceCoords, destCoords, isMobile, sheetHeight]);

  const onMapLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(sourceCoords);
      bounds.extend(destCoords);
      const padding = isMobile
        ? { top: 60, bottom: 220, left: 20, right: 20 }
        : { top: 80, bottom: 300, left: 40, right: 40 };
      map.fitBounds(bounds, padding);
    },
    [sourceCoords, destCoords, isMobile]
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

        const dist = leg.distance?.value || 0;
        const dur = leg.duration?.value || 0;
        const durTraffic = leg.duration_in_traffic?.value || dur;
        setTotalDistance(dist);
        setTotalDuration(durTraffic);

        const now = new Date();
        const etaDate = new Date(now.getTime() + durTraffic * 1000);
        setEta(
          etaDate.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        );

        const parsedSteps: NavigationStep[] = [];
        const segments: SegmentPolyline[] = [];

        if (googleMode === "transit" && leg.steps) {
          for (const step of leg.steps) {
            const travelMode = step.travel_mode || "TRANSIT";
            const color = step.transit_details
              ? step.transit_details.line?.color || MODE_COLORS.TRANSIT
              : MODE_COLORS.WALKING;

            if (step.polyline?.points) {
              const decoded = decodeGooglePolyline(step.polyline.points);
              segments.push({ path: decoded, color, mode: travelMode });
            }

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
          const overallColor =
            route.modesUsed.includes("cab")
              ? MODE_COLORS.cab
              : route.modesUsed.includes("auto")
              ? MODE_COLORS.auto
              : route.modesUsed.includes("walk")
              ? MODE_COLORS.walk
              : MODE_COLORS.DRIVING;

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

  // --- Bottom sheet drag handlers ---
  const onDragStart = useCallback((clientY: number) => {
    dragRef.current = { startY: clientY, startHeight: sheetHeight };
  }, [sheetHeight]);

  const onDragMove = useCallback((clientY: number) => {
    if (!dragRef.current) return;
    const diff = dragRef.current.startY - clientY;
    setSheetHeight(Math.min(SHEET_MAX, Math.max(SHEET_PEEK, dragRef.current.startHeight + diff)));
  }, [SHEET_MAX]);

  const onDragEnd = useCallback(() => {
    if (!dragRef.current) return;
    // Snap to nearest position
    const mid = (SHEET_PEEK + SHEET_MID) / 2;
    const midHigh = (SHEET_MID + SHEET_MAX) / 2;
    if (sheetHeight < mid) {
      setSheetHeight(SHEET_PEEK);
      setShowDirections(false);
    } else if (sheetHeight < midHigh) {
      setSheetHeight(SHEET_MID);
      setShowDirections(false);
    } else {
      setSheetHeight(SHEET_MAX);
      setShowDirections(true);
    }
    dragRef.current = null;
  }, [sheetHeight, SHEET_MAX]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => { onDragStart(e.touches[0].clientY); }, [onDragStart]);
  const handleTouchMove = useCallback((e: React.TouchEvent) => { onDragMove(e.touches[0].clientY); }, [onDragMove]);
  const handleTouchEnd = useCallback(() => { onDragEnd(); }, [onDragEnd]);
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onDragStart(e.clientY);
    const move = (ev: MouseEvent) => onDragMove(ev.clientY);
    const up = () => { onDragEnd(); document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }, [onDragStart, onDragMove, onDragEnd]);

  if (!isLoaded) {
    return (
      <div style={overlayStyle}>
        <div className="flex items-center justify-center h-full text-white">
          <div className="text-center">
            <div className="text-5xl mb-4">🗺️</div>
            <p>Loading Google Maps...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={overlayStyle}>
      {/* Top bar - compact on mobile */}
      <div className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 bg-[rgba(26,26,46,0.95)] border-b border-white/10 backdrop-blur-xl z-20">
        <button onClick={onClose} className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-white/10 border border-white/20 text-white text-sm cursor-pointer flex items-center justify-center flex-shrink-0">
          ✕
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 md:gap-2 mb-0.5 md:mb-1">
            <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-green-500 flex-shrink-0" />
            <span className="text-[11px] md:text-xs text-gray-300 truncate">{sourceName}</span>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-red-500 flex-shrink-0" />
            <span className="text-[11px] md:text-xs text-gray-300 truncate">{destName}</span>
          </div>
        </div>

        {/* Route mode pills - scrollable on mobile */}
        <div className="flex gap-1 md:gap-1.5 items-center flex-shrink-0 overflow-x-auto no-scrollbar">
          {route.modesUsed.map((mode) => (
            <span
              key={mode}
              className="px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-md text-[10px] md:text-xs font-semibold text-white whitespace-nowrap"
              style={{
                background: `${MODE_COLORS[mode] || "#666"}30`,
                border: `1px solid ${MODE_COLORS[mode] || "#666"}`,
              }}
            >
              {MODE_ICONS[mode] || "🚗"} {isMobile ? '' : mode}
            </span>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={sourceCoords}
          zoom={14}
          options={{
            disableDefaultUI: true,
            zoomControl: !isMobile,
            fullscreenControl: false,
            mapTypeControl: false,
            streetViewControl: false,
            styles: mapDarkStyle,
          }}
          onLoad={onMapLoad}
        >
          <Marker
            position={sourceCoords}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: isMobile ? 8 : 10,
              fillColor: "#22c55e",
              fillOpacity: 1,
              strokeColor: "white",
              strokeWeight: isMobile ? 2 : 3,
            }}
            title={sourceName}
          />

          <Marker
            position={destCoords}
            icon={{
              path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
              scale: isMobile ? 5 : 7,
              fillColor: "#ef4444",
              fillOpacity: 1,
              strokeColor: "white",
              strokeWeight: 2,
              rotation: 0,
            }}
            title={destName}
          />

          {polylineSegments.map((seg, i) => (
            <React.Fragment key={`seg-${i}`}>
              <Polyline
                path={seg.path}
                options={{
                  strokeColor: "#000",
                  strokeOpacity: 0.15,
                  strokeWeight: isMobile ? 6 : 8,
                }}
              />
              <Polyline
                path={seg.path}
                options={{
                  strokeColor: seg.color,
                  strokeOpacity: 0.85,
                  strokeWeight: isMobile ? 4 : 6,
                  ...(seg.mode === "WALKING"
                    ? {
                        strokeOpacity: 0,
                        icons: [
                          {
                            icon: {
                              path: "M 0,-1 0,1",
                              strokeOpacity: 0.8,
                              strokeColor: seg.color,
                              scale: isMobile ? 2 : 3,
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

          {steps[activeStepIndex]?.startLocation && (
            <Marker
              position={steps[activeStepIndex].startLocation!}
              icon={{
                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                scale: isMobile ? 4 : 6,
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
            <div className="bg-black/80 rounded-2xl px-6 md:px-8 py-5 md:py-6 text-center">
              <div className="w-8 h-8 md:w-10 md:h-10 border-3 border-white/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-white text-sm md:text-base m-0">Fetching route directions...</p>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div style={mapOverlayStyle}>
            <div className="bg-red-600/90 rounded-2xl px-6 py-5 max-w-[90vw] md:max-w-[400px] text-center">
              <p className="text-white text-sm m-0 mb-3">⚠️ {error}</p>
              <button
                onClick={onClose}
                className="bg-white text-red-600 border-none px-5 py-2 rounded-lg font-semibold cursor-pointer text-sm"
              >
                Go Back
              </button>
            </div>
          </div>
        )}

        {/* Re-center button */}
        <button
          onClick={fitBounds}
          className="absolute right-3 md:right-4 z-10 w-10 h-10 md:w-11 md:h-11 rounded-full bg-white border-none shadow-lg cursor-pointer text-lg flex items-center justify-center active:scale-95 transition-transform"
          style={{ bottom: isMobile ? sheetHeight + 12 : (showDirections ? 340 : 160) }}
          title="Re-center map"
        >
          ⊕
        </button>
      </div>

      {/* --- MOBILE: Draggable bottom sheet --- */}
      {isMobile ? (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: sheetHeight,
            zIndex: 20,
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(26,26,46,0.98)',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            boxShadow: '0 -8px 30px rgba(0,0,0,0.3)',
            transition: dragRef.current ? 'none' : 'height 0.25s cubic-bezier(0.4,0,0.2,1)',
            overflow: 'hidden',
          }}
        >
          {/* Drag handle */}
          <div
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="flex flex-col items-center pt-2 pb-1 cursor-grab"
            style={{ touchAction: 'none', userSelect: 'none' }}
          >
            <div className="w-10 h-1 rounded-full bg-white/30" />
          </div>

          {/* Summary row */}
          <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-white/8 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div>
                <div className="text-xl font-extrabold text-green-400 leading-tight">
                  {formatDurMin(totalDuration / 60)}
                </div>
                <div className="text-[11px] text-gray-400">
                  {formatDist(totalDistance)} · ETA {eta || "--:--"}
                </div>
              </div>
              <div className="text-sm font-bold text-yellow-400">₹{route.totalCost}</div>
            </div>

            {/* Segment strip */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {route.segments.map((seg, i) => {
                const w = Math.max(20, (seg.duration / route.totalDuration) * 80);
                return (
                  <React.Fragment key={seg.id}>
                    <div
                      className="h-1.5 rounded-full"
                      style={{ width: w, background: MODE_COLORS[seg.mode] || "#666" }}
                      title={`${MODE_ICONS[seg.mode] || ""} ${seg.mode}`}
                    />
                    {i < route.segments.length - 1 && (
                      <span className="text-gray-600 text-[8px]">▸</span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Current step highlight */}
          {steps.length > 0 && (
            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-blue-500/8 border-b border-white/6 flex-shrink-0">
              <div className="text-xl flex-shrink-0 w-8 text-center">
                {steps[activeStepIndex]?.transitDetails
                  ? MODE_ICONS[steps[activeStepIndex].mode] || "🚌"
                  : getManeuverIcon(steps[activeStepIndex]?.maneuver)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white leading-snug truncate">
                  {steps[activeStepIndex]?.transitDetails ? (
                    <>
                      Board{" "}
                      <span style={{ color: steps[activeStepIndex].transitDetails!.color || "#4285F4" }}>
                        {steps[activeStepIndex].transitDetails!.lineName ||
                          steps[activeStepIndex].transitDetails!.lineShortName}
                      </span>
                    </>
                  ) : (
                    steps[activeStepIndex]?.instruction || "Continue"
                  )}
                </div>
                <div className="text-[11px] text-gray-400 mt-0.5">
                  {formatDist(steps[activeStepIndex]?.distance || 0)} · {formatDur(steps[activeStepIndex]?.duration || 0)}
                  {steps[activeStepIndex]?.transitDetails &&
                    ` · ${steps[activeStepIndex].transitDetails!.numStops} stops`}
                </div>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button
                  onClick={() => goToStep(Math.max(0, activeStepIndex - 1))}
                  disabled={activeStepIndex === 0}
                  className="w-7 h-7 rounded-full bg-white/10 border-none text-white text-sm flex items-center justify-center disabled:opacity-30"
                >
                  ‹
                </button>
                <span className="text-gray-500 text-[10px] self-center">{activeStepIndex + 1}/{steps.length}</span>
                <button
                  onClick={() => goToStep(Math.min(steps.length - 1, activeStepIndex + 1))}
                  disabled={activeStepIndex === steps.length - 1}
                  className="w-7 h-7 rounded-full bg-white/10 border-none text-white text-sm flex items-center justify-center disabled:opacity-30"
                >
                  ›
                </button>
              </div>
            </div>
          )}

          {/* Scrollable directions list */}
          <div className="flex-1 overflow-y-auto">
            {steps.map((step, i) => {
              const isActive = i === activeStepIndex;
              const isTransit = !!step.transitDetails;
              return (
                <div
                  key={i}
                  onClick={() => goToStep(i)}
                  className={`flex gap-2.5 px-4 py-2.5 cursor-pointer transition-all ${
                    isActive ? 'bg-blue-500/15 border-l-[3px] border-l-blue-500' : 'border-l-[3px] border-l-transparent'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                      isActive ? 'border-2 border-blue-500' : 'border-2 border-transparent'
                    }`}
                    style={{
                      background: isTransit
                        ? `${step.transitDetails!.color || MODE_COLORS.TRANSIT}30`
                        : i === 0 ? "#22c55e20" : i === steps.length - 1 ? "#ef444420" : "#ffffff10",
                    }}
                  >
                    {i === 0 ? "🚀" : i === steps.length - 1 ? "🏁" : isTransit ? MODE_ICONS[step.mode] || "🚌" : getManeuverIcon(step.maneuver)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs leading-snug ${isActive ? 'font-bold text-white' : 'font-medium text-gray-300'}`}>
                      {isTransit ? (
                        <>
                          <span
                            className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold mr-1"
                            style={{
                              background: `${step.transitDetails!.color || "#f59e0b"}30`,
                              border: `1px solid ${step.transitDetails!.color || "#f59e0b"}`,
                            }}
                          >
                            {step.transitDetails!.lineShortName || step.transitDetails!.lineName}
                          </span>
                          {step.transitDetails!.departureStop} → {step.transitDetails!.arrivalStop}
                        </>
                      ) : (
                        step.instruction
                      )}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5 flex gap-2">
                      <span>{formatDist(step.distance)}</span>
                      <span>{formatDur(step.duration)}</span>
                      {isTransit && <span>{step.transitDetails!.numStops} stops</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* End Navigation */}
          <div className="px-4 py-2.5 flex-shrink-0">
            <button onClick={onClose} className="w-full py-2.5 rounded-xl border-none bg-red-500 text-white text-sm font-bold cursor-pointer active:scale-[0.98] transition-transform">
              End Navigation
            </button>
          </div>
        </div>
      ) : (
        /* --- DESKTOP: Original bottom panel --- */
        <div style={bottomPanelStyle}>
          {/* Summary bar */}
          <div style={summaryBarStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#22c55e" }}>
                  {formatDurMin(totalDuration / 60)}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#999" }}>
                  {formatDist(totalDistance)}
                </div>
              </div>
              <div style={{ width: 1, height: 36, background: "rgba(255,255,255,0.15)" }} />
              <div>
                <div style={{ fontSize: "0.85rem", color: "#ddd" }}>ETA {eta || "--:--"}</div>
                <div style={{ fontSize: "0.75rem", color: "#fbbf24", fontWeight: 700 }}>₹{route.totalCost}</div>
              </div>
            </div>

            {/* Segment overview strip */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {route.segments.map((seg, i) => {
                const width = Math.max(30, (seg.duration / route.totalDuration) * 180);
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
                      <span style={{ color: "#666", fontSize: "0.6rem" }}>▸</span>
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
              <div style={{ fontSize: "1.5rem", flexShrink: 0, width: 40, textAlign: "center" }}>
                {steps[activeStepIndex]?.transitDetails
                  ? MODE_ICONS[steps[activeStepIndex].mode] || "🚌"
                  : getManeuverIcon(steps[activeStepIndex]?.maneuver)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "white", lineHeight: 1.3 }}>
                  {steps[activeStepIndex]?.transitDetails ? (
                    <>
                      Board{" "}
                      <span
                        style={{
                          color: steps[activeStepIndex].transitDetails!.color || "#4285F4",
                          fontWeight: 800,
                        }}
                      >
                        {steps[activeStepIndex].transitDetails!.lineName ||
                          steps[activeStepIndex].transitDetails!.lineShortName}
                      </span>{" "}
                      at {steps[activeStepIndex].transitDetails!.departureStop}
                    </>
                  ) : (
                    steps[activeStepIndex]?.instruction || "Continue"
                  )}
                </div>
                <div style={{ fontSize: "0.8rem", color: "#aaa", marginTop: 2 }}>
                  {formatDist(steps[activeStepIndex]?.distance || 0)} ·{" "}
                  {formatDur(steps[activeStepIndex]?.duration || 0)}
                  {steps[activeStepIndex]?.transitDetails &&
                    ` · ${steps[activeStepIndex].transitDetails!.numStops} stops`}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
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
                  onClick={() => goToStep(Math.min(steps.length - 1, activeStepIndex + 1))}
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
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: isTransit
                          ? `${step.transitDetails!.color || MODE_COLORS.TRANSIT}30`
                          : i === 0 ? "#22c55e20" : i === steps.length - 1 ? "#ef444420" : "#ffffff10",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1rem",
                        flexShrink: 0,
                        border: isActive ? "2px solid #4285F4" : "2px solid transparent",
                      }}
                    >
                      {i === 0 ? "🚀" : i === steps.length - 1 ? "🏁" : isTransit ? MODE_ICONS[step.mode] || "🚌" : getManeuverIcon(step.maneuver)}
                    </div>
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
                              {step.transitDetails!.lineShortName || step.transitDetails!.lineName}
                            </span>
                            {step.transitDetails!.departureStop} → {step.transitDetails!.arrivalStop}
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
                        {isTransit && <span>{step.transitDetails!.numStops} stops</span>}
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
      )}

      {/* Animations */}
      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
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
