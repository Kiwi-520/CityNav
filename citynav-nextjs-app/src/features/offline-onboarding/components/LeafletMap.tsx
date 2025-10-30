import { useEffect, useState, useMemo } from 'react';
import LocationDetailsHorizontal from '@/features/offline-onboarding/components/LocationDetailsHorizontal';
import TopNav from '@/features/offline-onboarding/components/TopNav';
import CategoryFilterSidebar from '@/features/offline-onboarding/components/CategoryFilterSidebar';
import { useOfflineLocation } from '@/features/offline-onboarding/hooks/useOfflineLocation';
import { useRoute } from '@/features/offline-onboarding/hooks/useRoute';
import useNearbyPOIs, { POI } from '@/features/offline-onboarding/hooks/useNearbyPOIs';
import logger from '@/features/offline-onboarding/lib/logger';
import packManager from '@/features/offline-onboarding/lib/packManager';
import MapView from '@/features/offline-onboarding/components/MapView';
import NavigationPanel from '@/features/offline-onboarding/components/NavigationPanel';

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

  // Auto-create a pack when POIs load while online (dev-friendly).
  // Uses deterministic id per center+radius to avoid duplicates. Disabled by default.
  useEffect(() => {
    const AUTO_CREATE_PACK = false; // toggle for dev; set true to enable auto-create during development
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
        logger.warn('Auto-create pack failed', err);
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
        logger.warn('Loading pack failed', err);
      }
    })();
  }, [isOnline, displayPosition]);

  // When a pack is selected explicitly, prioritize it regardless of online state
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);

  // Choose which POIs to display: if a pack has been selected explicitly, always show it.
  const displayPois: POI[] = selectedPackId ? (packPois || []) : (isOnline ? (pois || []) : (packPois || pois || []));

  // Auto-create pack every 10 minutes with location-based naming
  useEffect(() => {
    if (!isOnline) return; // Only create packs when online
    if (!displayPosition) return; // Need valid position
    
    const AUTO_PACK_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds
    
    const createAutoPackWithLocation = async () => {
      try {
        if (!pois || pois.length === 0) {
          logger.info('No POIs available for auto-pack creation');
          return;
        }

        const latC = displayPosition[0];
        const lonC = displayPosition[1];
        const RADIUS = 1600;

        // Fetch location name for pack naming
        let locationName = 'Unknown Location';
        try {
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latC}&lon=${lonC}&format=jsonv2&addressdetails=1`,
            { signal: AbortSignal.timeout(5000) }
          );
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            const addr = geoData.address || {};
            // Prefer area/neighbourhood/suburb/city_district/locality for more precise names
            const area = addr.neighbourhood || addr.suburb || addr.city_district || addr.locality || addr.hamlet || addr.village;
            const city = addr.city || addr.town || addr.village || addr.county || addr.state;
            const country = addr.country;
            if (area && city) {
              locationName = `${area}, ${city}`;
            } else if (area) {
              locationName = `${area}${city ? ', ' + city : ''}`;
            } else if (city) {
              locationName = city;
            } else if (country) {
              locationName = country;
            } else {
              locationName = `${latC.toFixed(3)}, ${lonC.toFixed(3)}`;
            }
          }
        } catch (err) {
          logger.warn('Geocoding failed for pack naming, using coordinates', err);
          locationName = `${latC.toFixed(3)}, ${lonC.toFixed(3)}`;
        }

        // Create unique ID with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const id = `auto_${locationName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}`;
        
        const ndjson = pois.map(p => JSON.stringify(p)).join('\n') + '\n';

        // Try gzip compression
        try {
          const pako = await import('pako');
          const encoded = new TextEncoder().encode(ndjson);
          const compressed = pako.gzip(encoded);
          const compressedBlob = new Blob([compressed], { type: 'application/gzip' });
          
          const manifest = {
            id,
            name: `${locationName} - ${new Date().toLocaleString()}`,
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
          logger.info('Auto-created pack:', locationName, 'with', pois.length, 'POIs');
          
          // Show notification (you can add a toast library later)
          if (typeof window !== 'undefined') {
            console.log(`✅ Auto-pack created: ${locationName} (${pois.length} places)`);
          }
        } catch (err) {
          // Fallback to uncompressed
          const blob = new Blob([ndjson], { type: 'application/x-ndjson' });
          const manifest = {
            id,
            name: `${locationName} - ${new Date().toLocaleString()}`,
            bbox: [lonC - 0.01, latC - 0.01, lonC + 0.01, latC + 0.01],
            center: [lonC, latC],
            radiusMeters: RADIUS,
            categories: Object.keys(activeCategories).filter(k => !!activeCategories[k]),
            createdAt: new Date().toISOString(),
            sizeBytes: blob.size,
            itemCount: pois.length,
          };
          
          await packManager.createPack(manifest as any, blob);
          logger.info('Auto-created pack (uncompressed):', locationName);
        }
      } catch (err) {
        logger.error('Auto-pack creation failed', err);
      }
    };

    // Create first pack immediately
    createAutoPackWithLocation();

    // Then create pack every 10 minutes
    const intervalId = setInterval(createAutoPackWithLocation, AUTO_PACK_INTERVAL);

    // Cleanup on unmount or when dependencies change
    return () => clearInterval(intervalId);
  }, [isOnline, displayPosition, pois, activeCategories]); // Re-run when these change


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

  // Helper function to create a pack from current POIs
  const createPackFromCurrentPOIs = async () => {
    if (!pois || pois.length === 0) {
      alert('No POIs available to create a pack');
      return;
    }
    
    try {
      const latC = (displayPosition ? displayPosition[0] : center[0]);
      const lonC = (displayPosition ? displayPosition[1] : center[1]);
      const RADIUS = 1600;
      // Derive a friendly location name via reverse geocoding for better discoverability offline
      let locationName = 'Unknown Location';
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latC}&lon=${lonC}&format=jsonv2&addressdetails=1`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          const addr = geoData.address || {};
          const area = addr.neighbourhood || addr.suburb || addr.city_district || addr.locality || addr.hamlet || addr.village;
          const city = addr.city || addr.town || addr.village || addr.county || addr.state;
          const country = addr.country;
          if (area && city) {
            locationName = `${area}, ${city}`;
          } else if (area) {
            locationName = `${area}${city ? ', ' + city : ''}`;
          } else if (city) {
            locationName = city;
          } else if (country) {
            locationName = country;
          } else {
            locationName = `${latC.toFixed(3)}, ${lonC.toFixed(3)}`;
          }
        } else {
          locationName = `${latC.toFixed(3)}, ${lonC.toFixed(3)}`;
        }
      } catch (err) {
        logger.warn('Geocoding failed for manual pack naming, using coordinates', err);
        locationName = `${latC.toFixed(3)}, ${lonC.toFixed(3)}`;
      }

      // Create unique ID with timestamp, mark as manual
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const id = `manual_${locationName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}`;
      
      const filteredPOIs = pois.filter(p => activeCategories[p.category]);
      const ndjson = filteredPOIs.map(p => JSON.stringify(p)).join('\n') + '\n';
      
      try {
        const pako = await import('pako');
        const encoded = new TextEncoder().encode(ndjson);
        const compressed = pako.gzip(encoded);
        const compressedBlob = new Blob([compressed], { type: 'application/gzip' });
        const manifest = {
          id,
          name: `${locationName} - ${new Date().toLocaleString()}`,
          bbox: [lonC - 0.01, latC - 0.01, lonC + 0.01, latC + 0.01],
          center: [lonC, latC],
          radiusMeters: RADIUS,
          categories: Object.keys(activeCategories).filter(k => !!activeCategories[k]),
          createdAt: new Date().toISOString(),
          sizeBytes: encoded.length,
          compressedBytes: compressedBlob.size,
          contentEncoding: 'gzip',
          itemCount: filteredPOIs.length,
        };
        await packManager.createPack(manifest as any, compressedBlob);
        logger.info('Manual pack created successfully', id);
        alert(`Pack created: ${locationName} (${filteredPOIs.length} places)`);
      } catch (err) {
        const blob = new Blob([ndjson], { type: 'application/x-ndjson' });
        const manifest = {
          id,
          name: `${locationName} - ${new Date().toLocaleString()}`,
          bbox: [lonC - 0.01, latC - 0.01, lonC + 0.01, latC + 0.01],
          center: [lonC, latC],
          radiusMeters: RADIUS,
          categories: Object.keys(activeCategories).filter(k => !!activeCategories[k]),
          createdAt: new Date().toISOString(),
          sizeBytes: blob.size,
          itemCount: filteredPOIs.length,
        };
        await packManager.createPack(manifest as any, blob);
        logger.info('Manual pack created successfully (uncompressed)', id);
        alert(`Pack created: ${locationName} (${filteredPOIs.length} places)`);
      }
    } catch (err) {
      logger.error('Pack creation failed', err);
      alert('Pack creation failed: ' + (err as any)?.message);
    }
  };

  return (
    <>
      {/* Custom shimmer animation for unload button */}
      <style jsx global>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>

      <div className="flex flex-col h-screen">
      {/* Top Navigation */}
      <TopNav 
        onPackSelect={(manifest, pois) => {
          setPackPois(pois);
          setSelectedPackId(manifest.id);
          if (manifest.center && Array.isArray(manifest.center) && manifest.center.length >= 2) {
            setForcedCenter([manifest.center[1], manifest.center[0]]);
          }
        }}
        createPack={createPackFromCurrentPOIs}
        onPackCreated={() => {
          // Optionally refresh or notify user
        }}
      />

      {/* Location Details Horizontal */}
      <div className="px-6 py-4">
        {displayPosition ? (
          <LocationDetailsHorizontal lat={displayPosition[0]} lon={displayPosition[1]} />
        ) : (
          <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-xl px-6 py-3 shadow-md">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              <span className="text-sm text-slate-500">Waiting for location...</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Content: Sidebar + Map */}
      <div className="flex-1 flex overflow-hidden">
        {/* Category Filter Sidebar */}
        <CategoryFilterSidebar 
          pois={displayPois}
          poisLoading={poisLoading}
          userPosition={displayPosition}
          onNavigate={(poi) => {
            setSelectedDest({ lat: poi.lat, lon: poi.lon });
          }}
        />

        {/* Map Container */}
        <div className="flex-1 relative">
          <MapView 
            center={center} 
            displayPosition={displayPosition} 
            forcedCenter={forcedCenter} 
            setSelectedDest={setSelectedDest} 
            route={route} 
            displayPois={displayPois} 
            activeCategories={activeCategories} 
            setForcedCenter={setForcedCenter} 
            setSelectedPackId={setSelectedPackId} 
          />

          {/* Unload Pack Button - Top Right Corner */}
          {selectedPackId && (
            <div className="absolute top-4 right-4 z-[1001]">
              <div className="relative group">
                <button
                  onClick={() => {
                    if (confirm('Unload this pack and return to live mode?')) {
                      setSelectedPackId(null);
                      setPackPois(null);
                      setForcedCenter(null);
                    }
                  }}
                  className="relative flex items-center gap-3 px-6 py-3.5 bg-gradient-to-br from-red-500 via-red-600 to-pink-600 hover:from-red-600 hover:via-red-700 hover:to-pink-700 text-white font-bold rounded-2xl shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-red-500/60 active:scale-95 overflow-hidden border-2 border-white/20"
                  title="Unload pack and return to live mode"
                >
                  {/* Animated background gradient */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-shimmer transition-opacity duration-500"></div>
                  
                  {/* Pulsing background effect */}
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 animate-pulse"></div>
                  
                  {/* Icon container with rotation on hover */}
                  <div className="relative z-10 p-1.5 bg-white/20 rounded-lg backdrop-blur-sm transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  
                  {/* Text with subtle slide effect */}
                  <div className="relative z-10 flex flex-col items-start">
                    <span className="text-sm tracking-wide font-extrabold leading-tight">Unload Pack</span>
                    <span className="text-[10px] font-normal opacity-90 tracking-wider">Return to Live</span>
                  </div>
                  
                  {/* Live mode indicator badge with pulse */}
                  <div className="relative z-10 flex items-center gap-1.5 ml-1 px-2.5 py-1 bg-green-500/30 border border-green-300/30 rounded-full backdrop-blur-sm">
                    <div className="relative">
                      <div className="w-2 h-2 bg-green-300 rounded-full"></div>
                      <div className="absolute inset-0 w-2 h-2 bg-green-300 rounded-full animate-ping"></div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-green-50">Live</span>
                  </div>
                </button>
                
                {/* Multi-layer glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/40 via-pink-500/40 to-red-500/40 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 animate-pulse"></div>
                <div className="absolute inset-0 bg-red-600/20 rounded-2xl blur-2xl opacity-50 group-hover:opacity-80 transition-opacity duration-300 -z-20"></div>
              </div>
            </div>
          )}

          {/* Navigation Panel Overlay */}
          {selectedDest && (
            <div className="absolute top-4 left-4 z-[1001]">
              <NavigationPanel 
                selectedDest={selectedDest} 
                setSelectedDest={setSelectedDest} 
                route={route} 
                routeLoading={routeLoading} 
                routeError={routeError} 
              />
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
