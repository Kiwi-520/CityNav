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
const ROUTE_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days for offline availability

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

async function saveRouteOffline(
  key: string,
  route: RouteResult,
  coords?: { fromLat: number; fromLon: number; toLat: number; toLon: number }
): Promise<void> {
  try {
    const db = await openRouteDB();
    const tx = db.transaction(ROUTE_STORE, 'readwrite');
    tx.objectStore(ROUTE_STORE).put({ key, route, savedAt: Date.now(), ...coords });
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

type CachedRouteRecord = {
  key: string;
  route: RouteResult;
  savedAt: number;
  fromLat?: number;
  fromLon?: number;
  toLat?: number;
  toLon?: number;
};

function parseRouteKey(key: string): { fromLat: number; fromLon: number; toLat: number; toLon: number } | null {
  const [fromPart, toPart] = key.split(':');
  if (!fromPart || !toPart) return null;
  const [fromLat, fromLon] = fromPart.split(',').map(Number);
  const [toLat, toLon] = toPart.split(',').map(Number);
  if ([fromLat, fromLon, toLat, toLon].some((v) => Number.isNaN(v))) return null;
  return { fromLat, fromLon, toLat, toLon };
}

function sqDistance(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const dLat = aLat - bLat;
  const dLon = aLon - bLon;
  return dLat * dLat + dLon * dLon;
}

async function loadNearestOfflineRoute(from: { lat: number; lon: number }, to: { lat: number; lon: number }): Promise<RouteResult | null> {
  try {
    const db = await openRouteDB();
    const tx = db.transaction(ROUTE_STORE, 'readonly');
    const req = tx.objectStore(ROUTE_STORE).openCursor();
    const records = await new Promise<CachedRouteRecord[]>((resolve, reject) => {
      const items: CachedRouteRecord[] = [];
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) {
          resolve(items);
          return;
        }
        items.push(cursor.value as CachedRouteRecord);
        cursor.continue();
      };
      req.onerror = () => reject(req.error);
    });

    const now = Date.now();
    let best: { score: number; route: RouteResult } | null = null;
    for (const record of records) {
      if (!record?.route || (now - record.savedAt) >= ROUTE_CACHE_TTL) continue;
      const keyCoords = parseRouteKey(record.key || '');
      const recFromLat = record.fromLat ?? keyCoords?.fromLat;
      const recFromLon = record.fromLon ?? keyCoords?.fromLon;
      const recToLat = record.toLat ?? keyCoords?.toLat;
      const recToLon = record.toLon ?? keyCoords?.toLon;
      if (recFromLat == null || recFromLon == null || recToLat == null || recToLon == null) continue;

      const destinationDelta = sqDistance(recToLat, recToLon, to.lat, to.lon);
      if (destinationDelta > 0.00008) continue;
      const originDelta = sqDistance(recFromLat, recFromLon, from.lat, from.lon);
      const score = destinationDelta * 4 + originDelta;
      if (!best || score < best.score) {
        best = { score, route: record.route };
      }
    }

    return best?.route ?? null;
  } catch {
    return null;
  }
}

export const useRoute = (from?: { lat: number; lon: number } | null, to?: { lat: number; lon: number } | null) => {
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastKeyRef = useRef<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const cacheRef = useRef<Record<string, RouteResult>>({});

  // Immediately clear old route whenever from/to changes (including switching destinations)
  useEffect(() => {
    if (!from || !to) {
      setRoute(null);
      setError(null);
      setLoading(false);
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
          return;
        }
        const nearestOfflineCached = await loadNearestOfflineRoute(from, to);
        if (nearestOfflineCached) {
          cacheRef.current[key] = nearestOfflineCached;
          setRoute(nearestOfflineCached);
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
      void saveRouteOffline(key, result, { fromLat: from.lat, fromLon: from.lon, toLat: to.lat, toLon: to.lon });
    } catch (e) {
      console.error('Route fetch failed', e);
      // Last resort: try offline cache even for online failures
      try {
        const offlineFallback = await loadRouteOffline(key);
        if (offlineFallback) {
          cacheRef.current[key] = offlineFallback;
          setRoute(offlineFallback);
          return;
        }
        const nearestOfflineFallback = await loadNearestOfflineRoute(from, to);
        if (nearestOfflineFallback) {
          cacheRef.current[key] = nearestOfflineFallback;
          setRoute(nearestOfflineFallback);
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

  return { route, loading, error, refresh: fetchRoute };
};
