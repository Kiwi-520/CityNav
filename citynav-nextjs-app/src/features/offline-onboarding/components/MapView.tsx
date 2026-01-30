import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useRouter } from 'next/navigation';
import { POI } from '@/features/offline-onboarding/hooks/useNearbyPOIs';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/marker-icon-2x.png',
  iconUrl: '/marker-icon.png',
  shadowUrl: '/marker-shadow.png',
});

function Recenter({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, map.getZoom());
  }, [position, map]);
  return null;
}

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

export default function MapView({ center, displayPosition, forcedCenter, setSelectedDest, route, displayPois, activeCategories }: Props) {
  const router = useRouter();

  const handleNavigateToLocation = (poi: POI) => {
    // Get current user position
    const sourceLat = displayPosition ? displayPosition[0] : center[0];
    const sourceLng = displayPosition ? displayPosition[1] : center[1];
    
    // Navigate to route-options page with proper parameters
    const params = new URLSearchParams({
      destination: poi.name || poi.category,
      sourceLat: sourceLat.toString(),
      sourceLng: sourceLng.toString(),
      destLat: poi.lat.toString(),
      destLng: poi.lon.toString(),
    });
    
    router.push(`/route-options?${params.toString()}`);
  };

  return (
    <div style={{ flex: '0 0 60%', minWidth: 0 }}>
      <MapContainer center={center} zoom={15} style={{ height: '80vh', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors' />
        <Marker position={center}>
          <Popup>
            {displayPosition ? 'You are here (live location).' : 'Default location'}
          </Popup>
        </Marker>
        <Recenter position={forcedCenter || displayPosition} />
        {route && route.geometry && (
          <Polyline positions={route.geometry as [number, number][]} pathOptions={{ color: '#2563eb' }} />
        )}

        {displayPois && displayPois.filter(p => activeCategories[p.category]).map((p: POI) => {
          const color = p.category === 'hospital' || p.category === 'clinic' ? '#dc2626' :
                        p.category === 'railway' ? '#0ea5e9' :
                        p.category === 'bus_stop' ? '#16a34a' :
                        p.category === 'bank' || p.category === 'atm' ? '#7c3aed' :
                        p.category === 'hotel' ? '#f59e0b' :
                        p.category === 'restaurant' ? '#ef4444' : '#6b7280';

          const glyph = (() => {
            switch (p.category) {
              case 'hospital':
              case 'clinic':
                return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2v20M6 8h12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
              case 'railway':
                return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 7h18M6 7v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7M7 17l1-2m8 2-1-2" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
              case 'bus_stop':
                return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 7h18M6 7v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7M7 17v2m10-2v2" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
              case 'bank':
              case 'atm':
                return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 10l9-6 9 6M5 10v6M19 10v6M2 20h20" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
              case 'hotel':
                return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 10v7h18v-7M6 10v-2a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v2" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
              case 'restaurant':
                return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 2v12M10 2v12M4 14h14" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
              default:
                return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="5" fill="white"/></svg>`;
            }
          })();

          const html = `<div style="background:${color};width:26px;height:26px;border-radius:8px;border:2px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,0.3);">${glyph}</div>`;
          const icon = L.divIcon({ className: 'poi-marker', html, iconSize: [26, 26], iconAnchor: [13, 13] });

          return (
            <Marker key={p.id} position={[p.lat, p.lon]} icon={icon} eventHandlers={{ click: () => setSelectedDest({ lat: p.lat, lon: p.lon }) }}>
              <Popup>
                <div style={{ minWidth: 160 }}>
                  <div style={{ fontWeight: 700 }}>{p.name || p.category}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{p.tags?.operator || p.tags?.brand || ''}</div>
                  <div style={{ marginTop: 6 }}>
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
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.4)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(37, 99, 235, 0.3)';
                      }}
                    >
                      🧭 Go & Compare Routes
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
