"use client";

import React, { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { FiBookmark, FiMapPin, FiRefreshCw } from "react-icons/fi";
import { POI } from "@/features/essential-maps/types/essential-maps.types";
import { useLocation } from "@/hooks/useLiveLocation";
import FeatureNavigation from "@/components/FeatureNavigation";
import CategoryNavigation from "@/features/essential-maps/components/CategoryNavigation";
import "@/features/essential-maps/styles/essential-maps.css";

// Dynamically import components to avoid SSR issues
const MapboxMapComponent = dynamic(
  () => import("@/features/essential-maps/components/MapboxMapComponent"),
  {
    ssr: false,
    loading: () => <div className="mapLoader">Loading Mapbox map...</div>,
  }
);

const POIFilterComponent = dynamic(
  () => import("@/features/essential-maps/components/POIFilterComponent"),
  { ssr: false }
);

const POIListComponent = dynamic(
  () => import("@/features/essential-maps/components/POIListComponent"),
  { ssr: false }
);

const DirectionsModal = dynamic(
  () => import("@/features/essential-maps/components/DirectionsModal"),
  { ssr: false }
);

// Category definitions (without count - will be added dynamically)
const baseCategories = [
  { id: "atm", name: "ATM", icon: "🏧" },
  { id: "bank", name: "Bank", icon: "🏦" },
  { id: "restroom", name: "Restroom", icon: "🚻" },
  { id: "food", name: "Food", icon: "🍽️" },
  { id: "restaurant", name: "Restaurant", icon: "🍴" },
  { id: "cafe", name: "Café", icon: "☕" },
  { id: "hotel", name: "Hotel", icon: "🏨" },
  { id: "hospital", name: "Hospital", icon: "🏥" },
  { id: "pharmacy", name: "Pharmacy", icon: "💊" },
  { id: "water", name: "Water", icon: "💧" },
  { id: "fuel", name: "Fuel Station", icon: "⛽" },
  { id: "park", name: "Park", icon: "🌳" },
  { id: "police", name: "Police", icon: "🚓" },
  { id: "fire_station", name: "Fire Station", icon: "🚒" },
];

const EssentialMapsPage: React.FC = () => {
  const { location, error, loading, requestLocation } = useLocation();
  const [pois, setPois] = useState<POI[]>([]);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [isDirectionsOpen, setIsDirectionsOpen] = useState(false);

  // Listen for POI updates from the map component
  useEffect(() => {
    const handlePOIsUpdated = (event: CustomEvent) => {
      const newPOIs = event.detail;
      if (newPOIs && Array.isArray(newPOIs)) {
        setPois(newPOIs);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener(
        "poisUpdated",
        handlePOIsUpdated as EventListener
      );
      return () => {
        window.removeEventListener(
          "poisUpdated",
          handlePOIsUpdated as EventListener
        );
      };
    }
  }, []);

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

  // Filter POIs based on active filters OR selected category
  const filteredPOIs = selectedCategory
    ? pois.filter((poi) => poi.type === selectedCategory)
    : activeFilters.length === 0
    ? pois
    : pois.filter((poi) => activeFilters.includes(poi.type));

  // Get bookmarked POIs
  const bookmarkedPOIs = pois.filter((poi) => poi.isBookmarked);

  // Handle category selection
  const handleCategorySelect = useCallback((categoryId: string | null) => {
    setSelectedCategory(categoryId);
    // Update active filters to match selected category
    if (categoryId) {
      setActiveFilters([categoryId]);
    } else {
      setActiveFilters([]);
    }
  }, []);

  // Handle filter changes
  const handleFilterChange = useCallback((filters: string[]) => {
    setActiveFilters(filters);
    // Clear selected category when using filters
    if (filters.length > 0) {
      setSelectedCategory(null);
    }
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

  // Add count to categories dynamically
  const categoriesWithCounts = baseCategories.map((cat) => ({
    ...cat,
    count: pois.filter((poi) => poi.type === cat.id).length,
  }));

  return (
    <div className="container">
      {/* Feature Navigation Tabs */}
      {/* <FeatureNavigation /> */}

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
          <MapboxMapComponent
            pois={filteredPOIs}
            selectedPOI={selectedPOI}
            onPOISelect={handlePOIClick}
            activeFilters={activeFilters}
          />
        )}
      </div>

      {/* Category Navigation - MOVED BELOW MAP */}
      <CategoryNavigation
        categories={categoriesWithCounts}
        pois={pois}
        onCategorySelect={handleCategorySelect}
      />

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
