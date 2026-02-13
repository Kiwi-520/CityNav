import React, { useEffect, useRef, useCallback, useState } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Polyline } from '@react-google-maps/api';
import { useRouter } from 'next/navigation';
import { POI } from '@/features/offline-onboarding/hooks/useNearbyPOIs';

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
  route?: any;
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

export default function GoogleMapView({ center, displayPosition, forcedCenter, setSelectedDest, route, displayPois, activeCategories }: Props) {
  const router = useRouter();
  const mapRef = useRef<google.maps.Map | null>(null);
  const [activeInfoWindow, setActiveInfoWindow] = useState<string | null>(null);

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

  if (!isLoaded) {
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
