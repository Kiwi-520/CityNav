import React, { useEffect, useRef, useCallback, useState } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Polyline } from '@react-google-maps/api';
import { POI } from '@/features/offline-onboarding/hooks/useNearbyPOIs';

const containerStyle = { height: '100%', width: '100%' };

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
};

type Props = {
  center: [number, number];
  displayPosition: [number, number] | null;
  forcedCenter: [number, number] | null;
  setSelectedDest: (d: { lat: number; lon: number } | null) => void;
  route?: any;
  displayPois: POI[];
  activeCategories: Record<string, boolean>;
  setForcedCenter: (c: [number, number] | null) => void;
  setSelectedPackId: (id: string | null) => void;
  isOnline?: boolean;
  onNavigateToPoi?: (poi: POI) => void;
  onCompareRoutes?: (poi: POI) => void;
};

// POI color mapping
function getPoiColor(category: string): string {
  if (category === 'hospital' || category === 'clinic' || category === 'pharmacy') return '#dc2626';
  if (category === 'railway') return '#0ea5e9';
  if (category === 'bus_stop') return '#16a34a';
  if (category === 'bank' || category === 'atm') return '#7c3aed';
  if (category === 'hotel') return '#f59e0b';
  if (category === 'restaurant' || category === 'cafe') return '#ef4444';
  if (category === 'tourist_attraction' || category === 'museum' || category === 'monument' || category === 'viewpoint') return '#a855f7';
  if (category === 'park') return '#22c55e';
  if (category === 'fuel') return '#f97316';
  if (category === 'shopping') return '#ec4899';
  if (category === 'police') return '#1e40af';
  if (category === 'education') return '#0d9488';
  if (category === 'toilet') return '#78716c';
  return '#6b7280';
}

// POI label mapping
function getPoiLabel(category: string): string {
  if (category === 'hospital' || category === 'clinic') return 'H';
  if (category === 'pharmacy') return 'Rx';
  if (category === 'railway') return 'T';
  if (category === 'bus_stop') return 'B';
  if (category === 'bank' || category === 'atm') return '$';
  if (category === 'hotel') return '🏨';
  if (category === 'restaurant') return '🍴';
  if (category === 'cafe') return '☕';
  if (category === 'tourist_attraction' || category === 'museum') return '🎭';
  if (category === 'monument') return '🗿';
  if (category === 'park' || category === 'viewpoint') return '🌳';
  if (category === 'fuel') return '⛽';
  if (category === 'shopping') return '🛒';
  if (category === 'police') return '🚔';
  if (category === 'education') return '🎓';
  if (category === 'toilet') return '🚻';
  return '•';
}

// Build colored SVG marker data URL
function buildMarkerIcon(color: string, label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <rect x="2" y="2" width="28" height="28" rx="8" fill="${color}" stroke="white" stroke-width="2"/>
    <text x="16" y="21" text-anchor="middle" fill="white" font-size="14" font-weight="bold" font-family="Arial">${label}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

/** Calculate straight-line distance in meters between two coordinates */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => d * Math.PI / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Calculate compass bearing from point A to point B */
function bearing(lat1: number, lon1: number, lat2: number, lon2: number): string {
  const toRad = (d: number) => d * Math.PI / 180;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  const brng = ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(brng / 45) % 8];
}

function formatOfflineDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export default function GoogleMapView({ center, displayPosition, forcedCenter, setSelectedDest, route, displayPois, activeCategories, isOnline, onNavigateToPoi, onCompareRoutes }: Props) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [activeInfoWindow, setActiveInfoWindow] = useState<string | null>(null);
  const [offlineSelectedPoi, setOfflineSelectedPoi] = useState<POI | null>(null);
  const [showOfflineList, setShowOfflineList] = useState(false);

  const online = isOnline ?? (typeof navigator !== 'undefined' ? navigator.onLine : true);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  });

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  // Recenter map when forcedCenter or displayPosition changes
  useEffect(() => {
    if (!mapRef.current) return;
    const target = forcedCenter || displayPosition;
    if (target) {
      mapRef.current.panTo({ lat: target[0], lng: target[1] });
    }
  }, [forcedCenter, displayPosition]);

  const handleNavigateToLocation = (poi: POI) => {
    if (onNavigateToPoi) {
      onNavigateToPoi(poi);
    } else {
      handleCompareRoutes(poi);
    }
  };

  const handleCompareRoutes = (poi: POI) => {
    if (onCompareRoutes) {
      onCompareRoutes(poi);
    }
  };

  // Offline fallback: show cached POIs as a list when offline (tiles can't load even if JS is cached)
  if (!online) {
    const visiblePois = displayPois.filter(p => activeCategories[p.category]);
    const userLat = displayPosition ? displayPosition[0] : center[0];
    const userLon = displayPosition ? displayPosition[1] : center[1];

    return (
      <div className="flex-[0_0_60%] min-w-0 h-[80vh] overflow-hidden flex flex-col bg-slate-50 dark:bg-slate-900">
        {/* Offline header */}
        <div className="px-5 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📡</span>
            <div>
              <div className="font-bold text-base">You&apos;re Offline</div>
              <div className="text-xs opacity-90">Map unavailable. Showing cached places nearby.</div>
            </div>
          </div>
        </div>

        {/* POI list */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {visiblePois.length === 0 ? (
            <div className="text-center py-10 px-5 text-slate-400 dark:text-slate-500">
              <div className="text-4xl mb-3">📦</div>
              <p className="font-semibold mb-1">No cached places available</p>
              <p className="text-sm">Toggle categories in the sidebar or create an offline pack while online.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {visiblePois
                .map(p => ({
                  ...p,
                  _dist: haversineDistance(userLat, userLon, p.lat, p.lon),
                  _bearing: bearing(userLat, userLon, p.lat, p.lon),
                }))
                .sort((a, b) => a._dist - b._dist)
                .map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setOfflineSelectedPoi(p);
                    }}
                    className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer text-left w-full shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-base text-white shrink-0"
                      style={{ background: getPoiColor(p.category) }}
                    >
                      {getPoiLabel(p.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                        {p.name || p.category}
                      </div>
                      <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        {p.tags?.operator || p.tags?.brand || p.category}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-sm text-indigo-600 dark:text-indigo-400">
                        {formatOfflineDistance(p._dist)}
                      </div>
                      <div className="text-xs text-slate-400 dark:text-slate-500">
                        {p._bearing}
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* Offline direction popup */}
        {offlineSelectedPoi && (
          <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-5">
            <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-[380px] w-full shadow-2xl overflow-hidden">
              {/* Popup header */}
              <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-lg">
                      {offlineSelectedPoi.name || offlineSelectedPoi.category}
                    </div>
                    <div className="text-sm opacity-85 mt-1">
                      {offlineSelectedPoi.tags?.operator || offlineSelectedPoi.tags?.brand || offlineSelectedPoi.category}
                    </div>
                  </div>
                  <button
                    onClick={() => { setOfflineSelectedPoi(null); setSelectedDest(null); }}
                    className="bg-white/20 border-none text-white w-8 h-8 rounded-lg cursor-pointer text-base font-bold hover:bg-white/30 transition"
                  >✕</button>
                </div>
              </div>

              {/* Direction info */}
              <div className="p-6">
                <div className="flex gap-3 mb-5">
                  <div className="flex-1 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-xl py-3.5 px-3 text-center">
                    <div className="text-xs font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-1">Distance</div>
                    <div className="text-2xl font-extrabold text-indigo-800 dark:text-indigo-200">
                      {formatOfflineDistance(haversineDistance(
                        displayPosition ? displayPosition[0] : center[0],
                        displayPosition ? displayPosition[1] : center[1],
                        offlineSelectedPoi.lat, offlineSelectedPoi.lon
                      ))}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">straight line</div>
                  </div>
                  <div className="flex-1 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-xl py-3.5 px-3 text-center">
                    <div className="text-xs font-semibold text-emerald-500 dark:text-emerald-400 uppercase tracking-wider mb-1">Direction</div>
                    <div className="text-2xl font-extrabold text-emerald-800 dark:text-emerald-200">
                      {bearing(
                        displayPosition ? displayPosition[0] : center[0],
                        displayPosition ? displayPosition[1] : center[1],
                        offlineSelectedPoi.lat, offlineSelectedPoi.lon
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">compass heading</div>
                  </div>
                </div>

                <div className="text-sm text-slate-500 dark:text-slate-400 text-center mb-4 leading-relaxed">
                  📡 You&apos;re offline. Head <strong className="text-slate-700 dark:text-slate-200">{bearing(
                    displayPosition ? displayPosition[0] : center[0],
                    displayPosition ? displayPosition[1] : center[1],
                    offlineSelectedPoi.lat, offlineSelectedPoi.lon
                  )}</strong> for approximately <strong className="text-slate-700 dark:text-slate-200">{formatOfflineDistance(haversineDistance(
                    displayPosition ? displayPosition[0] : center[0],
                    displayPosition ? displayPosition[1] : center[1],
                    offlineSelectedPoi.lat, offlineSelectedPoi.lon
                  ))}</strong> to reach this location.
                </div>

                <button
                  onClick={() => {
                    setSelectedDest({ lat: offlineSelectedPoi.lat, lon: offlineSelectedPoi.lon });
                    setOfflineSelectedPoi(null);
                  }}
                  className="w-full py-3.5 px-5 border-none rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-bold text-base cursor-pointer shadow-lg shadow-indigo-500/40 hover:from-indigo-700 hover:to-indigo-800 transition"
                >
                  🧭 View Saved Directions
                </button>
                <button
                  onClick={() => { setOfflineSelectedPoi(null); setSelectedDest(null); }}
                  className="w-full py-3 px-5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-semibold text-sm cursor-pointer mt-2 hover:bg-slate-50 dark:hover:bg-slate-600 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex-1 min-w-0 flex items-center justify-center h-full bg-slate-100 dark:bg-slate-900">
        <div className="text-center">
          <div className="text-3xl mb-3">🗺️</div>
          <p className="text-slate-500 dark:text-slate-400">Loading Google Maps...</p>
        </div>
      </div>
    );
  }

  const googleCenter = { lat: center[0], lng: center[1] };

  // Build polyline path from route geometry
  const polylinePath = route?.geometry
    ? (route.geometry as [number, number][]).map(([lat, lng]: [number, number]) => ({ lat, lng }))
    : [];

  // Unique key for the route polyline to force React to remount on route change
  const routeKey = route ? `route-${route.distance}-${route.duration}-${route.geometry?.length || 0}` : 'no-route';

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={googleCenter}
        zoom={15}
        options={mapOptions}
        onLoad={onLoad}
        onUnmount={onUnmount}
      >
        {/* User location marker */}
        <Marker
          position={googleCenter}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#4285F4',
            fillOpacity: 1,
            strokeColor: 'white',
            strokeWeight: 3,
          }}
          title={displayPosition ? 'You are here (live location)' : 'Default location'}
        />

        {/* Route polyline — key forces remount when route changes so old polyline is removed */}
        {polylinePath.length > 0 && (
          <Polyline
            key={routeKey}
            path={polylinePath}
            options={{
              strokeColor: '#2563eb',
              strokeOpacity: 0.8,
              strokeWeight: 5,
            }}
          />
        )}

        {/* POI Markers */}
        {displayPois && displayPois.filter(p => activeCategories[p.category]).map((p: POI) => {
          const color = getPoiColor(p.category);
          const label = getPoiLabel(p.category);
          return (
            <React.Fragment key={p.id}>
              <Marker
                position={{ lat: p.lat, lng: p.lon }}
                icon={{
                  url: buildMarkerIcon(color, label),
                  scaledSize: new google.maps.Size(32, 32),
                  anchor: new google.maps.Point(16, 16),
                }}
                onClick={() => {
                  setActiveInfoWindow(p.id);
                }}
              />
              {activeInfoWindow === p.id && (
                <InfoWindow
                  position={{ lat: p.lat, lng: p.lon }}
                  onCloseClick={() => setActiveInfoWindow(null)}
                >
                  <div style={{ minWidth: 180, padding: '4px 0' }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name || p.category}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>{p.tags?.operator || p.tags?.brand || ''}</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => handleNavigateToLocation(p)}
                        style={{
                          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                          color: 'white',
                          border: 'none',
                          padding: '7px 10px',
                          borderRadius: 8,
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '12px',
                          boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
                          flex: 1,
                        }}
                      >
                        🧭 Routes
                      </button>
                      <button
                        onClick={() => handleCompareRoutes(p)}
                        style={{
                          background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                          color: 'white',
                          border: 'none',
                          padding: '7px 10px',
                          borderRadius: 8,
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '12px',
                          boxShadow: '0 2px 8px rgba(124, 58, 237, 0.3)',
                          flex: 1,
                        }}
                      >
                        ⚖️ Compare
                      </button>
                    </div>
                  </div>
                </InfoWindow>
              )}
            </React.Fragment>
          );
        })}
      </GoogleMap>
    </div>
  );
}
