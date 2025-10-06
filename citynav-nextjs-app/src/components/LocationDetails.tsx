"use client";

import React, { useEffect, useState, useRef } from "react";
import { useOfflineLocation } from "@/hooks/useOfflineLocation";

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
                console.warn(`Address provider ${prov.name} returned ${res.status} ${res.statusText}`);
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
                console.warn(`Address provider ${prov.name} timed out`);
              } else {
                console.warn(`Address provider ${prov.name} failed:`, err);
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
            console.warn(`Weather fetch returned ${weatherRes.status} ${weatherRes.statusText}`);
          }
        } catch (err) {
          if ((err as any)?.name === 'AbortError') {
            console.warn('Weather fetch timed out');
          } else {
            console.warn('Weather fetch failed (network?):', err);
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
        console.warn('Unexpected fetch error:', err);
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

  if (loading) return <div>Loading location details...</div>;
  
  if (error) return (
    <div style={{ border: "1px solid #ff6b6b", padding: 16, borderRadius: 8, background: "#ffe0e0", margin: "16px 0" }}>
      <h3>⚠️ Location Details</h3>
      <p>{error}</p>
      {isUsingCachedData && (
        <small style={{ color: "#666" }}>
          Showing cached data from previous session.
        </small>
      )}
    </div>
  );

  if (!address || !weather) {
    return <div>No location details to display.</div>;
  }

  return (
    <div style={{ border: "1px solid #ccc", padding: 16, borderRadius: 8, background: "#fafafa", margin: "16px 0" }}>
      <h3>
        📍 Location Details
        {!isOnline && (
          <span style={{ fontSize: "0.8em", color: "#ff6b6b", marginLeft: 8 }}>
            (Offline Mode)
          </span>
        )}
        {isUsingCachedData && (
          <span style={{ fontSize: "0.8em", color: "#orange", marginLeft: 8 }}>
            (Cached Data)
          </span>
        )}
      </h3>
      <p>
        <strong>Country:</strong> {address.country || "Unknown"}
        <br />
        <strong>State:</strong> {address.state || "Unknown"}
        <br />
        <strong>City:</strong> {address.city || address.town || address.village || "Unknown"}
        <br />
        <strong>Area:</strong> {address.suburb || address.road || "Unknown"}
        <br />
        <strong>Postal Code:</strong> {address.postcode || "Unknown"}
      </p>
      <h4>🌤️ Weather</h4>
      <p>
        <strong>Temperature:</strong> {weather.temperature}°C
        <br />
        <strong>Condition:</strong> {weatherDescriptions[weather.weathercode ?? 0] ?? "Unknown"}
        <br />
        <strong>Wind:</strong> {weather.windspeed} km/h at {weather.winddirection}°
        <br />
        <strong>Time:</strong> {weather.time}
      </p>
      {!isOnline && (
        <div style={{ marginTop: 12, padding: 8, background: "#e3f2fd", borderRadius: 4 }}>
          <small style={{ color: "#1976d2" }}>
            📶 You&apos;re currently offline. Location data is from your last online session.
          </small>
        </div>
      )}
    </div>
  );
};

export default LocationDetails;