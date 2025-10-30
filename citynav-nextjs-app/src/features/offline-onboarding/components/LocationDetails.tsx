"use client";

import React, { useEffect, useState, useRef } from "react";
import { useOfflineLocation } from "@/features/offline-onboarding/hooks/useOfflineLocation";
import logger from '@/features/offline-onboarding/lib/logger';

// Types remain the same
type Address = {
  country?: string;
  state?: string;
  city?: string;
  town?: string;
  village?: string;
  suburb?: string;
  road?: string;
  postcode?: string;
  [key: string]: string | undefined;
};

type Weather = {
  temperature?: number;
  weathercode?: number;
  windspeed?: number;
  winddirection?: number;
  time?: string;
};

interface LocationDetailsProps {
  lat?: number | null;
  lon?: number | null;
}

// Weather descriptions remain the same
const weatherDescriptions: { [key: number]: string } = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Depositing rime fog",
    51: "Drizzle: Light", 53: "Drizzle: Moderate", 55: "Drizzle: Dense intensity", 61: "Rain: Slight",
    63: "Rain: Moderate", 65: "Rain: Heavy intensity", 80: "Rain showers: Slight", 81: "Rain showers: Moderate",
    82: "Rain showers: Violent",
};

const LocationDetails: React.FC<LocationDetailsProps> = ({ lat, lon }) => {
  const [address, setAddress] = useState<Address | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUsingCachedData, setIsUsingCachedData] = useState(false);
  
  const { isOnline, storedLocation, storeLocation } = useOfflineLocation();
  const lastFetchedLocation = useRef<string | null>(null);

  useEffect(() => {
    // Create a unique key for the current location
    const locationKey = lat != null && lon != null ? `${lat},${lon}` : null;
    
    // Skip if we're already fetching this location
    if (locationKey === lastFetchedLocation.current) {
      return;
    }
    
    lastFetchedLocation.current = locationKey;
    
    // Reset state when props change
    setAddress(null);
    setWeather(null);
    setLoading(true);
    setError(null);
    setIsUsingCachedData(false);

    if (lat == null || lon == null) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // Use navigator.onLine as a stronger guard in addition to isOnline
        const onlineNow = typeof navigator !== 'undefined' ? navigator.onLine && isOnline : false;
        if (!onlineNow) {
          // When offline, try to use stored location data
          if (storedLocation) {
            setAddress(storedLocation.address || null);
            setWeather(storedLocation.weather || null);
            setIsUsingCachedData(true);
            setError(null);
          } else {
            setError("No cached location data available. Please connect to the internet to load location details.");
          }
          setLoading(false);
          return;
        }

        // When online, attempt network fetches but guard each fetch and fall back to cache on failure
        let fetchedAddress: Address | null = null;
        let fetchedWeather: Weather | null = null;

        // Fetch address (guarded) with a timeout and provider fallbacks
        const tryAddressProviders = async () => {
          const providers = [
            { name: 'nominatim', url: `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2&addressdetails=1` },
            { name: 'mapsco', url: `https://geocode.maps.co/reverse?lat=${lat}&lon=${lon}` },
            { name: 'bigdatacloud', url: `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en` }
          ];

          for (const prov of providers) {
            try {
              const ac = new AbortController();
              const timeout = setTimeout(() => ac.abort(), 8000);
              const res = await fetch(prov.url, { signal: ac.signal });
              clearTimeout(timeout);
              if (!res.ok) {
                logger.warn(`Address provider ${prov.name} returned ${res.status} ${res.statusText}`);
                continue;
              }
              const data = await res.json();
              // Normalise common shape
              if (prov.name === 'bigdatacloud') {
                // bigdatacloud returns fields directly
                fetchedAddress = {
                  country: data.countryName,
                  state: data.principalSubdivision,
                  city: data.city || data.locality || data.localityInfo?.administrative[0]?.name,
                  town: data.city,
                  village: data.locality,
                  suburb: data.locality,
                  road: data.locality,
                  postcode: data.postcode
                };
                return;
              }
              // maps.co and nominatim have .address
              if (data && data.address) {
                fetchedAddress = data.address;
                return;
              }
              // fallback: some providers return top-level fields
              if (data && (data.city || data.country || data.principalSubdivision)) {
                fetchedAddress = data;
                return;
              }
            } catch (err) {
              if ((err as any)?.name === 'AbortError') {
                logger.warn(`Address provider ${prov.name} timed out`);
              } else {
                logger.warn(`Address provider ${prov.name} failed:`, err);
              }
              // try next provider
            }
          }
        };

        await tryAddressProviders();

        // Fetch weather (guarded) with timeout and timezone for readable times
        try {
          const acw = new AbortController();
          const to = setTimeout(() => acw.abort(), 8000);
          const wurl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`;
          const weatherRes = await fetch(wurl, { signal: acw.signal });
          clearTimeout(to);
          if (weatherRes.ok) {
            const weatherData = await weatherRes.json();
            fetchedWeather = weatherData.current_weather || null;
          } else {
            logger.warn(`Weather fetch returned ${weatherRes.status} ${weatherRes.statusText}`);
          }
        } catch (err) {
          if ((err as any)?.name === 'AbortError') {
            logger.warn('Weather fetch timed out');
          } else {
            logger.warn('Weather fetch failed (network?):', err);
          }
        }

        // If we obtained at least one fresh piece of data, use it and cache
        if (fetchedAddress || fetchedWeather) {
          setAddress(fetchedAddress);
          setWeather(fetchedWeather);
          storeLocation({
            latitude: lat!,
            longitude: lon!,
            timestamp: Date.now(),
            address: fetchedAddress ?? undefined,
            weather: fetchedWeather ?? undefined
          });
          setIsUsingCachedData(false);
          setError(null);
        } else {
          // No fresh data (server error or intermittent network). Try cached data if present
          if (storedLocation) {
            setAddress(storedLocation.address || null);
            setWeather(storedLocation.weather || null);
            setIsUsingCachedData(true);
            setError('Using cached location data. Current data may not be available.');
          } else {
            setError('Unable to fetch location details. Please ensure you are online and try again.');
          }

        }

      } catch (err: unknown) {
        // Fallback safety: should rarely reach here because previous try/catch blocks handle network errors
  logger.warn('Unexpected fetch error:', err);
        if (storedLocation) {
          setAddress(storedLocation.address || null);
          setWeather(storedLocation.weather || null);
          setIsUsingCachedData(true);
          setError('Using cached location data. Current data may not be available.');
        } else {
          setError('Unable to fetch location details and no cached data available.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();

  }, [lat, lon, isOnline, storedLocation, storeLocation]); // Include all dependencies used in the effect

  // Separate effect to handle stored location changes when offline with debouncing
  useEffect(() => {
    if (!isOnline && storedLocation && !loading) {
      const timeoutId = setTimeout(() => {
        setAddress(storedLocation.address || null);
        setWeather(storedLocation.weather || null);
        setIsUsingCachedData(true);
        setError(null);
      }, 100); // Small delay to prevent rapid updates

      return () => clearTimeout(timeoutId);
    }
  }, [storedLocation, isOnline, loading]);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-white to-slate-50 border-2 border-slate-200 rounded-2xl p-6 shadow-lg my-4">
        <div className="flex items-center justify-center gap-3 py-8">
          <div className="w-6 h-6 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
          <span className="text-sm text-slate-600 font-medium">Loading location details...</span>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-gradient-to-br from-red-50 to-white border-2 border-red-200 rounded-2xl p-6 shadow-lg my-4">
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-red-900 mb-2">Location Details Error</h3>
            <p className="text-sm text-red-700">{error}</p>
            {isUsingCachedData && (
              <div className="mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                <small className="text-xs text-amber-700 font-medium">Showing cached data from previous session</small>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!address || !weather) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200 rounded-2xl p-6 shadow-lg my-4 text-center">
        <div className="text-4xl mb-3">📍</div>
        <div className="text-sm text-slate-500">No location details to display</div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-white to-slate-50 border-2 border-slate-200 rounded-2xl shadow-lg my-4 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-50 to-white px-6 py-4 border-b border-slate-200">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h3 className="text-base font-semibold text-slate-900">Location Details</h3>
          </div>
          <div className="flex items-center gap-2">
            {!isOnline && (
              <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Offline Mode
              </span>
            )}
            {isUsingCachedData && (
              <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                Cached Data
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-5">
        {/* Address Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Address</h4>
          </div>
          <div className="grid gap-2.5">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-slate-500 font-medium w-24 flex-shrink-0">Country:</span>
              <span className="text-slate-900">{address.country || "Unknown"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-slate-500 font-medium w-24 flex-shrink-0">State:</span>
              <span className="text-slate-900">{address.state || "Unknown"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-slate-500 font-medium w-24 flex-shrink-0">City:</span>
              <span className="text-slate-900">{address.city || address.town || address.village || "Unknown"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-slate-500 font-medium w-24 flex-shrink-0">Area:</span>
              <span className="text-slate-900">{address.suburb || address.road || "Unknown"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-slate-500 font-medium w-24 flex-shrink-0">Postal Code:</span>
              <span className="text-slate-900 font-mono">{address.postcode || "Unknown"}</span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-200" />

        {/* Weather Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
            <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Weather</h4>
          </div>
          <div className="grid gap-2.5">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-slate-500 font-medium w-24 flex-shrink-0">Temperature:</span>
              <span className="text-slate-900 font-semibold">{weather.temperature}°C</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-slate-500 font-medium w-24 flex-shrink-0">Condition:</span>
              <span className="text-slate-900">{weatherDescriptions[weather.weathercode ?? 0] ?? "Unknown"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-slate-500 font-medium w-24 flex-shrink-0">Wind:</span>
              <span className="text-slate-900">{weather.windspeed} km/h at {weather.winddirection}°</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-slate-500 font-medium w-24 flex-shrink-0">Time:</span>
              <span className="text-slate-900 font-mono">{weather.time}</span>
            </div>
          </div>
        </div>

        {/* Offline Notice */}
        {!isOnline && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-800">
                You&apos;re currently offline. Location data is from your last online session.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationDetails;
