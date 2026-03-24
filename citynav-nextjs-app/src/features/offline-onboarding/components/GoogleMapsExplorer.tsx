import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import LocationDetailsHorizontal from '@/features/offline-onboarding/components/LocationDetailsHorizontal';
import EssentialsNavSidebar from '@/features/offline-onboarding/components/EssentialsNavSidebar';
import CategoryFilterSidebar from '@/features/offline-onboarding/components/CategoryFilterSidebar';
import { useOfflineLocation } from '@/features/offline-onboarding/hooks/useOfflineLocation';
import { useRoute, preCacheRoutesToPOIs } from '@/features/offline-onboarding/hooks/useRoute';
import useNearbyPOIs, { POI } from '@/features/offline-onboarding/hooks/useNearbyPOIs';
import logger from '@/features/offline-onboarding/lib/logger';
import packManager from '@/features/offline-onboarding/lib/packManager';
import GoogleMapView from '@/features/offline-onboarding/components/GoogleMapView';
import NavigationPanel from '@/features/offline-onboarding/components/NavigationPanel';
import DraggableRoutePopup from '@/features/offline-onboarding/components/DraggableRoutePopup';
import { MultimodalRoute } from '@/types/multimodal';

const RouteNavigationView = dynamic(
  () => import('@/components/RouteNavigationView'),
  { ssr: false }
);

export default function GoogleMapsExplorer() {
  const [pos, setPos] = useState<[number, number] | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [selectedDest, setSelectedDest] = useState<{ lat: number; lon: number } | null>(null);
  const [packPois, setPackPois] = useState<POI[] | null>(null);
  const [forcedCenter, setForcedCenter] = useState<[number, number] | null>(null);
  const [activeNavRoute, setActiveNavRoute] = useState<MultimodalRoute | null>(null);
  const [showUnloadConfirm, setShowUnloadConfirm] = useState(false);
  const { isOnline, storedLocation } = useOfflineLocation();
  const displayLat = pos ? pos[0] : (!isOnline && storedLocation ? storedLocation.latitude : null);
  const displayLon = pos ? pos[1] : (!isOnline && storedLocation ? storedLocation.longitude : null);
  const { route, loading: routeLoading, error: routeError, fromCache: routeFromCache } = useRoute(
    displayLat != null && displayLon != null ? { lat: displayLat, lon: displayLon } : null,
    selectedDest
  );

  useEffect(() => {
    if (!navigator.geolocation) {
      if (!isOnline && storedLocation) {
        setPos([storedLocation.latitude, storedLocation.longitude]);
      }
      return;
    }
    
    const bestAccuracyRef = { current: Infinity };
    const watchId = navigator.geolocation.watchPosition(
      (p) => {
        const accuracy = p.coords.accuracy;
        // Always accept fixes that are reasonably accurate (<= 100m)
        // For coarse fixes (> 100m), only accept if better than what we have
        if (accuracy <= 100 || accuracy < bestAccuracyRef.current) {
          bestAccuracyRef.current = accuracy;
          setPos([p.coords.latitude, p.coords.longitude]);
          setGpsAccuracy(accuracy);
        }
      },
      (error) => {
        logger.error('Geolocation error:', error);
        if (!isOnline && storedLocation) {
          setPos([storedLocation.latitude, storedLocation.longitude]);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [isOnline, storedLocation]);

  useEffect(() => {
    if (!isOnline && storedLocation && !pos) {
      setPos([storedLocation.latitude, storedLocation.longitude]);
    }
  }, [isOnline, storedLocation, pos]);

  // Clean up cached packs and routes older than 3 days
  useEffect(() => {
    const CACHE_MAX_AGE = 3 * 24 * 60 * 60 * 1000; // 3 days
    (async () => {
      try {
        const manifests = await packManager.listPacks();
        for (const m of manifests) {
          if (m.createdAt && (Date.now() - new Date(m.createdAt).getTime()) > CACHE_MAX_AGE) {
            await packManager.deletePack(m.id);
            logger.info('Deleted expired pack:', m.id);
          }
        }
      } catch (err) {
        logger.warn('Pack cache cleanup failed', err);
      }
      // Also clean expired routes from IndexedDB
      try {
        const req = indexedDB.open('CityNavRouteCache', 1);
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('routes')) return;
          const tx = db.transaction('routes', 'readwrite');
          const store = tx.objectStore('routes');
          const cursorReq = store.openCursor();
          cursorReq.onsuccess = () => {
            const cursor = cursorReq.result;
            if (cursor) {
              const record = cursor.value;
              if (record.savedAt && (Date.now() - record.savedAt) > CACHE_MAX_AGE) {
                cursor.delete();
              }
              cursor.continue();
            }
          };
        };
      } catch { /* silent */ }
    })();
  }, []);

  const center: [number, number] = useMemo(() => {
    return pos || (!isOnline && storedLocation ? [storedLocation.latitude, storedLocation.longitude] : [28.6139, 77.2090]);
  }, [pos, isOnline, storedLocation]);

  const displayPosition = useMemo(() => {
    return pos || (!isOnline && storedLocation ? [storedLocation.latitude, storedLocation.longitude] as [number, number] : null);
  }, [pos, isOnline, storedLocation]);

  const latForPOI = displayPosition ? displayPosition[0] : null;
  const lonForPOI = displayPosition ? displayPosition[1] : null;
  const { data: pois, loading: poisLoading, error: poisError, refresh: refreshPOIs } = useNearbyPOIs(latForPOI, lonForPOI, 1000);
  const defaultCategories: Record<string, boolean> = {
    hospital: false,
    clinic: false,
    pharmacy: false,
    railway: false,
    bus_stop: false,
    bank: false,
    atm: false,
    hotel: false,
    restaurant: false,
    cafe: false,
    park: false,
    fuel: false,
    shopping: false,
    police: false,
    education: false,
    tourist_attraction: false,
    museum: false,
    monument: false,
    viewpoint: false,
    toilet: false,
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

  // Track which sections are toggled on for map display
  const [activeSections, setActiveSections] = useState<Record<string, boolean>>({});

  // Section definitions matching CategoryFilterSidebar
  const sectionDefs: { title: string; categories: string[] }[] = [
    { title: 'Tourist Attractions', categories: ['tourist_attraction', 'museum', 'monument', 'viewpoint'] },
    { title: 'Healthcare', categories: ['hospital', 'clinic', 'pharmacy'] },
    { title: 'Transportation', categories: ['railway', 'bus_stop'] },
    { title: 'Finance', categories: ['bank', 'atm'] },
    { title: 'Food & Stay', categories: ['hotel', 'restaurant', 'cafe'] },
    { title: 'Services & More', categories: ['park', 'fuel', 'shopping', 'police', 'education', 'toilet'] },
  ];

  const handleSectionToggle = (sectionTitle: string, categories: string[]) => {
    setActiveSections(prev => {
      const next = { ...prev, [sectionTitle]: !prev[sectionTitle] };
      // Rebuild activeCategories based on which sections are now active
      const newCategories = { ...defaultCategories };
      sectionDefs.forEach(sec => {
        const isActive = next[sec.title] || false;
        sec.categories.forEach(cat => {
          newCategories[cat] = isActive;
        });
      });
      setActiveCategories(newCategories);
      return next;
    });
  };

  const handleClearAll = () => {
    setActiveSections({});
    setActiveCategories({ ...defaultCategories });
  };

  useEffect(() => {
    try {
      localStorage.setItem('poi_filters', JSON.stringify(activeCategories));
    } catch {
      // ignore storage errors
    }
  }, [activeCategories]);

  function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
    const toRad = (d: number) => d * Math.PI / 180;
    const R = 6371000; // earth radius meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
  useEffect(() => {
    const AUTO_CREATE_PACK = true; 
    const RADIUS = 1000; // 1km radius for essentials
    if (!AUTO_CREATE_PACK) return;
    if (!isOnline) return;
    if (!pois || pois.length === 0) return;

    (async () => {
      try {
        const latC = center[0];
        const lonC = center[1];
        const id = `pack_${latC.toFixed(5)}_${lonC.toFixed(5)}_${RADIUS}`;
        const existing = await packManager.getPackManifest(id);
        if (existing) return;
        const ndjson = pois.map(p => JSON.stringify(p)).join('\n') + '\n';
        try {
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

  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [routePopupPoi, setRoutePopupPoi] = useState<POI | null>(null);

  useEffect(() => {
    // Don't clear manually-loaded packs when online
    if (isOnline) {
      if (!selectedPackId) {
        setPackPois(null);
      }
      return;
    }
    (async () => {
      try {
        const latC = displayPosition ? displayPosition[0] : center[0];
        const lonC = displayPosition ? displayPosition[1] : center[1];
        const manifests = await packManager.listPacks();
        if (!manifests || manifests.length === 0) return;
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
          if (chosen.center && Array.isArray(chosen.center) && chosen.center.length >= 2) {
            setForcedCenter([chosen.center[1], chosen.center[0]]);
          }
  logger.info('Loaded pack', chosen.id, 'with', parsed.length, 'pois');
      } catch (err) {
        logger.warn('Loading pack failed', err);
      }
    })();
  }, [isOnline, displayPosition, selectedPackId]);
  const displayPois: POI[] = selectedPackId ? (packPois || []) : (isOnline ? (pois || []) : (packPois || pois || []));

  useEffect(() => {
    if (!isOnline) return; 
    if (!displayPosition) return; 
    
    const AUTO_PACK_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds
    
    const createAutoPackWithLocation = async () => {
      try {
        if (!pois || pois.length === 0) {
          logger.info('No POIs available for auto-pack creation');
          return;
        }

        const latC = displayPosition[0];
        const lonC = displayPosition[1];
        const RADIUS = 1000; // 1km radius for essentials

        let locationName = 'Unknown Location';
        try {
          const geoRes = await fetch(
            `/api/google-geocode?lat=${latC}&lng=${lonC}`,
            { signal: AbortSignal.timeout(5000) }
          );
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            if (geoData.results && geoData.results.length > 0) {
              const components = geoData.results[0].address_components || [];
              const getComponent = (type: string) => components.find((c: any) => c.types.includes(type))?.long_name || '';
              const neighbourhood = getComponent('neighborhood') || getComponent('sublocality_level_2');
              const suburb = getComponent('sublocality_level_1') || getComponent('sublocality');
              const city = getComponent('locality') || getComponent('administrative_area_level_2');
              const state = getComponent('administrative_area_level_1');
              const country = getComponent('country');
              const postcode = getComponent('postal_code');
              const locationParts: string[] = [];
              if (neighbourhood) locationParts.push(neighbourhood);
              if (suburb && suburb !== neighbourhood) locationParts.push(suburb);
              else if (city && city !== neighbourhood) locationParts.push(city);
              if (locationParts.length > 0) {
                locationName = locationParts.join(', ');
                if (postcode) locationName += ` - ${postcode}`;
              } else if (city) {
                locationName = city;
                if (postcode) locationName += ` - ${postcode}`;
              } else if (state) {
                locationName = state;
              } else if (country) {
                locationName = country;
              } else {
                locationName = `${latC.toFixed(3)}, ${lonC.toFixed(3)}`;
              }
            }
          }
        } catch (err) {
          logger.warn('Geocoding failed for pack naming, using coordinates', err);
          locationName = `${latC.toFixed(3)}, ${lonC.toFixed(3)}`;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const id = `auto_${locationName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}`;
        
        const ndjson = pois.map(p => JSON.stringify(p)).join('\n') + '\n';

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
          
          if (typeof window !== 'undefined') {
            console.log(`✅ Auto-pack created: ${locationName} (${pois.length} places)`);
          }
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
            itemCount: pois.length,
          };
          
          await packManager.createPack(manifest as any, blob);
          logger.info('Auto-created pack (uncompressed):', locationName);
        }
      } catch (err) {
        logger.error('Auto-pack creation failed', err);
      }
    };

    createAutoPackWithLocation();

    const intervalId = setInterval(createAutoPackWithLocation, AUTO_PACK_INTERVAL);

    return () => clearInterval(intervalId);
  }, [isOnline, displayPosition, pois, activeCategories]);

  // Proactively cache routes to essential POIs for offline access
  useEffect(() => {
    if (!isOnline || !displayPosition || !pois || pois.length === 0) return;
    const essentialCategories = ['hospital', 'pharmacy', 'railway', 'bus_stop', 'police'];
    const essentialPOIs = pois
      .filter(p => essentialCategories.includes(p.category))
      .slice(0, 15);
    if (essentialPOIs.length === 0) return;
    const destinations = essentialPOIs.map(p => ({ lat: p.lat, lon: p.lon }));
    preCacheRoutesToPOIs(
      { lat: displayPosition[0], lon: displayPosition[1] },
      destinations,
      15
    ).then(count => {
      if (count > 0) logger.info(`Pre-cached ${count} routes to essential POIs for offline use`);
    }).catch(() => { /* silent */ });
  }, [isOnline, displayPosition, pois]);


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
        try {
          const pako = await import('pako');
          const encoded = new TextEncoder().encode(ndjson);
          const compressed = pako.gzip(encoded);
          if (!cancelled) setCompressedPreview({ bytes: compressed.length, gzipped: true });
        } catch {
          const blob = new Blob([ndjson], { type: 'application/x-ndjson' });
          if (!cancelled) setCompressedPreview({ bytes: blob.size, gzipped: false });
        }
      } catch (err) {
        if (!cancelled) setCompressedPreview(null);
      }
    })();
    return () => { cancelled = true; };
  }, [pois, activeCategories]);

  const createPackFromCurrentPOIs = async () => {
    if (!pois || pois.length === 0) {
      alert('No POIs available to create a pack');
      return;
    }
    
    try {
      const latC = (displayPosition ? displayPosition[0] : center[0]);
      const lonC = (displayPosition ? displayPosition[1] : center[1]);
      const RADIUS = 1000; // 1km radius for essentials
      let locationName = 'Unknown Location';

      try {
        const geoRes = await fetch(
          `/api/google-geocode?lat=${latC}&lng=${lonC}`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData.results && geoData.results.length > 0) {
            const components = geoData.results[0].address_components || [];
            const getComponent = (type: string) => components.find((c: any) => c.types.includes(type))?.long_name || '';
            const neighbourhood = getComponent('neighborhood') || getComponent('sublocality_level_2');
            const suburb = getComponent('sublocality_level_1') || getComponent('sublocality');
            const city = getComponent('locality') || getComponent('administrative_area_level_2');
            const state = getComponent('administrative_area_level_1');
            const country = getComponent('country');
            const postcode = getComponent('postal_code');
            const locationParts: string[] = [];
            if (neighbourhood) locationParts.push(neighbourhood);
            if (suburb && suburb !== neighbourhood) locationParts.push(suburb);
            else if (city && city !== neighbourhood) locationParts.push(city);
            if (locationParts.length > 0) {
              locationName = locationParts.join(', ');
              if (postcode) locationName += ` - ${postcode}`;
            } else if (city) {
              locationName = city;
              if (postcode) locationName += ` - ${postcode}`;
            } else if (state) {
              locationName = state;
            } else if (country) {
              locationName = country;
            } else {
              locationName = `${latC.toFixed(3)}, ${lonC.toFixed(3)}`;
            }
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

  const handleStartNavigation = (navRoute: MultimodalRoute) => {
    setActiveNavRoute(navRoute);
  };

  // Full-screen navigation view when a route is selected for navigation
  if (activeNavRoute && displayPosition) {
    return (
      <RouteNavigationView
        route={activeNavRoute}
        sourceCoords={{ lat: displayPosition[0], lng: displayPosition[1] }}
        destCoords={selectedDest ? { lat: selectedDest.lat, lng: selectedDest.lon } : routePopupPoi ? { lat: routePopupPoi.lat, lng: routePopupPoi.lon } : { lat: displayPosition[0], lng: displayPosition[1] }}
        sourceName="Your Location"
        destName={routePopupPoi?.name || routePopupPoi?.category || 'Destination'}
        onClose={() => setActiveNavRoute(null)}
      />
    );
  }

  return (
    <>
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

      <div className="flex flex-col h-full">
      <EssentialsNavSidebar
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
        onUnloadAndGoLive={() => {
          setSelectedPackId(null);
          setPackPois(null);
          setForcedCenter(null);
        }}
        isPackLoaded={!!selectedPackId}
      />
      <div className="px-3 md:px-6 py-2 md:py-4">
        {displayPosition ? (
          <div className="space-y-1.5 md:space-y-2">
            <div className="flex items-center gap-1.5 md:gap-2 text-xs overflow-x-auto no-scrollbar">
              <div className={`flex-shrink-0 flex items-center gap-1 md:gap-1.5 px-2 md:px-2.5 py-1 rounded-full ${
                isOnline 
                  ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' 
                  : 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              }`}>
                <svg className="w-3 h-3 md:w-3.5 md:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="font-medium whitespace-nowrap">
                  {isOnline ? 'Live GPS' : 'Cached'}
                </span>
              </div>
              {gpsAccuracy != null && isOnline && (
                <div className={`flex-shrink-0 flex items-center gap-1 md:gap-1.5 px-2 md:px-2.5 py-1 rounded-full border ${
                  gpsAccuracy <= 10
                    ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
                    : gpsAccuracy <= 50
                    ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : gpsAccuracy <= 100
                    ? 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800'
                    : 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                }`}>
                  <svg className="w-3 h-3 md:w-3.5 md:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="font-medium whitespace-nowrap">±{Math.round(gpsAccuracy)}m</span>
                </div>
              )}
              {pois && pois.length > 0 && (
                <div className="flex-shrink-0 flex items-center gap-1 md:gap-1.5 px-2 md:px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  <svg className="w-3 h-3 md:w-3.5 md:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  <span className="font-medium whitespace-nowrap">{pois.length} places</span>
                </div>
              )}
            </div>
            <div className="hidden md:block">
              <LocationDetailsHorizontal lat={displayPosition[0]} lon={displayPosition[1]} />
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 md:px-6 py-2.5 md:py-3 shadow-md">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              <span className="text-sm text-slate-500 dark:text-slate-400">Waiting for location...</span>
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <CategoryFilterSidebar 
          pois={displayPois}
          poisLoading={poisLoading}
          userPosition={displayPosition}
          activeSections={activeSections}
          onSectionToggle={handleSectionToggle}
          onClearAll={handleClearAll}
          onNavigate={(poi) => {
            setSelectedDest({ lat: poi.lat, lon: poi.lon });
          }}
          onRoutePopup={(poi) => {
            setRoutePopupPoi(poi);
            setSelectedDest({ lat: poi.lat, lon: poi.lon });
          }}
        />
        <div className="flex-1 relative order-first md:order-last">
          <GoogleMapView 
            center={center} 
            displayPosition={displayPosition} 
            forcedCenter={forcedCenter} 
            setSelectedDest={setSelectedDest} 
            route={route} 
            displayPois={displayPois} 
            activeCategories={activeCategories} 
            setForcedCenter={setForcedCenter} 
            setSelectedPackId={setSelectedPackId}
            isOnline={isOnline}
            onNavigateToPoi={(poi) => {
              setSelectedDest({ lat: poi.lat, lon: poi.lon });
            }}
            onCompareRoutes={(poi) => {
              setRoutePopupPoi(poi);
              setSelectedDest({ lat: poi.lat, lon: poi.lon });
            }}
          />
          {selectedPackId && (
            <div className="absolute top-12 md:top-4 right-3 md:right-4 z-[1001]">
              <button
                onClick={() => setShowUnloadConfirm(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-br from-red-500 to-pink-600 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-transform border border-white/20"
                title="Unload pack and return to live mode"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="text-xs font-semibold">Unload Pack</span>
              </button>
            </div>
          )}

          {/* Unload Pack Confirmation Modal */}
          {showUnloadConfirm && (
            <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowUnloadConfirm(false)} />
              <div className="relative w-full sm:max-w-sm mx-4 mb-20 sm:mb-0 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
                <div className="px-5 pt-5 pb-3 text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Unload Offline Pack?</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">This will switch you back to live mode with real-time GPS data.</p>
                </div>
                <div className="flex gap-3 px-5 pb-5 pt-2">
                  <button
                    onClick={() => setShowUnloadConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 active:scale-95 transition-transform"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setSelectedPackId(null);
                      setPackPois(null);
                      setForcedCenter(null);
                      setShowUnloadConfirm(false);
                    }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-md shadow-red-500/30 active:scale-95 transition-transform"
                  >
                    Unload & Go Live
                  </button>
                </div>
              </div>
            </div>
          )}
          {selectedDest && (
            <div className="absolute top-12 md:top-4 left-3 md:left-4 z-[1001]">
              <NavigationPanel 
                selectedDest={selectedDest} 
                setSelectedDest={setSelectedDest} 
                route={route} 
                routeLoading={routeLoading} 
                routeError={routeError}
                isOnline={isOnline}
                fromCache={routeFromCache}
              />
            </div>
          )}
        </div>
      </div>

      {/* Draggable Route Popup */}
      {routePopupPoi && displayPosition && (
        <DraggableRoutePopup
          sourceCoords={{ lat: displayPosition[0], lng: displayPosition[1] }}
          destCoords={{ lat: routePopupPoi.lat, lng: routePopupPoi.lon }}
          destName={routePopupPoi.name || routePopupPoi.category}
          onClose={() => {
            setRoutePopupPoi(null);
            setSelectedDest(null);
          }}
          onStartNavigation={handleStartNavigation}
        />
      )}
    </div>
    </>
  );
}
