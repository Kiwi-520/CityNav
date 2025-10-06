import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import LocationDetails from '@/components/LocationDetails';
import { useOfflineLocation } from '@/hooks/useOfflineLocation';
import { useRoute } from '@/hooks/useRoute';
import useNearbyPOIs, { POI } from '@/hooks/useNearbyPOIs';
import logger from '@/lib/logger';
import packManager from '@/lib/packManager';
import PackManagerPanel from '@/components/PackManagerPanel';
// rightStyles removed in favour of Tailwind utility classes

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

export default function LeafletMap() {
  const [pos, setPos] = useState<[number, number] | null>(null);
  const [selectedDest, setSelectedDest] = useState<{ lat: number; lon: number } | null>(null);
  const [packPois, setPackPois] = useState<POI[] | null>(null);
  const [forcedCenter, setForcedCenter] = useState<[number, number] | null>(null);
  const { isOnline, storedLocation } = useOfflineLocation();
  const displayLat = pos ? pos[0] : (!isOnline && storedLocation ? storedLocation.latitude : null);
  const displayLon = pos ? pos[1] : (!isOnline && storedLocation ? storedLocation.longitude : null);
  // If live geolocation (pos) isn't available yet but the app has a stored location
  // use the stored location or sensible default so the map centers correctly.

  const { route, loading: routeLoading, error: routeError } = useRoute(
    displayLat != null && displayLon != null ? { lat: displayLat, lon: displayLon } : null,
    selectedDest
  );

  useEffect(() => {
    if (!navigator.geolocation) {
      // If no geolocation and we're offline, try to use stored location
      if (!isOnline && storedLocation) {
        setPos([storedLocation.latitude, storedLocation.longitude]);
      }
      return;
    }
    
    const watchId = navigator.geolocation.watchPosition(
      (p) => setPos([p.coords.latitude, p.coords.longitude]),
      (error) => {
        logger.error('Geolocation error:', error);
        // If geolocation fails and we're offline, use stored location
        if (!isOnline && storedLocation) {
          setPos([storedLocation.latitude, storedLocation.longitude]);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [isOnline, storedLocation]); // Add dependencies for error fallback

  // Separate effect to handle offline mode with stored location
  useEffect(() => {
    if (!isOnline && storedLocation && !pos) {
      setPos([storedLocation.latitude, storedLocation.longitude]);
    }
  }, [isOnline, storedLocation, pos]);

  // Memoize calculated values to prevent unnecessary re-renders
  const center: [number, number] = useMemo(() => {
    return pos || (!isOnline && storedLocation ? [storedLocation.latitude, storedLocation.longitude] : [28.6139, 77.2090]);
  }, [pos, isOnline, storedLocation]);

  const displayPosition = useMemo(() => {
    return pos || (!isOnline && storedLocation ? [storedLocation.latitude, storedLocation.longitude] as [number, number] : null);
  }, [pos, isOnline, storedLocation]);

  // Nearby POIs
  const latForPOI = displayPosition ? displayPosition[0] : null;
  const lonForPOI = displayPosition ? displayPosition[1] : null;
  const { data: pois, loading: poisLoading, error: poisError, refresh: refreshPOIs } = useNearbyPOIs(latForPOI, lonForPOI, 1600);
  const defaultCategories: Record<string, boolean> = {
    hospital: true,
    clinic: true,
    railway: true,
    bus_stop: true,
    bank: true,
    atm: true,
    hotel: true,
    restaurant: true,
  };

  const [activeCategories, setActiveCategories] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('poi_filters');
      if (raw) return { ...defaultCategories, ...JSON.parse(raw) };
    } catch {
      // ignore
    }
    return defaultCategories;
  });

  // Persist filter choices so user sees same categories on reload
  useEffect(() => {
    try {
      localStorage.setItem('poi_filters', JSON.stringify(activeCategories));
    } catch {
      // ignore storage errors
    }
  }, [activeCategories]);

  // Helper: compute great-circle distance (approx) in meters
  function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
    const toRad = (d: number) => d * Math.PI / 180;
    const R = 6371000; // earth radius meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Auto-create a pack when POIs load while online (dev-friendly). Uses deterministic id per center+radius to avoid duplicates.
  useEffect(() => {
    const AUTO_CREATE_PACK = true; // toggle for dev; set false to disable
    const RADIUS = 1600;
    if (!AUTO_CREATE_PACK) return;
    if (!isOnline) return;
    if (!pois || pois.length === 0) return;

    (async () => {
      try {
        const latC = center[0];
        const lonC = center[1];
        const id = `pack_${latC.toFixed(5)}_${lonC.toFixed(5)}_${RADIUS}`;
        const existing = await packManager.getPackManifest(id);
        if (existing) return; // already created

        const ndjson = pois.map(p => JSON.stringify(p)).join('\n') + '\n';
        // gzip compress using pako
        try {
          // lazy import to keep pako out of SSR paths
          const pako = await import('pako');
          const encoded = new TextEncoder().encode(ndjson);
          const compressed = pako.gzip(encoded);
          const compressedBlob = new Blob([compressed], { type: 'application/gzip' });
          const manifest = {
            id,
            bbox: [lonC - 0.01, latC - 0.01, lonC + 0.01, latC + 0.01],
            center: [lonC, latC],
            radiusMeters: RADIUS,
            categories: Object.keys(activeCategories).filter(k => !!activeCategories[k]),
            createdAt: new Date().toISOString(),
            sizeBytes: encoded.length,
            compressedBytes: compressedBlob.size,
            contentEncoding: 'gzip',
            itemCount: pois.length,
          };
          await packManager.createPack(manifest as any, compressedBlob);
        } catch (err) {
          // fallback to uncompressed
          const blob = new Blob([ndjson], { type: 'application/x-ndjson' });
          const manifest = {
            id,
            bbox: [lonC - 0.01, latC - 0.01, lonC + 0.01, latC + 0.01],
            center: [lonC, latC],
            radiusMeters: RADIUS,
            categories: Object.keys(activeCategories).filter(k => !!activeCategories[k]),
            createdAt: new Date().toISOString(),
            sizeBytes: blob.size,
            itemCount: pois.length,
          };
          await packManager.createPack(manifest as any, blob);
        }
  logger.info('Auto-created pack', id);
      } catch (err) {
        console.warn('Auto-create pack failed', err);
      }
    })();
  }, [pois, isOnline]);

  // When offline, try to load a nearby pack and use it as POI source
  useEffect(() => {
    if (isOnline) {
      setPackPois(null);
      return;
    }
    (async () => {
      try {
        const latC = displayPosition ? displayPosition[0] : center[0];
        const lonC = displayPosition ? displayPosition[1] : center[1];
        const manifests = await packManager.listPacks();
        if (!manifests || manifests.length === 0) return;
        // find nearest manifest within its radius
        let chosen: any = null;
        for (const m of manifests) {
          if (!m.center || !Array.isArray(m.center) || m.center.length < 2) continue;
          const mLon = m.center[0];
          const mLat = m.center[1];
          const d = distanceMeters(latC, lonC, mLat, mLon);
          if (d <= (m.radiusMeters || 1000) * 1.1) { chosen = m; break; }
        }
        if (!chosen) return;
        const txt = await packManager.readPackAsText(chosen.id);
        if (!txt) return;
        const lines = txt.split('\n').filter(Boolean);
        const parsed = lines.map(l => JSON.parse(l) as POI);
          setPackPois(parsed);
          // when loading automatically from nearby pack, also set forced center so map recenters
          if (chosen.center && Array.isArray(chosen.center) && chosen.center.length >= 2) {
            setForcedCenter([chosen.center[1], chosen.center[0]]);
          }
  logger.info('Loaded pack', chosen.id, 'with', parsed.length, 'pois');
      } catch (err) {
        console.warn('Loading pack failed', err);
      }
    })();
  }, [isOnline, displayPosition]);

  // When a pack is selected explicitly, prioritize it regardless of online state
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);

  // Choose which POIs to display: if a pack has been selected explicitly, always show it.
  const displayPois: POI[] = selectedPackId ? (packPois || []) : (isOnline ? (pois || []) : (packPois || pois || []));


  // Compute compressed size preview for current POI selection (for UI)
  const [compressedPreview, setCompressedPreview] = useState<{ bytes: number; gzipped: boolean } | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const toPack = (pois || []).filter(p => activeCategories[p.category]);
        if (!toPack || toPack.length === 0) {
          setCompressedPreview(null);
          return;
        }
        const ndjson = toPack.map(p => JSON.stringify(p)).join('\n') + '\n';
        // try gzip
        try {
          const pako = await import('pako');
          const encoded = new TextEncoder().encode(ndjson);
          const compressed = pako.gzip(encoded);
          if (!cancelled) setCompressedPreview({ bytes: compressed.length, gzipped: true });
        } catch {
          // fallback to uncompressed size
          const blob = new Blob([ndjson], { type: 'application/x-ndjson' });
          if (!cancelled) setCompressedPreview({ bytes: blob.size, gzipped: false });
        }
      } catch (err) {
        if (!cancelled) setCompressedPreview(null);
      }
    })();
    return () => { cancelled = true; };
  }, [pois, activeCategories]);

  // No POI categories displayed in this simplified view

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
      {/* Left: Map - 60% */}
      <div style={{ flex: '0 0 60%', minWidth: 0 }}>
        {/** Keep the map container sizing responsive inside this flex child **/}
        <MapContainer
          center={center}
          zoom={15}
          style={{ height: '80vh', width: '100%' }}
        >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
        />
        <Marker position={center}>
          <Popup>
            {pos ? 'You are here (live location).' : 
             (!isOnline && storedLocation ? 'Last known location (offline)' : 'Default location')}
          </Popup>
        </Marker>
  <Recenter position={forcedCenter || displayPosition} />
        {route && route.geometry && (
          <Polyline positions={route.geometry as [number, number][]} pathOptions={{ color: '#2563eb' }} />
        )}
  {/* POI markers */}
  {displayPois && displayPois.filter(p => activeCategories[p.category]).map((p: POI) => {
          const color = p.category === 'hospital' || p.category === 'clinic' ? '#dc2626' :
                        p.category === 'railway' ? '#0ea5e9' :
                        p.category === 'bus_stop' ? '#16a34a' :
                        p.category === 'bank' || p.category === 'atm' ? '#7c3aed' :
                        p.category === 'hotel' ? '#f59e0b' :
                        p.category === 'restaurant' ? '#ef4444' : '#6b7280';

          // Small SVG glyphs per category (keeps everything inline, no extra assets)
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
          const icon = L.divIcon({
            className: 'poi-marker',
            html,
            iconSize: [26, 26],
            iconAnchor: [13, 13],
          });
          return (
            <Marker key={p.id} position={[p.lat, p.lon]} icon={icon} eventHandlers={{ click: () => setSelectedDest({ lat: p.lat, lon: p.lon }) }}>
              <Popup>
                <div style={{ minWidth: 160 }}>
                  <div style={{ fontWeight: 700 }}>{p.name || p.category}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{p.tags?.operator || p.tags?.brand || ''}</div>
                  <div style={{ marginTop: 6 }}>
                    <button onClick={() => setSelectedDest({ lat: p.lat, lon: p.lon })} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '6px 8px', borderRadius: 6, cursor: 'pointer' }}>Navigate</button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
        </MapContainer>
      </div>

      {/* Right: Essentials - 40% */}
      <div className="flex-0 basis-[40%] max-w-[40%] px-3">
        {/* Status panel showing online/offline state */}
        <div className="flex justify-end mb-3">
          <div className="bg-white rounded-xl border border-slate-100 p-3 text-sm shadow-sm">
            <div className="font-medium">Location</div>
            <div className="text-xs text-slate-600">{pos ? 'Live' : (!isOnline && storedLocation ? 'Stored' : 'Default')}</div>
            {!isOnline && <div className="text-xs text-red-600 mt-1">Offline</div>}
            {selectedPackId && (
              <div className="mt-2 flex items-center gap-2">
                <div className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md text-xs">{selectedPackId}</div>
                <button onClick={() => { setSelectedPackId(null); setPackPois(null); setForcedCenter(null); }} className="px-2 py-1 rounded-md bg-red-500 text-white text-xs">Unload</button>
              </div>
            )}
          </div>
        </div>
        {/* Legend */}
        <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
          <div className="font-semibold mb-2">Legend</div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'hospital', label: 'Hospital/Clinic', color: '#dc2626' },
              { key: 'railway', label: 'Railway station', color: '#0ea5e9' },
              { key: 'bus_stop', label: 'Bus stop', color: '#16a34a' },
              { key: 'bank', label: 'Bank/ATM', color: '#7c3aed' },
              { key: 'hotel', label: 'Hotel', color: '#f59e0b' },
              { key: 'restaurant', label: 'Restaurant', color: '#ef4444' },
            ].map((item) => {
              const enabled = !!activeCategories[item.key];
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveCategories(s => ({ ...s, [item.key]: !s[item.key] }))}
                  className={`flex gap-3 items-center text-sm px-2 py-1 rounded-md ${enabled ? 'opacity-100' : 'opacity-60'}`}
                  title={enabled ? `Hide ${item.label}` : `Show ${item.label}`}
                >
                  <div style={{ width: 16, height: 16, borderRadius: 4, background: item.color, border: '2px solid #fff', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }} />
                  <div className="text-slate-700">{item.label}</div>
                </button>
              );
            })}
          </div>
        </div>
        {!isOnline && (
          <div style={{ padding: 8, background: "#fff3cd", border: "1px solid #ffeaa7", borderRadius: 4, margin: "8px 12px" }}>
            <small style={{ color: "#856404" }}>
              📡 You&apos;re currently offline. Showing {storedLocation ? 'last known location' : 'default location'}.
            </small>
          </div>
        )}

        {/* POI filter/list panel */}
        <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Nearby services</div>
            <div className="text-sm text-slate-500">{poisLoading ? 'Refreshing…' : `${pois ? pois.length : 0} found`}</div>
          </div>
            <div className="mt-2 flex gap-2 flex-wrap items-center">
            {Object.keys(activeCategories).map((k) => (
              <label key={k} className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4" checked={!!activeCategories[k]} onChange={() => setActiveCategories(s => ({ ...s, [k]: !s[k] }))} />
                <span className="capitalize">{k.replace('_', ' ')}</span>
              </label>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <button onClick={() => refreshPOIs()} className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-sm">Refresh</button>
              <button
                onClick={async () => {
                  try {
                    const id = `dev-pack-${Date.now()}`;
                    const latC = displayPosition ? displayPosition[0] : center[0];
                    const lonC = displayPosition ? displayPosition[1] : center[1];
                    const categories = Object.keys(activeCategories).filter(k => !!activeCategories[k]);

                    let toPack = (pois || []).filter(p => activeCategories[p.category]);
                    if (!toPack || toPack.length === 0) {
                      // fallback sample POI
                      toPack = [{ id: 'node:dev:1', lat: latC, lon: lonC, name: 'DEV POI', category: 'hospital', tags: {} }];
                    }

                    const ndjson = toPack.map(p => JSON.stringify(p)).join('\n') + '\n';
                    const blob = new Blob([ndjson], { type: 'application/x-ndjson' });

                    const manifest = {
                      id,
                      bbox: [lonC - 0.01, latC - 0.01, lonC + 0.01, latC + 0.01],
                      center: [lonC, latC],
                      radiusMeters: 1000,
                      categories,
                      createdAt: new Date().toISOString(),
                      sizeBytes: blob.size,
                      itemCount: toPack.length,
                    };

                    await packManager.createPack(manifest as any, blob);
                    const packs = await packManager.listPacks();
                    logger.debug('packs after create:', packs);
                    // Keep the alert only in development builds
                    if (process.env.NODE_ENV === 'development') alert(`Pack ${id} created — open DevTools > Application > IndexedDB > citynav-packs to inspect.`);
                  } catch (err) {
                    console.error('create pack failed', err);
                    alert('Pack creation failed: ' + (err as any)?.message);
                  }
                }}
                className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm"
              >
                Create dev pack
              </button>
              {compressedPreview && (
                <div className="text-sm text-slate-600">{compressedPreview.gzipped ? 'Download size: ' : 'Pack size: '}{(compressedPreview.bytes / 1024).toFixed(1)} KB{compressedPreview.gzipped ? ' (gzipped)' : ''}</div>
              )}
            </div>
          </div>
          <div style={{ marginTop: 8, maxHeight: '60vh', overflow: 'auto' }}>
            {displayPois && displayPois.length > 0 ? (
              <ul style={{ paddingLeft: 12, margin: 0 }}>
                {displayPois.filter(p => activeCategories[p.category]).slice(0, 30).map((p) => (
                  <li key={p.id} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name || p.category}</div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>{p.category.replace('_', ' ')}</div>
                      </div>
                      <div>
                        <button onClick={() => setSelectedDest({ lat: p.lat, lon: p.lon })} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '6px 8px', borderRadius: 6, cursor: 'pointer' }}>Go</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{ fontSize: 13, color: '#6b7280' }}>{poisLoading ? 'Loading nearby services…' : 'No nearby services found.'}</div>
            )}
            {poisError && <div style={{ marginTop: 8, color: '#b91c1c' }}>POI error: {poisError}</div>}
          </div>
          {/* Pack manager panel */}
          <PackManagerPanel onSelect={(manifest, poisFromPack) => {
            // set the POIs coming from the selected pack and recenter the map
            setPackPois(poisFromPack);
            setSelectedPackId(manifest.id);
            if (manifest.center && Array.isArray(manifest.center) && manifest.center.length >= 2) {
              // manifest.center is [lon, lat]
              setForcedCenter([manifest.center[1], manifest.center[0]]);
            }
          }} />
        </div>
      </div>

      {/* In-app navigation panel (inside right column, non-overlapping) */}
      {selectedDest && (
        <div style={{ position: 'relative', margin: '0 12px', zIndex: 1000 }}>
          <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: 8, padding: 14, width: 'min(360px, 92vw)', maxHeight: '80vh', overflow: 'auto', boxShadow: '0 4px 14px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Navigation</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{selectedDest ? `${selectedDest.lat.toFixed(5)}, ${selectedDest.lon.toFixed(5)}` : ''}</div>
              </div>
              <div style={{ marginLeft: 8 }}>
                <button onClick={() => setSelectedDest(null)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
            {routeLoading && <div style={{ marginTop: 10 }}>Calculating route...</div>}
            {routeError && <div style={{ marginTop: 10, color: '#b91c1c' }}>{routeError}</div>}
            {route && (
              <div style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ fontSize: 13, color: '#374151' }}><strong>Distance</strong><div style={{ fontSize: 12 }}>{(route.distance/1000).toFixed(2)} km</div></div>
                  <div style={{ fontSize: 13, color: '#374151' }}><strong>ETA</strong><div style={{ fontSize: 12 }}>{Math.ceil(route.duration/60)} min</div></div>
                </div>
                <div style={{ marginTop: 10, maxHeight: 220, overflow: 'auto', paddingRight: 6 }}>
                  <ol style={{ paddingLeft: 16, margin: 0 }}>
                    {route.steps.map((s, i) => (
                      <li key={i} style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: '0.95em', color: '#111827' }}>{s.maneuver || s.name || 'Continue'}</div>
                        <div style={{ fontSize: '0.8em', color: '#6b7280' }}>{(s.distance/1000).toFixed(2)} km • {Math.ceil(s.duration/60)} min</div>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
  {displayPosition && <LocationDetails lat={displayPosition[0]} lon={displayPosition[1]} />}
      {/* Debug panel removed */}
    </div>
  );
}