"use client";

import { useState, useEffect } from "react";
import { FiSearch, FiMapPin, FiClock, FiStar } from "react-icons/fi";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";

interface SearchResult {
  id: string;
  name: string;
  type: string;
  address: string;
  distance?: string;
  rating?: number;
  lat: number;
  lon: number;
}

export default function SearchDiscoveryPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("recentSearches");
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  const mockResults: SearchResult[] = [
    {
      id: "1",
      name: "Phoenix MarketCity",
      type: "Shopping Mall",
      address: "Viman Nagar, Pune",
      distance: "2.5 km",
      rating: 4.5,
      lat: 18.5679,
      lon: 73.9143,
    },
    {
      id: "2",
      name: "Shaniwar Wada",
      type: "Historical Site",
      address: "Shaniwar Peth, Pune",
      distance: "5.2 km",
      rating: 4.3,
      lat: 18.5196,
      lon: 73.8553,
    },
    {
      id: "3",
      name: "Pune Railway Station",
      type: "Transport Hub",
      address: "Station Road, Pune",
      distance: "4.8 km",
      rating: 4.0,
      lat: 18.529,
      lon: 73.8746,
    },
  ];

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));

    const filtered = mockResults.filter(
      (result) =>
        result.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        result.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        result.address.toLowerCase().includes(searchQuery.toLowerCase())
    );

    setResults(filtered);
    setIsLoading(false);

    if (searchQuery.trim() && !recentSearches.includes(searchQuery)) {
      const newRecent = [searchQuery, ...recentSearches.slice(0, 4)];
      setRecentSearches(newRecent);
      localStorage.setItem("recentSearches", JSON.stringify(newRecent));
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
                          )}&destLat=${result.lat}&destLng=${result.lon}`}
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
