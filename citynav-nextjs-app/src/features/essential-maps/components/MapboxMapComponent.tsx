"use client";

import React, { useEffect, useState, useCallback } from "react";
import Map, {
  Marker,
  Popup,
  NavigationControl,
  GeolocateControl,
} from "react-map-gl/mapbox";
import { FiStar, FiNavigation, FiBookmark, FiMapPin } from "react-icons/fi";
import { POI } from "@/features/essential-maps/types/essential-maps.types";
import { osmService } from "@/services/osm.service";
import { useLocation } from "@/hooks/useLiveLocation";
import "mapbox-gl/dist/mapbox-gl.css";
import "@/features/essential-maps/styles/map-component.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";
const DEFAULT_LAT = parseFloat(
  process.env.NEXT_PUBLIC_DEFAULT_LAT || "18.5204"
);
const DEFAULT_LNG = parseFloat(
  process.env.NEXT_PUBLIC_DEFAULT_LNG || "73.8567"
);

interface MapboxMapComponentProps {
  pois?: POI[];
  selectedPOI?: POI | null;
  onPOISelect?: (poi: POI) => void;
  activeFilters?: string[];
}

const MapboxMapComponent: React.FC<MapboxMapComponentProps> = ({
  onPOISelect,
  activeFilters = [],
}) => {
  const { location, requestLocation } = useLocation();
  const [localPois, setLocalPois] = useState<POI[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<POI | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [viewState, setViewState] = useState({
    longitude: DEFAULT_LNG,
    latitude: DEFAULT_LAT,
    zoom: 13,
  });

  // Filter POIs based on active filters
  const filteredPOIs =
    activeFilters.length === 0
      ? localPois
      : localPois.filter((poi) => activeFilters.includes(poi.type));

  console.log("🗺️ Mapbox Map Debug:");
  console.log("- Total POIs:", localPois.length);
  console.log("- Filtered POIs:", filteredPOIs.length);
  console.log("- Active filters:", activeFilters);
  console.log("- User location:", userLocation);
  console.log("- Mapbox token available:", !!MAPBOX_TOKEN);

  if (filteredPOIs.length > 0) {
    console.log(
      "- First 3 POIs to render:",
      filteredPOIs.slice(0, 3).map((p) => ({
        name: p.name,
        lat: p.lat,
        lng: p.lng,
        type: p.type,
      }))
    );
  }

  // Fetch nearby POIs
  const fetchNearbyPOIs = useCallback(
    async (lat: number, lng: number) => {
      setLoading(true);
      console.log("=== FETCHING POIs FROM OPENSTREETMAP ===");
      console.log("Location:", lat, lng);
      console.log("Active filters:", activeFilters);

      try {
        const typesToFetch =
          activeFilters.length === 0 ? ["all"] : activeFilters;
        console.log("Fetching POIs for types:", typesToFetch);

        const nearbyPois = await osmService.fetchNearbyPOIs(
          lat,
          lng,
          2000, // 2km radius
          typesToFetch
        );

        console.log("✅ Found POIs:", nearbyPois.length);
        console.log(
          "📍 Sample POIs:",
          nearbyPois.slice(0, 5).map((p: POI) => ({
            name: p.name,
            type: p.type,
            distance: p.distance,
            lat: p.lat,
            lng: p.lng,
          }))
        );
        setLocalPois(nearbyPois);

        // Show alert if no POIs found
        if (nearbyPois.length === 0) {
          console.warn("⚠️ No POIs found nearby!");
        } else {
          console.log(`✅ Displaying ${nearbyPois.length} POIs on map`);
        }

        // Dispatch event to update POIs in parent component
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("poisUpdated", { detail: nearbyPois })
          );
        }
      } catch (error) {
        console.error("Error fetching POIs:", error);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("poisUpdated", { detail: [] }));
        }
      } finally {
        setLoading(false);
      }
    },
    [activeFilters]
  );

  // Update user location when live location is available
  useEffect(() => {
    if (location) {
      const newLocation: [number, number] = [location.lon, location.lat];
      setUserLocation(newLocation);
      setViewState({
        longitude: location.lon,
        latitude: location.lat,
        zoom: 14,
      });
      fetchNearbyPOIs(location.lat, location.lon);
    } else {
      requestLocation();
    }
  }, [location, requestLocation, fetchNearbyPOIs]);

  // Fetch POIs when filters change
  useEffect(() => {
    if (userLocation) {
      fetchNearbyPOIs(viewState.latitude, viewState.longitude);
    }
  }, [activeFilters]);

  // Get user location on mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log("Got user location:", latitude, longitude);
          setUserLocation([longitude, latitude]);
          setViewState({
            longitude,
            latitude,
            zoom: 14,
          });
          fetchNearbyPOIs(latitude, longitude);
        },
        (error) => {
          console.error("Geolocation error:", error.message);
          setLoading(false);
          setUserLocation([DEFAULT_LNG, DEFAULT_LAT]);
          fetchNearbyPOIs(DEFAULT_LAT, DEFAULT_LNG);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    }
  };

  const toggleBookmark = (poiId: string) => {
    setLocalPois((prevPois) =>
      prevPois.map((poi) =>
        poi.id === poiId ? { ...poi, isBookmarked: !poi.isBookmarked } : poi
      )
    );
  };

  const getRatingColor = (rating: number): string => {
    if (rating >= 4.5) return "#4CAF50";
    if (rating >= 4.0) return "#8BC34A";
    if (rating >= 3.5) return "#FFC107";
    if (rating >= 3.0) return "#FF9800";
    return "#F44336";
  };

  const formatDistance = (distance?: string | number): string => {
    if (!distance) return "";

    // If distance is already a string, return it
    if (typeof distance === "string") return distance;

    // If distance is a number (meters), format it
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    }
    return `${(distance / 1000).toFixed(1)}km`;
  };

  const getMarkerIcon = (type: string): string => {
    const iconMap: { [key: string]: string } = {
      restroom: "🚻",
      atm: "🏧",
      bank: "🏦",
      water: "💧",
      food: "🍽️",
      restaurant: "🍴",
      cafe: "☕",
      hotel: "🏨",
      fuel: "⛽",
      hospital: "🏥",
      pharmacy: "💊",
      park: "🌳",
      police: "🚓",
      fire_station: "🚒",
    };
    return iconMap[type] || "📍";
  };

  return (
    <div className="mapWrapper">
      {loading && (
        <div className="loadingOverlay">
          <div className="spinner">
            {userLocation
              ? "Loading nearby POIs..."
              : "Getting your location..."}
          </div>
        </div>
      )}

      <Map
        {...viewState}
        onMove={(evt: any) => setViewState(evt.viewState)}
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: "100%", height: "500px" }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
      >
        {/* Navigation Controls */}
        <NavigationControl position="top-right" />

        {/* Geolocate Control */}
        <GeolocateControl
          position="top-right"
          trackUserLocation
          onGeolocate={(e: any) => {
            const { longitude, latitude } = e.coords;
            setUserLocation([longitude, latitude]);
            fetchNearbyPOIs(latitude, longitude);
          }}
        />

        {/* User Location Marker */}
        {userLocation && (
          <Marker
            longitude={userLocation[0]}
            latitude={userLocation[1]}
            anchor="center"
          >
            <div
              style={{
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                backgroundColor: "#007AFF",
                border: "4px solid white",
                boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
              }}
            />
          </Marker>
        )}

        {/* POI Markers */}
        {filteredPOIs.map((poi, index) => (
          <Marker
            key={`marker-${poi.id}-${index}`}
            longitude={poi.lng}
            latitude={poi.lat}
            anchor="center"
            onClick={(e: any) => {
              e.originalEvent.stopPropagation();
              setSelectedMarker(poi);
              onPOISelect?.(poi);
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: poi.isBookmarked ? "#FF6B6B" : "#2E7D5E",
                border: "3px solid white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
                cursor: "pointer",
              }}
            >
              {getMarkerIcon(poi.type)}
            </div>
          </Marker>
        ))}

        {/* Popup for selected POI */}
        {selectedMarker && (
          <Popup
            longitude={selectedMarker.lng}
            latitude={selectedMarker.lat}
            anchor="bottom"
            onClose={() => setSelectedMarker(null)}
            closeOnClick={false}
            className="customPopup"
          >
            <div className="popup">
              <div className="popupHeader">
                <h4>{selectedMarker.name}</h4>
                <button
                  className={`bookmarkBtn ${
                    selectedMarker.isBookmarked ? "bookmarked" : ""
                  }`}
                  onClick={() => toggleBookmark(selectedMarker.id)}
                >
                  <FiBookmark size={16} />
                </button>
              </div>

              {selectedMarker.area && (
                <p className="popupArea">📍 {selectedMarker.area}</p>
              )}

              {selectedMarker.description && (
                <p className="popupDescription">{selectedMarker.description}</p>
              )}

              {selectedMarker.amenities &&
                selectedMarker.amenities.length > 0 && (
                  <div className="amenities">
                    <strong>Amenities:</strong>
                    <div className="amenityTags">
                      {selectedMarker.amenities.map((amenity, idx) => (
                        <span
                          key={`amenity-${selectedMarker.id}-${idx}`}
                          className="amenityTag"
                        >
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              <div className="ratings">
                {selectedMarker.ratings.cleanliness && (
                  <div className="rating">
                    <FiStar
                      size={14}
                      fill={getRatingColor(selectedMarker.ratings.cleanliness)}
                      color={getRatingColor(selectedMarker.ratings.cleanliness)}
                    />
                    <span>
                      {selectedMarker.ratings.cleanliness} Cleanliness
                    </span>
                  </div>
                )}
                {selectedMarker.ratings.safety && (
                  <div className="rating">
                    <FiStar
                      size={14}
                      fill={getRatingColor(selectedMarker.ratings.safety)}
                      color={getRatingColor(selectedMarker.ratings.safety)}
                    />
                    <span>{selectedMarker.ratings.safety} Safety</span>
                  </div>
                )}
              </div>

              <div className="popupActions">
                <button
                  className="directionsBtn"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.dispatchEvent(
                        new CustomEvent("openDirections", {
                          detail: selectedMarker,
                        })
                      );
                    }
                  }}
                >
                  <FiNavigation size={14} />
                  Directions
                </button>
                <span className="distance">
                  {formatDistance(selectedMarker.distance)} away
                </span>
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Refresh Location Button */}
      <button
        className="locationBtn"
        onClick={getCurrentLocation}
        title="Get my location and refresh POIs"
        disabled={loading}
      >
        <FiMapPin size={20} />
      </button>
    </div>
  );
};

export default MapboxMapComponent;
