"use client";

import { useState, useEffect, useRef } from "react";
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
  const [currentLocation, setCurrentLocation] = useState<CurrentLocation | null>(
    null
  );
  const [isLocating, setIsLocating] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const latestRequestIdRef = useRef(0);
  const { storedLocation, storeLocation } = useOfflineLocation();

  useEffect(() => {
    const saved = localStorage.getItem("recentSearches");
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const resolveLocation = async () => {
      if (storedLocation && !cancelled) {
        setCurrentLocation({
          lat: storedLocation.latitude,
          lon: storedLocation.longitude,
        });
      }

      try {
        setIsLocating(true);
        const freshLocation = await getLocationFromBrowser();
        if (cancelled) return;

        setCurrentLocation(freshLocation);
        setLocationError(null);
        const shouldPersist =
          !storedLocation ||
          Math.abs(storedLocation.latitude - freshLocation.lat) > 0.0001 ||
          Math.abs(storedLocation.longitude - freshLocation.lon) > 0.0001;
        if (shouldPersist) {
          storeLocation({
            latitude: freshLocation.lat,
            longitude: freshLocation.lon,
            timestamp: Date.now(),
            address: storedLocation?.address,
            weather: storedLocation?.weather,
          });
        }
      } catch (error) {
        if (cancelled) return;
        if (!storedLocation) {
          setLocationError(
            "Enable location access to search places near your current location."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLocating(false);
        }
      }
    };

    void resolveLocation();

    return () => {
      cancelled = true;
    };
  }, [storedLocation?.latitude, storedLocation?.longitude, storeLocation]);

  const handleSearch = async (searchQuery: string) => {
    const normalizedQuery = searchQuery.trim();
    if (!normalizedQuery) {
      latestRequestIdRef.current += 1;
      setResults([]);
      setIsLoading(false);
      return;
    }

    if (!currentLocation) {
      setIsLoading(false);
      setResults([]);
      setLocationError(
        "Current location unavailable. Turn on location and try searching again."
      );
      return;
    }

    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;
    setIsLoading(true);
    setLocationError(null);

    try {
      const lowerQuery = normalizedQuery.toLowerCase();
      const responses = await Promise.all(
        SEARCH_PLACE_TYPES.map(async (type) => {
          const url = `/api/google-places?lat=${currentLocation.lat}&lng=${currentLocation.lon}&radius=${SEARCH_RADIUS_METERS}&type=${type}`;
          const resp = await fetch(url);
          if (!resp.ok) return [];
          const json = await resp.json();
          if (json.status && json.status !== "OK" && json.status !== "ZERO_RESULTS") {
            return [];
          }
          return Array.isArray(json.results) ? json.results : [];
        })
      );

      if (latestRequestIdRef.current !== requestId) {
        return;
      }

      const deduped = new Map<string, SearchResult>();
      for (const places of responses) {
        for (const place of places) {
          const placeId = place.place_id as string | undefined;
          const placeName = place.name as string | undefined;
          const lat = place.geometry?.location?.lat as number | undefined;
          const lon = place.geometry?.location?.lng as number | undefined;
          if (!placeId || !placeName || lat == null || lon == null) continue;
          if (deduped.has(placeId)) continue;

          const distanceMeters = haversineDistanceMeters(
            currentLocation.lat,
            currentLocation.lon,
            lat,
            lon
          );

          const mapped: SearchResult = {
            id: placeId,
            name: placeName,
            type: toReadableType(place.types),
            address: (place.vicinity as string) || "Address unavailable",
            distance: toDistanceText(distanceMeters),
            distanceMeters,
            rating: place.rating as number | undefined,
            lat,
            lon,
          };

          deduped.set(placeId, mapped);
        }
      }

      const filtered = Array.from(deduped.values())
        .filter(
          (result) =>
            result.name.toLowerCase().includes(lowerQuery) ||
            result.type.toLowerCase().includes(lowerQuery) ||
            result.address.toLowerCase().includes(lowerQuery)
        )
        .sort((a, b) => (a.distanceMeters || Infinity) - (b.distanceMeters || Infinity));

      setResults(filtered);

      const alreadyExists = recentSearches.some(
        (existing) => existing.toLowerCase() === lowerQuery
      );
      if (!alreadyExists) {
        const newRecent = [normalizedQuery, ...recentSearches.slice(0, 4)];
        setRecentSearches(newRecent);
        localStorage.setItem("recentSearches", JSON.stringify(newRecent));
      }
    } catch (error) {
      if (latestRequestIdRef.current !== requestId) {
        return;
      }
      setResults([]);
      setLocationError("Unable to fetch nearby places right now. Please try again.");
    } finally {
      if (latestRequestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    handleSearch(value);
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
              {!isLocating && currentLocation && "Searching near your current location (4 km radius)."}
              {!isLocating && !currentLocation && "Location not available."}
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
                          )}&destLat=${result.lat}&destLng=${result.lon}${
                            currentLocation
                              ? `&sourceLat=${currentLocation.lat}&sourceLng=${currentLocation.lon}`
                              : ""
                          }`}
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
