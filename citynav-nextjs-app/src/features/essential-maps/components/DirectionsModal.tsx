"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FiX, FiNavigation, FiClock, FiMap } from "react-icons/fi";
import {
  directionsService,
  Route,
  RoutePoint,
} from "@/services/directions.service";
import { DirectionsDestination } from "@/features/essential-maps/types/essential-maps.types";
import "@/features/essential-maps/styles/directions-modal.css";

interface DirectionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  destination: DirectionsDestination | null;
}

const DirectionsModal: React.FC<DirectionsModalProps> = ({
  isOpen,
  onClose,
  destination,
}) => {
  const [route, setRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<RoutePoint | null>(null);
  const [selectedMode, setSelectedMode] = useState<
    "walking" | "driving" | "cycling"
  >("walking");

  const loadDirections = useCallback(async () => {
    if (!destination) return;

    setLoading(true);
    setError(null);

    try {
      // Get current location
      const currentLocation = await directionsService.getCurrentLocation();
      setUserLocation(currentLocation);

      // Get route
      const routeData = await directionsService.getDirections(
        currentLocation,
        {
          lat: destination.lat,
          lng: destination.lng,
          name: destination.name,
        },
        { mode: selectedMode }
      );

      setRoute(routeData);
    } catch (err) {
      console.error("Error loading directions:", err);
      setError("Unable to get directions. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [destination, selectedMode]);

  // Get user location and route when modal opens
  useEffect(() => {
    if (isOpen && destination) {
      loadDirections();
    }
  }, [isOpen, destination, selectedMode, loadDirections]);

  const handleExternalNavigation = () => {
    if (!destination) return;

    directionsService.openExternalNavigation(
      {
        lat: destination.lat,
        lng: destination.lng,
        name: destination.name,
      },
      userLocation || undefined
    );
  };

  const getTypeIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      restroom: "🚻",
      atm: "🏧",
      water: "💧",
      food: "🍽️",
    };
    return icons[type] || "📍";
  };

  if (!isOpen || !destination) return null;

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="modal">
        {/* Header */}
        <div className="header">
          <div className="headerLeft">
            <span className="destinationIcon">
              {getTypeIcon(destination.type)}
            </span>
            <div>
              <h2 className="title">Directions</h2>
              <p className="destinationName">{destination.name}</p>
            </div>
          </div>
          <button className="closeBtn" onClick={onClose}>
            <FiX size={24} />
          </button>
        </div>

        {/* Mode Selection */}
        <div className="modeSelection">
          <button
            className={`modeBtn ${selectedMode === "walking" ? "active" : ""}`}
            onClick={() => setSelectedMode("walking")}
          >
            🚶 Walking
          </button>
          <button
            className={`modeBtn ${selectedMode === "driving" ? "active" : ""}`}
            onClick={() => setSelectedMode("driving")}
          >
            🚗 Driving
          </button>
          <button
            className={`modeBtn ${selectedMode === "cycling" ? "active" : ""}`}
            onClick={() => setSelectedMode("cycling")}
          >
            🚴 Cycling
          </button>
        </div>

        {/* Content */}
        <div className="content">
          {loading && (
            <div className="loading">
              <div className="spinner"></div>
              <p>Getting directions...</p>
            </div>
          )}

          {error && (
            <div className="error">
              <p>{error}</p>
              <button className="retryBtn" onClick={loadDirections}>
                Try Again
              </button>
            </div>
          )}

          {route && !loading && (
            <>
              {/* Route Summary */}
              <div className="summary">
                <div className="summaryItem">
                  <FiMap size={16} />
                  <span>
                    {directionsService.formatDistance(route.distance)}
                  </span>
                </div>
                <div className="summaryItem">
                  <FiClock size={16} />
                  <span>
                    {directionsService.formatDuration(route.duration)}
                  </span>
                </div>
              </div>

              {/* Route Steps */}
              <div className="steps">
                <h3 className="stepsTitle">Directions</h3>
                {route.steps.map((step, index) => (
                  <div key={index} className="step">
                    <div className="stepNumber">{index + 1}</div>
                    <div className="stepContent">
                      <p className="stepInstruction">{step.instruction}</p>
                      <div className="stepMeta">
                        {step.distance > 0 && (
                          <span>
                            {directionsService.formatDistance(step.distance)}
                          </span>
                        )}
                        {step.duration > 0 && step.distance > 0 && (
                          <span> • </span>
                        )}
                        {step.duration > 0 && (
                          <span>
                            {directionsService.formatDuration(step.duration)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="actions">
          <button className="cancelBtn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="navigateBtn"
            onClick={handleExternalNavigation}
            disabled={loading}
          >
            <FiNavigation size={16} />
            Open in Maps
          </button>
        </div>
      </div>
    </>
  );
};

export default DirectionsModal;
