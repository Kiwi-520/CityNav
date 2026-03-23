"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { FiSearch, FiMapPin, FiClock, FiStar } from "react-icons/fi";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { useOfflineLocation } from "@/features/offline-onboarding/hooks/useOfflineLocation";

interface SearchResult {
  id: string;
  name: string;
  type: string;
  address: string;
  distance?: string;
  distanceMeters?: number;
  rating?: number;
  lat: number;
  lon: number;
}

type CurrentLocation = {
  lat: number;
  lon: number;
};

const SEARCH_PLACE_TYPES = [
  "restaurant",
  "cafe",
  "hospital",
  "pharmacy",
  "atm",
  "bank",
  "shopping_mall",
  "supermarket",
  "lodging",
  "train_station",
  "bus_station",
  "tourist_attraction",
  "museum",
  "park",
  "gas_station",
] as const;

const SEARCH_RADIUS_METERS = 4000;

const toReadableType = (types?: string[]): string => {
  if (!types || types.length === 0) return "Place";
  return types[0]
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const toDistanceText = (distanceMeters: number): string => {
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)} m`;
  return `${(distanceMeters / 1000).toFixed(1)} km`;
};

const haversineDistanceMeters = (
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number
): number => {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const latDelta = toRadians(toLat - fromLat);
  const lonDelta = toRadians(toLon - fromLon);
  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(toRadians(fromLat)) *
      Math.cos(toRadians(toLat)) *
      Math.sin(lonDelta / 2) *
      Math.sin(lonDelta / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
};

const getLocationFromBrowser = (): Promise<CurrentLocation> => {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation is not supported in this browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (error) => reject(error),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  });
};

export default function SearchDiscoveryPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userPos, setUserPos] = useState<{ lat: number; lon: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("recentSearches");
    if (saved) {
      try { setRecentSearches(JSON.parse(saved)); } catch { /* ignore */ }
    }
    // Get user's location for location-biased search
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          setUserPos({ lat: p.coords.latitude, lon: p.coords.longitude });
          setIsLocating(false);
        },
        () => {
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      setIsLocating(false);
    }
  }, []);

  /** Haversine distance in km between two coords */
  const distanceBetween = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (d: number) => d * Math.PI / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, []);

  const handleSearch = useCallback(async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    if (!userPos) {
      setIsLoading(false);
      setResults([]);
      setLocationError(
        "Current location unavailable. Turn on location and try searching again."
      );
      return;
    }

    setLocationError(null);
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ query: trimmed });
      if (userPos) {
        params.set('lat', userPos.lat.toString());
        params.set('lng', userPos.lon.toString());
      }
      const res = await fetch(`/api/google-places-search?${params.toString()}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();

      const mapped: SearchResult[] = (data.results || []).map((r: any, i: number) => {
        let dist: string | undefined;
        if (userPos) {
          const km = distanceBetween(userPos.lat, userPos.lon, r.lat, r.lng);
          dist = km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
        }
        return {
          id: r.place_id || String(i),
          name: r.name,
          type: (r.types?.[0] || '').replace(/_/g, ' '),
          address: r.address,
          distance: dist,
          rating: r.rating,
          lat: r.lat,
          lon: r.lng,
        };
      });

      setResults(mapped);

      if (trimmed && !recentSearches.includes(trimmed)) {
        const newRecent = [trimmed, ...recentSearches.slice(0, 4)];
        setRecentSearches(newRecent);
        localStorage.setItem("recentSearches", JSON.stringify(newRecent));
      }
    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [userPos, recentSearches, distanceBetween]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    // Debounce 400ms to avoid spamming API
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => handleSearch(value), 400);
  };

  return (
    <>
      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          backgroundAttachment: "fixed",
        }}
      >
        <PageHeader title="Search & Discovery" showBack backHref="/" />

        <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
          {/* Search Bar */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              borderRadius: "16px",
              padding: "20px",
              marginBottom: "30px",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "rgba(255, 255, 255, 0.9)",
                borderRadius: "12px",
                padding: "12px 16px",
                color: "#333",
              }}
            >
              <FiSearch
                size={20}
                style={{ marginRight: "12px", color: "#666" }}
              />
              <input
                type="text"
                placeholder="Search for places, restaurants, landmarks..."
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: "16px",
                }}
              />
            </div>

            <p
              style={{
                margin: "12px 0 0 0",
                fontSize: "0.85rem",
                opacity: 0.85,
              }}
            >
              {isLocating && "Detecting your current location..."}
              {!isLocating && userPos && "Searching near your current location (4 km radius)."}
              {!isLocating && !userPos && "Location not available."}
            </p>
            {locationError && (
              <p
                style={{
                  margin: "6px 0 0 0",
                  fontSize: "0.85rem",
                  color: "#fecaca",
                }}
              >
                {locationError}
              </p>
            )}
          </div>

          {/* Recent Searches */}
          {!query && recentSearches.length > 0 && (
            <div
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                borderRadius: "16px",
                padding: "20px",
                marginBottom: "30px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <FiClock size={18} />
                  Recent Searches
                </h3>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => handleQueryChange(search)}
                    style={{
                      background: "rgba(255, 255, 255, 0.1)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      color: "white",
                      padding: "8px 16px",
                      borderRadius: "20px",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    {search}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div style={{ textAlign: "center", margin: "40px 0" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  border: "3px solid rgba(255, 255, 255, 0.3)",
                  borderTop: "3px solid white",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                  margin: "0 auto",
                }}
              />
              <p style={{ marginTop: "16px", opacity: 0.7 }}>Searching...</p>
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div>
              <h3 style={{ marginBottom: "20px", color: "#fbbf24" }}>
                Found {results.length} result{results.length !== 1 ? "s" : ""}
              </h3>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                {results.map((result) => (
                  <div
                    key={result.id}
                    style={{
                      background: "rgba(255, 255, 255, 0.1)",
                      borderRadius: "16px",
                      padding: "20px",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <h4
                          style={{
                            margin: "0 0 8px 0",
                            fontSize: "1.2rem",
                            fontWeight: "600",
                          }}
                        >
                          {result.name}
                        </h4>
                        <p
                          style={{
                            margin: "0 0 8px 0",
                            opacity: 0.7,
                            fontSize: "0.9rem",
                          }}
                        >
                          {result.type}
                        </p>
                        <p
                          style={{
                            margin: 0,
                            opacity: 0.8,
                            fontSize: "0.9rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <FiMapPin size={16} />
                          {result.address}
                        </p>
                        {result.distance && (
                          <p
                            style={{
                              margin: "8px 0 0 0",
                              opacity: 0.6,
                              fontSize: "0.8rem",
                            }}
                          >
                            {result.distance} away
                          </p>
                        )}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-end",
                          gap: "8px",
                        }}
                      >
                        {result.rating && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              background: "rgba(251, 191, 36, 0.2)",
                              padding: "4px 8px",
                              borderRadius: "8px",
                              color: "#fbbf24",
                            }}
                          >
                            <FiStar size={14} fill="currentColor" />
                            {result.rating}
                          </div>
                        )}
                        <Link
                          href={`/route-options?destination=${encodeURIComponent(
                            result.name
                          )}${userPos ? `&sourceLat=${userPos.lat}&sourceLng=${userPos.lon}` : ''}&destLat=${result.lat}&destLng=${result.lon}`}
                          style={{
                            background: "rgba(34, 197, 94, 0.2)",
                            border: "1px solid #22c55e",
                            color: "#22c55e",
                            padding: "8px 16px",
                            borderRadius: "8px",
                            textDecoration: "none",
                            fontSize: "0.9rem",
                            fontWeight: "600",
                          }}
                        >
                          Get Directions
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {query && !isLoading && results.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                background: "rgba(255, 255, 255, 0.05)",
                borderRadius: "16px",
                border: "2px dashed rgba(255, 255, 255, 0.2)",
              }}
            >
              <FiSearch
                size={48}
                style={{ color: "#9ca3af", marginBottom: "16px" }}
              />
              <h3 style={{ margin: "0 0 8px 0" }}>No results found</h3>
              <p style={{ margin: 0, opacity: 0.7 }}>
                Try searching for something else or check your spelling
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
