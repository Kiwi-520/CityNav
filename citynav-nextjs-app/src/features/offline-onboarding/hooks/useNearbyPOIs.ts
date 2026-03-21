import { useEffect, useState, useRef, useCallback } from 'react';
export type POI = {
  id: string;
  lat: number;
  lon: number;
  name?: string;
  category: 'hospital' | 'clinic' | 'pharmacy' | 'railway' | 'bus_stop' | 'bank' | 'atm' | 'hotel' | 'restaurant' | 'cafe' | 'park' | 'tourist_attraction' | 'museum' | 'monument' | 'viewpoint' | 'shopping' | 'fuel' | 'police' | 'toilet' | string;
  tags: Record<string, string>;
};

type UseNearbyOptions = {
  radius?: number; // meters
  ttlMinutes?: number; // cache TTL
};

// Google Places types we want to search for and how they map to our category system
const GOOGLE_PLACE_TYPES = [
  { type: 'hospital', category: 'hospital' },
  { type: 'pharmacy', category: 'pharmacy' },
  { type: 'bank', category: 'bank' },
  { type: 'atm', category: 'atm' },
  { type: 'restaurant', category: 'restaurant' },
  { type: 'cafe', category: 'cafe' },
  { type: 'lodging', category: 'hotel' },
  { type: 'train_station', category: 'railway' },
  { type: 'bus_station', category: 'bus_stop' },
  { type: 'transit_station', category: 'bus_stop' },
  { type: 'tourist_attraction', category: 'tourist_attraction' },
  { type: 'museum', category: 'museum' },
  { type: 'park', category: 'park' },
  { type: 'gas_station', category: 'fuel' },
  { type: 'shopping_mall', category: 'shopping' },
  { type: 'supermarket', category: 'shopping' },
  { type: 'police', category: 'police' },
  { type: 'church', category: 'monument' },
  { type: 'hindu_temple', category: 'monument' },
  { type: 'mosque', category: 'monument' },
  { type: 'restroom', category: 'toilet' },
];

function detectCategoryFromGoogleTypes(types: string[]): string {
  if (types.includes('hospital') || types.includes('doctor')) return 'hospital';
  if (types.includes('pharmacy') || types.includes('drugstore')) return 'pharmacy';
  if (types.includes('bank')) return 'bank';
  if (types.includes('atm')) return 'atm';
  if (types.includes('restaurant') || types.includes('food')) return 'restaurant';
  if (types.includes('cafe')) return 'cafe';
  if (types.includes('lodging')) return 'hotel';
  if (types.includes('train_station') || types.includes('subway_station')) return 'railway';
  if (types.includes('bus_station') || types.includes('transit_station')) return 'bus_stop';
  if (types.includes('tourist_attraction')) return 'tourist_attraction';
  if (types.includes('museum')) return 'museum';
  if (types.includes('church') || types.includes('hindu_temple') || types.includes('mosque') || types.includes('place_of_worship')) return 'monument';
  if (types.includes('park')) return 'park';
  if (types.includes('gas_station')) return 'fuel';
  if (types.includes('shopping_mall') || types.includes('supermarket') || types.includes('grocery_or_supermarket')) return 'shopping';
  if (types.includes('police')) return 'police';
  if (types.includes('school') || types.includes('university')) return 'education';
  if (types.includes('restroom') || types.includes('public_bath')) return 'toilet';
  // Instead of returning unknown, try to map to a reasonable category
  if (types.includes('point_of_interest') || types.includes('establishment')) return 'tourist_attraction';
  return types[0] || 'tourist_attraction';
}

function cacheKey(lat: number, lon: number, radius: number) {
  return `nearby_pois_google_${lat.toFixed(5)}_${lon.toFixed(5)}_${Math.round(radius)}`;
}

export function useNearbyPOIs(lat?: number | null, lon?: number | null, radius = 1000, options?: UseNearbyOptions) {
  const ttl = (options?.ttlMinutes ?? 15) * 60 * 1000;
  const [data, setData] = useState<POI[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchOnce = useCallback(async () => {
    if (lat == null || lon == null) return;
    const key = cacheKey(lat, lon, radius);
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as { ts: number; data: POI[] };
        // Only use cache if fresh AND has actual results
        if (Date.now() - parsed.ts < ttl && parsed.data && parsed.data.length > 0) {
          setData(parsed.data);
          return; // Cache is still fresh with data
        }
        // Remove stale or empty cache
        if (parsed.data && parsed.data.length === 0) {
          localStorage.removeItem(key);
        }
      }
    } catch (e) {
      // ignore cache parsing errors
    }

    setLoading(true);
    setError(null);

    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      // Fetch multiple place types in parallel via our Google Places proxy
      // Use all the essential types for a comprehensive 1km radius search
      const typesToSearch = [
        'hospital', 'pharmacy', 'bank', 'atm', 
        'restaurant', 'cafe', 'lodging', 
        'train_station', 'bus_station', 'transit_station',
        'tourist_attraction', 'museum', 'park',
        'gas_station', 'shopping_mall', 'supermarket', 'police',
        'restroom'
      ];
      
      console.log(`🔍 Fetching POIs within ${radius}m of [${lat}, ${lon}]...`);
      console.log(`📝 Searching ${typesToSearch.length} Google Place types`);

      const allResults = await Promise.all(
        typesToSearch.map(async (type) => {
          try {
            const url = `/api/google-places?lat=${lat}&lng=${lon}&radius=${radius}&type=${type}`;
            const resp = await fetch(url, { signal: ac.signal });
            if (!resp.ok) {
              console.warn(`⚠️ Google Places API HTTP error for type=${type}: ${resp.status}`);
              return [];
            }
            const json = await resp.json();
            
            // Check Google API status
            if (json.status && json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
              console.warn(`⚠️ Google Places API status for type=${type}: ${json.status} - ${json.error_message || ''}`);
              return [];
            }
            
            const results = json.results || [];
            if (results.length > 0) {
              console.log(`  ✅ type=${type}: ${results.length} results`);
            }
            return results.map((place: any) => ({
              ...place,
              _searchType: type,
            }));
          } catch (fetchErr: any) {
            if (fetchErr?.name !== 'AbortError') {
              console.warn(`⚠️ Failed to fetch type=${type}:`, fetchErr?.message);
            }
            return [];
          }
        })
      );

      // Flatten and deduplicate by place_id
      const seenIds = new Set<string>();
      const pois: POI[] = [];

      for (const results of allResults) {
        for (const place of results) {
          if (!place.place_id || seenIds.has(place.place_id)) continue;
          seenIds.add(place.place_id);

          const location = place.geometry?.location;
          if (!location) continue;

          const types = place.types || [];
          const category = detectCategoryFromGoogleTypes(types);

          pois.push({
            id: place.place_id,
            lat: location.lat,
            lon: location.lng,
            name: place.name || undefined,
            category,
            tags: {
              operator: place.business_status || '',
              brand: '',
              rating: place.rating?.toString() || '',
              vicinity: place.vicinity || '',
              ...(place.opening_hours?.open_now !== undefined ? { open_now: place.opening_hours.open_now.toString() } : {}),
            },
          });
        }
      }

      console.log(`🎯 Total unique POIs found: ${pois.length}`);
      if (pois.length === 0) {
        console.warn('⚠️ No POIs found within radius. Check if Google Places API is enabled and billing is active.');
      } else {
        // Log category breakdown
        const categoryCounts: Record<string, number> = {};
        pois.forEach(p => { categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1; });
        console.log('📊 POI categories:', categoryCounts);
      }

      setData(pois);
      // Only cache if we got results
      if (pois.length > 0) {
        try {
          localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data: pois }));
        } catch {
          // ignore storage errors
        }
      }
    } catch (err: unknown) {
      // Try to use cached data on error
      try {
        const key = cacheKey(lat, lon, radius);
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw) as { ts: number; data: POI[] };
          if (parsed && parsed.data) setData(parsed.data);
        }
      } catch {
        // ignore
      }
      const maybeErr = err as { name?: string; message?: string } | undefined;
      if (maybeErr && maybeErr.name === 'AbortError') {
        // aborted — don't set error
      } else {
        setError(maybeErr?.message || String(maybeErr));
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [lat, lon, radius, ttl]);

  useEffect(() => {
    if (lat == null || lon == null) return;
    fetchOnce();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [lat, lon, radius, fetchOnce]);

  const refresh = useCallback(() => {
    fetchOnce();
  }, [fetchOnce]);

  return { data, loading, error, refresh } as const;
}

export default useNearbyPOIs;
