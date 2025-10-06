"use client";

import React, { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { FiBookmark } from "react-icons/fi";
import { POI } from "../../types/essential-maps.types";
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

// Sample POI data
const samplePOIs: POI[] = [
  {
    id: "1",
    type: "restroom",
    name: "Phoenix Mall - Public Restroom",
    lat: 18.5206,
    lng: 73.8567,
    ratings: { cleanliness: 4.2, safety: 4.5 },
    isBookmarked: false,
    description: "Clean public restroom with wheelchair access",
  },
  {
    id: "2",
    type: "atm",
    name: "HDFC ATM",
    lat: 18.521,
    lng: 73.857,
    ratings: { safety: 4.3, working: 4.8 },
    isBookmarked: true,
    description: "24/7 ATM with security guard",
  },
  {
    id: "3",
    type: "water",
    name: "RO Water Station",
    lat: 18.5198,
    lng: 73.8555,
    ratings: { cleanliness: 4.6, safety: 4.1 },
    isBookmarked: false,
    description: "Purified drinking water station",
  },
  {
    id: "4",
    type: "food",
    name: "Food Court - Seasons Mall",
    lat: 18.5215,
    lng: 73.858,
    ratings: { cleanliness: 4.0, safety: 4.4 },
    isBookmarked: false,
    description: "Multi-cuisine food court",
  },
];

const EssentialMapsPage: React.FC = () => {
  const [pois, setPois] = useState(samplePOIs);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [isDirectionsOpen, setIsDirectionsOpen] = useState(false);

  // Listen for directions events from map
  React.useEffect(() => {
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
        <EssentialMapComponent
          pois={filteredPOIs}
          selectedPOI={selectedPOI}
          onPOISelect={handlePOIClick}
          activeFilters={activeFilters}
        />
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
