"use client";

import React, { useEffect, useState, useRef } from "react";
import { useOfflineLocation } from "@/features/offline-onboarding/hooks/useOfflineLocation";
import logger from '@/features/offline-onboarding/lib/logger';

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

interface LocationDetailsHorizontalProps {
  lat?: number | null;
  lon?: number | null;
}

const weatherDescriptions: { [key: number]: string } = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Depositing rime fog",
    51: "Drizzle: Light", 53: "Drizzle: Moderate", 55: "Drizzle: Dense intensity", 61: "Rain: Slight",
    63: "Rain: Moderate", 65: "Rain: Heavy intensity", 80: "Rain showers: Slight", 81: "Rain showers: Moderate",
    82: "Rain showers: Violent",
};

const LocationDetailsHorizontal: React.FC<LocationDetailsHorizontalProps> = ({ lat, lon }) => {
  const [address, setAddress] = useState<Address | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUsingCachedData, setIsUsingCachedData] = useState(false);
  
  const { isOnline, storedLocation, storeLocation } = useOfflineLocation();
  const lastFetchedLocation = useRef<string | null>(null);

  useEffect(() => {
    const locationKey = lat != null && lon != null ? `${lat},${lon}` : null;
    if (locationKey === lastFetchedLocation.current) return;
    lastFetchedLocation.current = locationKey;
    
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
        const onlineNow = typeof navigator !== 'undefined' ? navigator.onLine && isOnline : false;
        if (!onlineNow) {
          if (storedLocation) {
            setAddress(storedLocation.address || null);
            setWeather(storedLocation.weather || null);
            setIsUsingCachedData(true);
            setError(null);
          } else {
            setError("No cached location data available.");
          }
          setLoading(false);
          return;
        }

        let fetchedAddress: Address | null = null;
        let fetchedWeather: Weather | null = null;

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
                logger.warn(`Address provider ${prov.name} returned ${res.status}`);
                continue;
              }
              const data = await res.json();
              if (prov.name === 'bigdatacloud') {
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
              if (data && data.address) {
                fetchedAddress = data.address;
                return;
              }
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
            }
          }
        };

        await tryAddressProviders();

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
            logger.warn(`Weather fetch returned ${weatherRes.status}`);
          }
        } catch (err) {
          if ((err as any)?.name === 'AbortError') {
            logger.warn('Weather fetch timed out');
          } else {
            logger.warn('Weather fetch failed:', err);
          }
        }

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
          if (storedLocation) {
            setAddress(storedLocation.address || null);
            setWeather(storedLocation.weather || null);
            setIsUsingCachedData(true);
            setError('Using cached data');
          } else {
            setError('Unable to fetch location details');
          }
        }

      } catch (err: unknown) {
        logger.warn('Unexpected fetch error:', err);
        if (storedLocation) {
          setAddress(storedLocation.address || null);
          setWeather(storedLocation.weather || null);
          setIsUsingCachedData(true);
          setError('Using cached data');
        } else {
          setError('Unable to fetch location details');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [lat, lon, isOnline, storedLocation, storeLocation]);

  useEffect(() => {
    if (!isOnline && storedLocation && !loading) {
      const timeoutId = setTimeout(() => {
        setAddress(storedLocation.address || null);
        setWeather(storedLocation.weather || null);
        setIsUsingCachedData(true);
        setError(null);
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [storedLocation, isOnline, loading]);

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-white to-slate-50 border border-slate-200 rounded-xl px-6 py-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
          <span className="text-sm text-slate-600 font-medium">Loading location...</span>
        </div>
      </div>
    );
  }

  if (error && !address && !weather) {
    return (
      <div className="bg-gradient-to-r from-red-50 to-white border border-red-200 rounded-xl px-6 py-3 shadow-md">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-sm text-red-700">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-white to-slate-50 border border-slate-200 rounded-xl shadow-md overflow-hidden">
      <div className="px-6 py-3 grid grid-cols-2 gap-6">
        {/* Address Section */}
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-slate-900 truncate">
              {address?.city || address?.town || address?.village || "Unknown City"}
              {address?.state && `, ${address.state}`}
            </div>
            <div className="text-xs text-slate-500 truncate">
              {address?.country || "Unknown"} {address?.postcode && `· ${address.postcode}`}
            </div>
          </div>
          {!isOnline && (
            <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium whitespace-nowrap">
              Offline
            </span>
          )}
          {isUsingCachedData && (
            <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium whitespace-nowrap">
              Cached
            </span>
          )}
        </div>

        {/* Weather Section */}
        <div className="flex items-center gap-4 border-l border-slate-200 pl-6">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-slate-900">
              {weather?.temperature != null ? `${weather.temperature}°C` : "N/A"}
              <span className="mx-2 text-slate-300">·</span>
              <span className="font-normal text-slate-700">
                {weather?.weathercode != null ? weatherDescriptions[weather.weathercode] || "Unknown" : "N/A"}
              </span>
            </div>
            <div className="text-xs text-slate-500">
              {weather?.windspeed != null && `Wind: ${weather.windspeed} km/h`}
              {weather?.winddirection != null && ` at ${weather.winddirection}°`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationDetailsHorizontal;
