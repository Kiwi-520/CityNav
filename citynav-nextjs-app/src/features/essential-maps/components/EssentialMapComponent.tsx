"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { FiStar, FiNavigation, FiBookmark, FiMapPin } from "react-icons/fi";
import { POI } from "@/features/essential-maps/types/essential-maps.types";
import { osmService } from "@/services/openstreetmap.service";
import { useLocation } from "@/hooks/useLiveLocation";
import "@/features/essential-maps/styles/map-component.css";

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as unknown as { _getIconUrl: unknown })
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Default map configuration (fallback when no location available)
const DEFAULT_LAT = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LAT || "0");
const DEFAULT_LNG = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LNG || "0");
const DEFAULT_ZOOM = parseInt(process.env.NEXT_PUBLIC_DEFAULT_ZOOM || "13");

// Props interface
interface EssentialMapComponentProps {
  pois?: POI[];
  selectedPOI?: POI | null;
  onPOISelect?: (poi: POI) => void;
  activeFilters?: string[];
}

// Custom icons for different POI types
const createCustomIcon = (type: string, isBookmarked: boolean = false) => {
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

  const color = isBookmarked ? "#FF6B6B" : "#2E7D5E";

  return L.divIcon({
    html: `
      <div style="
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        cursor: pointer;
      ">
        ${iconMap[type] || "📍"}
      </div>
    `,
    className: "custom-poi-icon",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

// Map Events Component
function MapEvents({
  onLocationFound,
}: {
  onLocationFound?: (latlng: L.LatLng) => void;
}) {
  const map = useMapEvents({
    click: (e) => {
      console.log("Map clicked at:", e.latlng);
    },
    locationfound: (e) => {
      console.log("Location found:", e.latlng);
      map.flyTo(e.latlng, 15); // Zoom in when location is found
      onLocationFound?.(e.latlng);
    },
    locationerror: (e) => {
      console.error("Location error:", e.message);
      // Use default location if geolocation fails
      const defaultLatLng = L.latLng(DEFAULT_LAT, DEFAULT_LNG);
      onLocationFound?.(defaultLatLng);
    },
  });

  // Automatically try to get user location when component mounts
  React.useEffect(() => {
    console.log("Attempting to get user location...");
    map.locate({
      setView: true,
      maxZoom: 15,
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    });
  }, [map]);

  return null;
}

// User Location Component
function UserLocationMarker({ position }: { position: L.LatLng | null }) {
  const userLocationIcon = L.divIcon({
    html: `
      <div style="
        background: #007AFF;
        border: 4px solid white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        animation: pulse 2s infinite;
      "></div>
      <style>
        @keyframes pulse {
          0% { box-shadow: 0 2px 10px rgba(0,0,0,0.3); }
          50% { box-shadow: 0 2px 20px rgba(0,122,255,0.5); }
          100% { box-shadow: 0 2px 10px rgba(0,0,0,0.3); }
        }
      </style>
    `,
    className: "user-location-icon",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  return position === null ? null : (
    <Marker position={position} icon={userLocationIcon}>
      <Popup>
        <div className="popup">
          <h4>📍 Your Location</h4>
          <p>You are here</p>
        </div>
      </Popup>
    </Marker>
  );
}

const EssentialMapComponent: React.FC<EssentialMapComponentProps> = ({
  pois = [],
  onPOISelect,
  activeFilters = [],
}) => {
  const { location, requestLocation } = useLocation();
  const [localPois, setLocalPois] = useState<POI[]>([]);
  const [userLocation, setUserLocation] = useState<L.LatLng | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasRealLocation, setHasRealLocation] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  // Use live location or fallback to default
  const defaultPosition: [number, number] = location
    ? [location.lat, location.lon]
    : [DEFAULT_LAT, DEFAULT_LNG];

  // Use only localPois (fetched from OSM), ignore props pois to avoid duplicates
  // The parent component will receive updates via the poisUpdated event
  const allPois = localPois;

  // Filter POIs based on active filters
  const filteredPOIs =
    activeFilters.length === 0
      ? allPois
      : allPois.filter((poi) => activeFilters.includes(poi.type));

  console.log("🔍 POI Filtering Debug:");
  console.log("- All POIs:", allPois.length);
  console.log("- Active filters:", activeFilters);
  console.log("- Filtered POIs:", filteredPOIs.length);
  if (allPois.length > 0) {
    console.log(
      "- Sample POI types:",
      allPois.slice(0, 3).map((p) => p.type)
    );
  }

  // Fetch nearby POIs from OpenStreetMap
  const fetchNearbyPOIs = useCallback(
    async (lat: number, lng: number) => {
      setLoading(true);
      console.log("=== FETCHING POIs ===");
      console.log("Location:", lat, lng);
      console.log("Active filters:", activeFilters);

      try {
        // If no filters are active, fetch all types of POIs
        const typesToFetch =
          activeFilters.length === 0 ? ["all"] : activeFilters;
        console.log("Fetching POIs for types:", typesToFetch);
        console.log("Search radius: 2000m (2km maximum)");

        const nearbyPois = await osmService.fetchNearbyPOIs(
          lat,
          lng,
          2000, // Fixed 2km radius
          typesToFetch
        );
        console.log("=== POI RESULTS ===");
        console.log("Found POIs within 2km:", nearbyPois.length);
        console.log("POI details:", nearbyPois);

        setLocalPois(nearbyPois);

        // Dispatch event to update POIs in parent component
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("poisUpdated", { detail: nearbyPois })
          );
        }
      } catch (error) {
        console.error("Error fetching POIs:", error);
        // Dispatch empty array on error
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
      const newLocation = L.latLng(location.lat, location.lon);
      setUserLocation(newLocation);
      setHasRealLocation(true);
    } else if (!hasRealLocation) {
      // Request location if we don't have it yet
      requestLocation();
    }
  }, [location, requestLocation, hasRealLocation]);

  // Fetch POIs when user location changes
  useEffect(() => {
    if (userLocation) {
      fetchNearbyPOIs(userLocation.lat, userLocation.lng);
    }
  }, [userLocation, activeFilters, fetchNearbyPOIs]);

  // Get user location on component mount
  useEffect(() => {
    console.log("Map component mounted, getting user location...");

    // Start with default location POIs immediately
    fetchNearbyPOIs(DEFAULT_LAT, DEFAULT_LNG);

    // Then try to get real location
    getCurrentLocation();

    const timer = setTimeout(() => {
      if (mapRef.current) {
        console.log("Invalidating map size");
        mapRef.current.invalidateSize();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [fetchNearbyPOIs]);

  // Get user's current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log("Got user location:", latitude, longitude);
          const userPos = L.latLng(latitude, longitude);
          setUserLocation(userPos);
          setHasRealLocation(true);

          // Immediately fetch POIs for the user's location
          fetchNearbyPOIs(latitude, longitude);

          // Center map on user location
          if (mapRef.current) {
            mapRef.current.setView([latitude, longitude], 15);
          }
        },
        (error) => {
          console.error("Geolocation error:", error.message);
          setLoading(false);
          // Fall back to default location
          const defaultPos = L.latLng(DEFAULT_LAT, DEFAULT_LNG);
          setUserLocation(defaultPos);
          fetchNearbyPOIs(DEFAULT_LAT, DEFAULT_LNG);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    } else {
      console.log("Geolocation not supported");
      // Fall back to default location
      const defaultPos = L.latLng(DEFAULT_LAT, DEFAULT_LNG);
      setUserLocation(defaultPos);
      fetchNearbyPOIs(DEFAULT_LAT, DEFAULT_LNG);
    }
  };

  // Handle user location found
  const handleLocationFound = (latlng: L.LatLng) => {
    setUserLocation(latlng);
  };

  // Toggle bookmark status
  const toggleBookmark = (poiId: string) => {
    setLocalPois((prevPois) =>
      prevPois.map((poi) =>
        poi.id === poiId ? { ...poi, isBookmarked: !poi.isBookmarked } : poi
      )
    );
    // Also notify parent component if needed
    const updatedPoi =
      localPois.find((poi) => poi.id === poiId) ||
      pois.find((poi) => poi.id === poiId);
    if (updatedPoi) {
      onPOISelect?.({ ...updatedPoi, isBookmarked: !updatedPoi.isBookmarked });
    }
  };

  // Calculate distance (simplified)
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

  const getRatingColor = (rating: number): string => {
    if (rating >= 4.5) return "#4CAF50";
    if (rating >= 4.0) return "#8BC34A";
    if (rating >= 3.5) return "#FFC107";
    if (rating >= 3.0) return "#FF9800";
    return "#F44336";
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

      <MapContainer
        center={defaultPosition}
        zoom={DEFAULT_ZOOM}
        className="leafletMapContainer"
        ref={mapRef}
        key="essential-map"
        style={{ height: "500px", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          tileSize={256}
          zoomOffset={0}
        />

        {/* Map Events Handler */}
        <MapEvents onLocationFound={handleLocationFound} />

        {/* User location marker */}
        <UserLocationMarker position={userLocation} />

        {/* POI markers */}
        {(() => {
          console.log(
            "🗺️ Rendering map with",
            filteredPOIs.length,
            "filtered POIs"
          );
          return null;
        })()}
        {filteredPOIs.length === 0 && !loading && userLocation && (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={L.divIcon({
              html: `
                <div style="
                  background: #f59e0b;
                  color: white;
                  padding: 8px 12px;
                  border-radius: 8px;
                  font-size: 12px;
                  white-space: nowrap;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                ">
                  No POIs found nearby
                </div>
              `,
              className: "no-pois-marker",
              iconSize: [120, 40],
              iconAnchor: [60, 40],
            })}
          />
        )}

        {filteredPOIs.map((poi, index) => (
          <Marker
            key={`marker-${poi.id}-${index}`}
            position={[poi.lat, poi.lng]}
            icon={createCustomIcon(poi.type, poi.isBookmarked)}
            eventHandlers={{
              click: () => onPOISelect?.(poi),
            }}
          >
            <Popup className="customPopup">
              <div className="popup">
                <div className="popupHeader">
                  <h4>{poi.name}</h4>
                  <button
                    className={`bookmarkBtn ${
                      poi.isBookmarked ? "bookmarked" : ""
                    }`}
                    onClick={() => toggleBookmark(poi.id)}
                  >
                    <FiBookmark size={16} />
                  </button>
                </div>

                {poi.description && (
                  <p className="popupDescription">{poi.description}</p>
                )}

                {poi.openingHours && (
                  <p className="openingHours">
                    <strong>Hours:</strong> {poi.openingHours}
                  </p>
                )}

                {poi.amenities && poi.amenities.length > 0 && (
                  <div className="amenities">
                    <strong>Amenities:</strong>
                    <div className="amenityTags">
                      {poi.amenities.map((amenity, index) => (
                        <span
                          key={`amenity-${poi.id}-${index}`}
                          className="amenityTag"
                        >
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="ratings">
                  {poi.ratings.cleanliness && (
                    <div className="rating">
                      <FiStar
                        size={14}
                        fill={getRatingColor(poi.ratings.cleanliness)}
                      />
                      <span>{poi.ratings.cleanliness} Cleanliness</span>
                    </div>
                  )}
                  {poi.ratings.safety && (
                    <div className="rating">
                      <FiStar
                        size={14}
                        fill={getRatingColor(poi.ratings.safety)}
                      />
                      <span>{poi.ratings.safety} Safety</span>
                    </div>
                  )}
                  {poi.ratings.working && (
                    <div className="rating">
                      <FiStar
                        size={14}
                        fill={getRatingColor(poi.ratings.working)}
                      />
                      <span>{poi.ratings.working} Working</span>
                    </div>
                  )}
                </div>

                <div className="popupActions">
                  <button
                    className="directionsBtn"
                    onClick={() => {
                      // Trigger directions
                      if (typeof window !== "undefined") {
                        window.dispatchEvent(
                          new CustomEvent("openDirections", {
                            detail: poi,
                          })
                        );
                      }
                    }}
                  >
                    <FiNavigation size={14} />
                    Directions
                  </button>
                  <span className="distance">
                    {userLocation
                      ? calculateDistance(
                          userLocation.lat,
                          userLocation.lng,
                          poi.lat,
                          poi.lng
                        )
                      : calculateDistance(
                          defaultPosition[0],
                          defaultPosition[1],
                          poi.lat,
                          poi.lng
                        )}{" "}
                    away
                  </span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Get Location Button */}
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

export default EssentialMapComponent;
