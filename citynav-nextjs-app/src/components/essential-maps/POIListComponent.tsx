"use client";

import React from "react";
import { FiStar, FiBookmark, FiNavigation, FiMapPin } from "react-icons/fi";
import { POI } from "../../types/essential-maps.types";
import "../../../styles/essential-maps/poi-list.css";

interface POIListComponentProps {
  pois: POI[];
  onToggleBookmark: (poiId: string) => void;
  onPOIClick: (poi: POI) => void;
  onDirectionsClick: (poi: POI) => void;
}

const POIListComponent: React.FC<POIListComponentProps> = ({
  pois,
  onToggleBookmark,
  onPOIClick,
  onDirectionsClick,
}) => {
  const getTypeIcon = (type: string): string => {
    const iconMap: { [key: string]: string } = {
      restroom: "🚻",
      atm: "🏧",
      water: "💧",
      food: "🍽️",
    };
    return iconMap[type] || "📍";
  };

  const getTypeLabel = (type: string): string => {
    const labelMap: { [key: string]: string } = {
      restroom: "Restroom",
      atm: "ATM",
      water: "Water Station",
      food: "Food Court",
    };
    return labelMap[type] || "Location";
  };

  const getRatingColor = (rating: number): string => {
    if (rating >= 4.5) return "#4CAF50";
    if (rating >= 4.0) return "#8BC34A";
    if (rating >= 3.5) return "#FFC107";
    if (rating >= 3.0) return "#FF9800";
    return "#F44336";
  };

  const calculateDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): string => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  // Default location (Pune, India) for distance calculation
  const defaultPosition = [
    parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LAT || "18.5204"),
    parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LNG || "73.8567"),
  ];

  return (
    <div className="container">
      <div className="header">
        <h3>Nearby Essentials</h3>
        <span className="resultCount">{pois.length} places found</span>
      </div>

      <div className="poiList">
        {pois.length === 0 ? (
          <div className="emptyState">
            <FiMapPin size={48} color="#ccc" />
            <p>No places found matching your filters</p>
            <span>Try adjusting your search criteria</span>
          </div>
        ) : (
          pois.map((poi) => (
            <div key={poi.id} className="poiItem">
              <div className="poiContent" onClick={() => onPOIClick(poi)}>
                <div className="poiIcon">{getTypeIcon(poi.type)}</div>

                <div className="poiInfo">
                  <div className="poiHeader">
                    <h4>{poi.name}</h4>
                    <span className="poiType">{getTypeLabel(poi.type)}</span>
                  </div>

                  <p className="poiDistance">
                    {calculateDistance(
                      defaultPosition[0],
                      defaultPosition[1],
                      poi.lat,
                      poi.lng
                    )}{" "}
                    away
                  </p>

                  {poi.description && (
                    <p className="poiDescription">{poi.description}</p>
                  )}

                  <div className="ratings">
                    {poi.ratings.cleanliness && (
                      <div className="rating">
                        <FiStar
                          size={12}
                          fill={getRatingColor(poi.ratings.cleanliness)}
                          color={getRatingColor(poi.ratings.cleanliness)}
                        />
                        <span>{poi.ratings.cleanliness} Cleanliness</span>
                      </div>
                    )}
                    {poi.ratings.safety && (
                      <div className="rating">
                        <FiStar
                          size={12}
                          fill={getRatingColor(poi.ratings.safety)}
                          color={getRatingColor(poi.ratings.safety)}
                        />
                        <span>{poi.ratings.safety} Safety</span>
                      </div>
                    )}
                    {poi.ratings.working && (
                      <div className="rating">
                        <FiStar
                          size={12}
                          fill={getRatingColor(poi.ratings.working)}
                          color={getRatingColor(poi.ratings.working)}
                        />
                        <span>{poi.ratings.working} Working</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="poiActions">
                <button
                  className={`bookmarkBtn ${
                    poi.isBookmarked ? "bookmarked" : ""
                  }`}
                  onClick={() => onToggleBookmark(poi.id)}
                  title={poi.isBookmarked ? "Remove bookmark" : "Add bookmark"}
                >
                  <FiBookmark size={16} />
                </button>

                <button
                  className="directionsBtn"
                  onClick={() => onDirectionsClick(poi)}
                  title="Get directions"
                >
                  <FiNavigation size={14} />
                  Directions
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default POIListComponent;
