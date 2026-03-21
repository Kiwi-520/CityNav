"use client";

import { useState, useEffect, useCallback, useRef } from 'react';

function decodeGooglePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
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

    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

type RouteStep = {
  distance: number; // meters
  duration: number; // seconds
  name: string;
  maneuver: string;
};

export type RouteResult = {
  geometry: Array<[number, number]>; // lat, lon pairs
  distance: number; // meters
  duration: number; // seconds
  steps: RouteStep[];
};

const ROUTE_DB_NAME = 'CityNavRouteCache';
const ROUTE_DB_VERSION = 1;
const ROUTE_STORE = 'routes';
const ROUTE_CACHE_TTL = 3 * 24 * 60 * 60 * 1000; // 3 days for offline availability

function openRouteDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(ROUTE_DB_NAME, ROUTE_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(ROUTE_STORE)) {
        db.createObjectStore(ROUTE_STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveRouteOffline(key: string, route: RouteResult): Promise<void> {
  try {
    const db = await openRouteDB();
    const tx = db.transaction(ROUTE_STORE, 'readwrite');
    tx.objectStore(ROUTE_STORE).put({ key, route, savedAt: Date.now() });
    await new Promise<void>((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
  } catch { /* silent */ }
}

async function loadRouteOffline(key: string): Promise<RouteResult | null> {
  try {
    const db = await openRouteDB();
    const tx = db.transaction(ROUTE_STORE, 'readonly');
    const req = tx.objectStore(ROUTE_STORE).get(key);
    const record = await new Promise<any>((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
    if (record && (Date.now() - record.savedAt) < ROUTE_CACHE_TTL) {
      return record.route as RouteResult;
    }
    return null;
  } catch { return null; }
}

/** Try to find the closest matching cached route when no exact key match exists */
async function loadNearestCachedRoute(targetToLat: number, targetToLon: number): Promise<RouteResult | null> {
  try {
    const db = await openRouteDB();
    const tx = db.transaction(ROUTE_STORE, 'readonly');
    const store = tx.objectStore(ROUTE_STORE);
    const allReq = store.getAll();
    const records = await new Promise<any[]>((res, rej) => { allReq.onsuccess = () => res(allReq.result || []); allReq.onerror = () => rej(allReq.error); });

    let bestRoute: RouteResult | null = null;
    let bestDist = Infinity;

    for (const record of records) {
      if (!record.key || !record.route || (Date.now() - record.savedAt) > ROUTE_CACHE_TTL) continue;
      // key format: "fromLat,fromLon:toLat,toLon"
      const parts = record.key.split(':');
      if (parts.length !== 2) continue;
      const [toLat, toLon] = parts[1].split(',').map(Number);
      if (isNaN(toLat) || isNaN(toLon)) continue;
      const dist = Math.sqrt((toLat - targetToLat) ** 2 + (toLon - targetToLon) ** 2);
      // Accept routes to destinations within ~500m (approx 0.005 degrees)
      if (dist < 0.005 && dist < bestDist) {
        bestDist = dist;
        bestRoute = record.route;
      }
    }
    return bestRoute;
  } catch { return null; }
}

export const useRoute = (from?: { lat: number; lon: number } | null, to?: { lat: number; lon: number } | null) => {
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const lastKeyRef = useRef<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const cacheRef = useRef<Record<string, RouteResult>>({});

  // Immediately clear old route whenever from/to changes (including switching destinations)
  useEffect(() => {
    if (!from || !to) {
      setRoute(null);
      setError(null);
      setLoading(false);
      setFromCache(false);
      lastKeyRef.current = null;
      return;
    }
    // Destination changed to a new one — clear old route immediately so stale polyline disappears
    const newKey = `${from.lat},${from.lon}:${to.lat},${to.lon}`;
    if (lastKeyRef.current !== newKey) {
      // Check in-memory cache first for instant swap
      const cached = cacheRef.current[newKey];
      if (cached) {
        setRoute(cached);
      } else {
        setRoute(null);
        setLoading(true);
      }
    }
  }, [from, to]);

  const fetchRoute = useCallback(async () => {
    setError(null);
    setFromCache(false);
    if (!from || !to) return;
    const key = `${from.lat},${from.lon}:${to.lat},${to.lon}`;

    // In-memory cache hit
    const cached = cacheRef.current[key];
    if (cached) {
      setRoute(cached);
      lastKeyRef.current = key;
      setLoading(false);
      return;
    }

    if (lastKeyRef.current === key) return; 
    lastKeyRef.current = key;

    setLoading(true);
    try {
      // Try offline cache first when offline
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const offlineCached = await loadRouteOffline(key);
        if (offlineCached) {
          cacheRef.current[key] = offlineCached;
          setRoute(offlineCached);
          setFromCache(true);
          return;
        }
        // Try finding a nearby cached route as fallback
        const nearbyRoute = await loadNearestCachedRoute(to.lat, to.lon);
        if (nearbyRoute) {
          cacheRef.current[key] = nearbyRoute;
          setRoute(nearbyRoute);
          setFromCache(true);
          return;
        }
        throw new Error('No internet connection and no cached route available');
      }

      const url = `/api/google-directions?fromLat=${from.lat}&fromLng=${from.lon}&toLat=${to.lat}&toLng=${to.lon}&mode=driving`;
      const resp = await fetch(url);
      const text = await resp.text();
      if (!resp.ok) {
        const body = text || `status ${resp.status}`;
        throw new Error(`Routing error ${resp.status}: ${body}`);
      }
      const j = JSON.parse(text);
      if (!j.routes || j.routes.length === 0) throw new Error('No route found');
      const r = j.routes[0];

      const steps: RouteStep[] = [];
      let totalDistance = 0;
      let totalDuration = 0;
      const coords: [number, number][] = [];

      if (r.legs && Array.isArray(r.legs)) {
        for (const leg of r.legs) {
          totalDistance += leg.distance?.value || 0;
          totalDuration += leg.duration?.value || 0;
          if (leg.steps && Array.isArray(leg.steps)) {
            for (const s of leg.steps) {
              steps.push({
                distance: s.distance?.value || 0,
                duration: s.duration?.value || 0,
                name: s.html_instructions?.replace(/<[^>]*>/g, '') || '',
                maneuver: s.maneuver || s.travel_mode || '',
              });
              // Decode Google's polyline for each step
              if (s.polyline?.points) {
                const decoded = decodeGooglePolyline(s.polyline.points);
                coords.push(...decoded);
              }
            }
          }
        }
      }

      // If no step-level polyline, use the overview polyline
      if (coords.length === 0 && r.overview_polyline?.points) {
        const decoded = decodeGooglePolyline(r.overview_polyline.points);
        coords.push(...decoded);
      }

      const result: RouteResult = { geometry: coords, distance: totalDistance, duration: totalDuration, steps };
      cacheRef.current[key] = result;
      setRoute(result);

      // Persist to IndexedDB for offline access
      void saveRouteOffline(key, result);
    } catch (e) {
      console.error('Route fetch failed', e);
      // Last resort: try offline cache even for online failures
      try {
        const offlineFallback = await loadRouteOffline(key);
        if (offlineFallback) {
          cacheRef.current[key] = offlineFallback;
          setRoute(offlineFallback);
          setFromCache(true);
          return;
        }
        // Try nearest cached route
        const nearbyFallback = await loadNearestCachedRoute(to.lat, to.lon);
        if (nearbyFallback) {
          cacheRef.current[key] = nearbyFallback;
          setRoute(nearbyFallback);
          setFromCache(true);
          return;
        }
      } catch { /* ignore */ }
      setError((e as Error).message || 'Route error');
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    if (!from || !to) return;
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    timerRef.current = window.setTimeout(() => {
      void fetchRoute();
    }, 300) as unknown as number;

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [from, to, fetchRoute]);

  return { route, loading, error, fromCache, refresh: fetchRoute };
};
