"use client";

import React, { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { FiBookmark, FiMapPin, FiRefreshCw } from "react-icons/fi";
import { POI } from "../../types/essential-maps.types";
import { useLocation } from "../../hooks/useLiveLocation";
import "../../../styles/essential-maps/essential-maps.css";

// Dynamically import components to avoid SSR issues
const EssentialMapComponent = dynamic(
  () => import("../../components/essential-maps/EssentialMapComponent"),
  {
    ssr: false,
    loading: () => <div className="mapLoader">Loading map...</div>,
  }
);

const POIFilterComponent = dynamic(
  () => import("../../components/essential-maps/POIFilterComponent"),
  { ssr: false }
);

const POIListComponent = dynamic(
  () => import("../../components/essential-maps/POIListComponent"),
  { ssr: false }
);

const DirectionsModal = dynamic(
  () => import("../../components/essential-maps/DirectionsModal"),
  { ssr: false }
);

// Generate POIs based on current location
const generateLocationBasedPOIs = (
  lat: number,
  lng: number,
  cityName: string
): POI[] => {
  return [
    {
      id: "1",
      type: "restroom",
      name: `${cityName} - Public Restroom`,
      lat: lat + 0.001,
      lng: lng + 0.001,
      ratings: { cleanliness: 4.2, safety: 4.5 },
      isBookmarked: false,
      description: "Clean public restroom with wheelchair access",
    },
    {
      id: "2",
      type: "atm",
      name: "Local Bank ATM",
      lat: lat + 0.002,
      lng: lng - 0.001,
      ratings: { safety: 4.3, working: 4.8 },
      isBookmarked: true,
      description: "24/7 ATM with security guard",
    },
    {
      id: "3",
      type: "water",
      name: "Water Station",
      lat: lat - 0.001,
      lng: lng + 0.002,
      ratings: { cleanliness: 4.6, safety: 4.1 },
      isBookmarked: false,
      description: "Purified drinking water station",
    },
    {
      id: "4",
      type: "food",
      name: `${cityName} Food Court`,
      lat: lat + 0.003,
      lng: lng + 0.003,
      ratings: { cleanliness: 4.0, safety: 4.4 },
      isBookmarked: false,
      description: "Multi-cuisine food court",
    },
    {
      id: "5",
      type: "hospital",
      name: `${cityName} Medical Center`,
      lat: lat - 0.002,
      lng: lng - 0.002,
      ratings: { safety: 4.7, service: 4.3 },
      isBookmarked: false,
      description: "Emergency medical services available",
    },
    {
      id: "6",
      type: "pharmacy",
      name: "Local Pharmacy",
      lat: lat + 0.0015,
      lng: lng - 0.0015,
      ratings: { safety: 4.5, service: 4.2 },
      isBookmarked: false,
      description: "24/7 pharmacy with prescription services",
    },
  ];
};

const EssentialMapsPage: React.FC = () => {
  const { location, error, loading, requestLocation } = useLocation();
  const [pois, setPois] = useState<POI[]>([]);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [isDirectionsOpen, setIsDirectionsOpen] = useState(false);

  // Generate POIs based on current location
  useEffect(() => {
    if (location) {
      const locationBasedPOIs = generateLocationBasedPOIs(
        location.lat,
        location.lon,
        location.city
      );
      setPois(locationBasedPOIs);
    }
  }, [location]);

  // Listen for directions events from map
  useEffect(() => {
    const handleOpenDirections = (event: CustomEvent) => {
      const poi = event.detail;
      setSelectedPOI(poi);
      setIsDirectionsOpen(true);
    };

    if (typeof window !== "undefined") {
      window.addEventListener(
        "openDirections",
        handleOpenDirections as EventListener
      );
      return () => {
        window.removeEventListener(
          "openDirections",
          handleOpenDirections as EventListener
        );
      };
    }
  }, []);

  // Filter POIs based on active filters
  const filteredPOIs =
    activeFilters.length === 0
      ? pois
      : pois.filter((poi) => activeFilters.includes(poi.type));

  // Get bookmarked POIs
  const bookmarkedPOIs = pois.filter((poi) => poi.isBookmarked);

  // Handle filter changes
  const handleFilterChange = useCallback((filters: string[]) => {
    setActiveFilters(filters);
  }, []);

  // Toggle bookmark status
  const handleToggleBookmark = useCallback((poiId: string) => {
    setPois((prevPois) =>
      prevPois.map((poi) =>
        poi.id === poiId ? { ...poi, isBookmarked: !poi.isBookmarked } : poi
      )
    );
  }, []);

  // Handle POI click (focus on map)
  const handlePOIClick = useCallback((poi: POI) => {
    // This would typically center the map on the POI
    console.log("Focus on POI:", poi);
    setSelectedPOI(poi);
  }, []);

  // Handle directions click
  const handleDirectionsClick = useCallback((poi: POI) => {
    setSelectedPOI(poi);
    setIsDirectionsOpen(true);
  }, []);

  // Close directions modal
  const handleCloseDirections = useCallback(() => {
    setIsDirectionsOpen(false);
    setSelectedPOI(null);
  }, []);

  return (
    <div className="container">
      {/* Header with filters and actions */}
      <div className="header">
        <div className="headerTop">
          <h1 className="title">Essential Maps</h1>
          <div className="headerActions">
            {location && (
              <div className="locationStatus">
                <FiMapPin size={16} />
                <span>
                  {location.city}, {location.country}
                </span>
              </div>
            )}
            {!location && !loading && (
              <button onClick={requestLocation} className="locationBtn">
                <FiMapPin size={16} />
                Get Location
              </button>
            )}
            {loading && (
              <div className="locationStatus">
                <FiRefreshCw size={16} className="spinning" />
                <span>Getting location...</span>
              </div>
            )}
            <button
              className={`bookmarkBtn ${
                bookmarkedPOIs.length > 0 ? "hasBookmarks" : ""
              }`}
            >
              <FiBookmark size={20} />
              Saved ({bookmarkedPOIs.length})
            </button>
            <POIFilterComponent
              activeFilters={activeFilters}
              onFilterChange={handleFilterChange}
              isOpen={isFilterOpen}
              onToggle={() => setIsFilterOpen(!isFilterOpen)}
            />
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="mapContainer">
        {!location && !loading && (
          <div className="locationPrompt">
            <FiMapPin size={48} />
            <h3>Location Required</h3>
            <p>
              Please enable location services to see essential places around
              you.
            </p>
            <button onClick={requestLocation} className="locationBtn">
              <FiMapPin size={16} />
              Get My Location
            </button>
            {error && <p className="errorText">Error: {error.message}</p>}
          </div>
        )}
        {location && (
          <EssentialMapComponent
            pois={filteredPOIs}
            selectedPOI={selectedPOI}
            onPOISelect={handlePOIClick}
            activeFilters={activeFilters}
          />
        )}
      </div>

      {/* Bottom POI List */}
      <POIListComponent
        pois={filteredPOIs}
        onToggleBookmark={handleToggleBookmark}
        onPOIClick={handlePOIClick}
        onDirectionsClick={handleDirectionsClick}
      />

      {/* Directions Modal */}
      <DirectionsModal
        isOpen={isDirectionsOpen}
        onClose={handleCloseDirections}
        destination={selectedPOI}
      />
    </div>
  );
};

export default EssentialMapsPage;
