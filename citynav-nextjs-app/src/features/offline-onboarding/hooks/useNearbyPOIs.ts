import { useEffect, useState, useRef, useCallback } from 'react';
export type POI = {
  id: string;
  lat: number;
  lon: number;
  name?: string;
  category: 'hospital' | 'clinic' | 'railway' | 'bus_stop' | 'bank' | 'atm' | 'hotel' | 'restaurant' | 'tourist_attraction' | 'museum' | 'monument' | 'viewpoint' | string;
  tags: Record<string, string>;
};

type UseNearbyOptions = {
  radius?: number; // meters
  ttlMinutes?: number; // cache TTL
};

function buildOverpassQuery(lat: number, lon: number, radius: number) {
  return `
[out:json][timeout:25];
(
  node["amenity"~"hospital|clinic|bank|atm|restaurant|cafe|fast_food"](around:${radius},${lat},${lon});
  way["amenity"~"hospital|clinic|bank|atm|restaurant|cafe|fast_food"](around:${radius},${lat},${lon});
  relation["amenity"~"hospital|clinic|bank|atm|restaurant|cafe|fast_food"](around:${radius},${lat},${lon});

  node["tourism"~"hotel|attraction|museum|monument|viewpoint|artwork|gallery"](around:${radius},${lat},${lon});
  way["tourism"~"hotel|attraction|museum|monument|viewpoint|artwork|gallery"](around:${radius},${lat},${lon});
  relation["tourism"~"hotel|attraction|museum|monument|viewpoint|artwork|gallery"](around:${radius},${lat},${lon});

  node["historic"~"monument|memorial|castle|ruins|archaeological_site"](around:${radius},${lat},${lon});
  way["historic"~"monument|memorial|castle|ruins|archaeological_site"](around:${radius},${lat},${lon});
  relation["historic"~"monument|memorial|castle|ruins|archaeological_site"](around:${radius},${lat},${lon});

  node["railway"="station"](around:${radius},${lat},${lon});
  way["railway"="station"](around:${radius},${lat},${lon});
  relation["railway"="station"](around:${radius},${lat},${lon});

  node["highway"="bus_stop"](around:${radius},${lat},${lon});
  way["highway"="bus_stop"](around:${radius},${lat},${lon});
  relation["highway"="bus_stop"](around:${radius},${lat},${lon});
);
out center qt;
`;
}

function detectCategory(tags: Record<string, string> = {}) {
  const amenity = tags['amenity'];
  const tourism = tags['tourism'];
  const historic = tags['historic'];
  
  // Health facilities
  if (amenity === 'hospital') return 'hospital';
  if (amenity === 'clinic') return 'clinic';
  
  // Financial
  if (amenity === 'bank') return 'bank';
  if (amenity === 'atm') return 'atm';
  
  // Food & Accommodation
  if (amenity === 'restaurant' || amenity === 'cafe' || amenity === 'fast_food') return 'restaurant';
  if (tourism === 'hotel') return 'hotel';
  
  // Transportation
  if (tags['railway'] === 'station') return 'railway';
  if (tags['highway'] === 'bus_stop') return 'bus_stop';
  
  // Tourist attractions and famous places
  if (tourism === 'attraction') return 'tourist_attraction';
  if (tourism === 'museum' || tourism === 'gallery') return 'museum';
  if (tourism === 'monument' || tourism === 'artwork') return 'monument';
  if (tourism === 'viewpoint') return 'viewpoint';
  if (historic === 'monument' || historic === 'memorial' || historic === 'castle' || historic === 'ruins' || historic === 'archaeological_site') return 'monument';
  
  // Fallback to any useful tag
  if (amenity) return amenity;
  if (tourism) return tourism;
  if (historic) return historic;
  return 'unknown';
}

function cacheKey(lat: number, lon: number, radius: number) {
  return `nearby_pois_${lat.toFixed(5)}_${lon.toFixed(5)}_${Math.round(radius)}`;
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
          if (Date.now() - parsed.ts < ttl) setData(parsed.data);
        }
      } catch (e) {
        // ignore cache parsing errors (corrupt or stale value)
      }

    setLoading(true);
    setError(null);

    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const q = buildOverpassQuery(lat, lon, radius);
    try {
      const url = 'https://overpass-api.de/api/interpreter';
      const resp = await fetch(url, { method: 'POST', body: q, signal: ac.signal, headers: { 'Content-Type': 'text/plain' } });
      if (!resp.ok) throw new Error(`Overpass error ${resp.status}`);
      const json = await resp.json();
      const elements = Array.isArray(json.elements) ? json.elements : [];

      type OverpassElement = {
        type: 'node' | 'way' | 'relation';
        id: number;
        lat?: number;
        lon?: number;
        center?: { lat: number; lon: number };
        tags?: Record<string, string>;
      };

      const pois: POI[] = (elements as OverpassElement[]).map((el) => {
        const t = el.tags || {};
        const category = detectCategory(t);
        const pointLat = el.type === 'node' ? el.lat : (el.center && el.center.lat) || null;
        const pointLon = el.type === 'node' ? el.lon : (el.center && el.center.lon) || null;
        return {
          id: `${el.type}/${el.id}`,
          lat: pointLat ?? 0,
          lon: pointLon ?? 0,
          name: t.name || t['operator'] || t['brand'] || undefined,
          category,
          tags: t,
        };
      }).filter((p: POI) => p.lat !== 0 && p.lon !== 0);

      setData(pois);
      try {
        localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data: pois }));
      } catch {
        // ignore storage errors
      }
  } catch (err: unknown) {
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
        // aborted
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
