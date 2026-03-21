import React, { useEffect, useRef, useCallback, useState } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Polyline } from '@react-google-maps/api';
import { useRouter } from 'next/navigation';
import { POI } from '@/features/offline-onboarding/hooks/useNearbyPOIs';
import type { RouteResult } from '@/features/offline-onboarding/hooks/useRoute';

const containerStyle = { height: '80vh', width: '100%' };

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
  route?: RouteResult | null;
  displayPois: POI[];
  activeCategories: Record<string, boolean>;
  setForcedCenter: (c: [number, number] | null) => void;
  setSelectedPackId: (id: string | null) => void;
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

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function computeOfflineBounds(
  center: [number, number],
  points: Array<{ lat: number; lon: number }>
) {
  const baseLatSpan = 0.02;
  const baseLonSpan = 0.02;
  let minLat = center[0] - baseLatSpan;
  let maxLat = center[0] + baseLatSpan;
  let minLon = center[1] - baseLonSpan;
  let maxLon = center[1] + baseLonSpan;

  for (const p of points) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLon = Math.min(minLon, p.lon);
    maxLon = Math.max(maxLon, p.lon);
  }

  const latPad = Math.max((maxLat - minLat) * 0.12, 0.005);
  const lonPad = Math.max((maxLon - minLon) * 0.12, 0.005);
  return {
    minLat: minLat - latPad,
    maxLat: maxLat + latPad,
    minLon: minLon - lonPad,
    maxLon: maxLon + lonPad,
  };
}

export default function GoogleMapView({ center, displayPosition, forcedCenter, setSelectedDest, route, displayPois, activeCategories }: Props) {
  const router = useRouter();
  const mapRef = useRef<google.maps.Map | null>(null);
  const [activeInfoWindow, setActiveInfoWindow] = useState<string | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
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
    const sourceLat = displayPosition ? displayPosition[0] : center[0];
    const sourceLng = displayPosition ? displayPosition[1] : center[1];
    const params = new URLSearchParams({
      destination: poi.name || poi.category,
      sourceLat: sourceLat.toString(),
      sourceLng: sourceLng.toString(),
      destLat: poi.lat.toString(),
      destLng: poi.lon.toString(),
    });
    router.push(`/route-options?${params.toString()}`);
  };

  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

  if (!isLoaded) {
    if (isOffline || !!loadError) {
      const visiblePois = (displayPois || []).filter((p) => activeCategories[p.category]);
      const routePoints: Array<{ lat: number; lon: number }> =
        (route?.geometry || []).map(([lat, lng]: [number, number]) => ({ lat, lon: lng }));
      const bounds = computeOfflineBounds(center, [...visiblePois, ...routePoints]);
      const latSpan = Math.max(bounds.maxLat - bounds.minLat, 0.0001);
      const lonSpan = Math.max(bounds.maxLon - bounds.minLon, 0.0001);
      const toXY = (lat: number, lon: number) => ({
        x: clamp01((lon - bounds.minLon) / lonSpan) * 100,
        y: (1 - clamp01((lat - bounds.minLat) / latSpan)) * 100,
      });
      const userXY = toXY(center[0], center[1]);
      const offlinePolyline = routePoints.map((p) => {
        const { x, y } = toXY(p.lat, p.lon);
        return `${x},${y}`;
      }).join(' ');

      return (
        <div style={{ flex: '0 0 60%', minWidth: 0, height: '80vh', position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid #cbd5e1', background: 'linear-gradient(180deg,#f8fafc,#e2e8f0)' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(to right, rgba(148,163,184,0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.25) 1px, transparent 1px)', backgroundSize: '36px 36px' }} />
          <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 5, background: '#0f172a', color: 'white', fontSize: 12, borderRadius: 9999, padding: '4px 10px' }}>
            Offline map mode
          </div>
          {offlinePolyline && (
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
              <polyline
                points={offlinePolyline}
                fill="none"
                stroke="#2563eb"
                strokeWidth="0.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
          <div
            style={{
              position: 'absolute',
              left: `${userXY.x}%`,
              top: `${userXY.y}%`,
              width: 18,
              height: 18,
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              background: '#2563eb',
              border: '3px solid white',
              boxShadow: '0 0 0 6px rgba(37,99,235,0.22)',
              zIndex: 3,
            }}
            title={displayPosition ? 'You are here (live/cached location)' : 'Default location'}
          />
          {visiblePois.map((p) => {
            const { x, y } = toXY(p.lat, p.lon);
            const color = getPoiColor(p.category);
            const label = getPoiLabel(p.category);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setSelectedDest({ lat: p.lat, lon: p.lon });
                  setActiveInfoWindow(p.id);
                }}
                style={{
                  position: 'absolute',
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: 'translate(-50%, -50%)',
                  width: 28,
                  height: 28,
                  borderRadius: 9999,
                  border: '2px solid #ffffff',
                  background: color,
                  color: 'white',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  zIndex: 2,
                }}
                title={p.name || p.category}
              >
                {label}
              </button>
            );
          })}
          {activeInfoWindow && (() => {
            const p = visiblePois.find((poi) => poi.id === activeInfoWindow);
            if (!p) return null;
            const { x, y } = toXY(p.lat, p.lon);
            return (
              <div
                style={{
                  position: 'absolute',
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: 'translate(-50%, calc(-100% - 14px))',
                  minWidth: 180,
                  background: 'white',
                  borderRadius: 10,
                  boxShadow: '0 12px 30px rgba(15,23,42,0.22)',
                  border: '1px solid #cbd5e1',
                  padding: 10,
                  zIndex: 6,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name || p.category}</div>
                  <button type="button" onClick={() => setActiveInfoWindow(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}>✕</button>
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>{p.tags?.operator || p.tags?.brand || ''}</div>
                <button
                  onClick={() => handleNavigateToLocation(p)}
                  style={{
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '12px',
                    width: '100%',
                  }}
                >
                  🧭 Go & Compare Routes
                </button>
              </div>
            );
          })()}
        </div>
      );
    }

    return (
      <div style={{ flex: '0 0 60%', minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', background: '#f1f5f9' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>🗺️</div>
          <p style={{ color: '#64748b' }}>Loading Google Maps...</p>
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
    <div style={{ flex: '0 0 60%', minWidth: 0 }}>
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
                  setSelectedDest({ lat: p.lat, lon: p.lon });
                  setActiveInfoWindow(p.id);
                }}
              />
              {activeInfoWindow === p.id && (
                <InfoWindow
                  position={{ lat: p.lat, lng: p.lon }}
                  onCloseClick={() => setActiveInfoWindow(null)}
                >
                  <div style={{ minWidth: 160, padding: '4px 0' }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name || p.category}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>{p.tags?.operator || p.tags?.brand || ''}</div>
                    <button
                      onClick={() => handleNavigateToLocation(p)}
                      style={{
                        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '13px',
                        boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
                        width: '100%',
                      }}
                    >
                      🧭 Go & Compare Routes
                    </button>
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
