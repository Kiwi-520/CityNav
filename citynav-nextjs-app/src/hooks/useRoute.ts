"use client";

import { useState, useEffect, useCallback, useRef } from 'react';

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

export const useRoute = (from?: { lat: number; lon: number } | null, to?: { lat: number; lon: number } | null) => {
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastKeyRef = useRef<string | null>(null);
  const timerRef = useRef<number | null>(null);
  // simple in-memory cache for routes during session
  const cacheRef = useRef<Record<string, RouteResult>>({});

  const fetchRoute = useCallback(async () => {
    setError(null);
    if (!from || !to) return;
    const key = `${from.lat},${from.lon}:${to.lat},${to.lon}`;

    // serve from cache if available
    const cached = cacheRef.current[key];
    if (cached) {
      setRoute(cached);
      return;
    }

    if (lastKeyRef.current === key) return; // identical request in-flight or recent
    lastKeyRef.current = key;

    setLoading(true);
    try {
      const url = `/api/osrm/route?fromLat=${from.lat}&fromLon=${from.lon}&toLat=${to.lat}&toLon=${to.lon}`;
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
      if (r.legs && Array.isArray(r.legs)) {
        for (const leg of r.legs) {
          if (leg.steps && Array.isArray(leg.steps)) {
            for (const s of leg.steps) {
              steps.push({ distance: s.distance, duration: s.duration, name: s.name || '', maneuver: (s.maneuver && (s.maneuver.instruction || s.maneuver.type)) || '' });
            }
          }
        }
      }
      const coordinatesRaw = (r.geometry && r.geometry.coordinates) || [];
      const coords: [number, number][] = [];
      for (const c of coordinatesRaw) {
        if (Array.isArray(c) && typeof c[0] === 'number' && typeof c[1] === 'number') {
          coords.push([c[1], c[0]]);
        }
      }

      const result: RouteResult = { geometry: coords, distance: r.distance, duration: r.duration, steps };
      // cache the successful route
      cacheRef.current[key] = result;
      setRoute(result);
    } catch (e) {
      console.error('Route fetch failed', e);
      setError((e as Error).message || 'Route error');
      // keep previous route on error to avoid blinking
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
