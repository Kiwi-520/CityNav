"use client";

import { useState, useEffect, useCallback } from "react";
import LocationService, {
  LocationData,
  LocationError,
} from "@/services/location.service";

interface UseLocationResult {
  location: LocationData | null;
  error: LocationError | null;
  loading: boolean;
  requestLocation: () => void;
  startWatching: () => void;
  stopWatching: () => void;
  isWatching: boolean;
}

export const useLocation = (): UseLocationResult => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<LocationError | null>(null);
  const [loading, setLoading] = useState(false);
  const [isWatching, setIsWatching] = useState(false);

  const locationService = LocationService.getInstance();

  // Load cached location on mount
  useEffect(() => {
    const cachedLocation = locationService.loadLocationFromStorage();
    if (cachedLocation) {
      setLocation(cachedLocation);
    }
  }, [locationService]);

  const requestLocation = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const locationData = await locationService.getCurrentLocation();
      setLocation(locationData);
      locationService.saveLocationToStorage(locationData);
    } catch (err) {
      setError(err as LocationError);
    } finally {
      setLoading(false);
    }
  }, [locationService]);

  const startWatching = useCallback(() => {
    if (isWatching) return;

    setIsWatching(true);
    setError(null);

    locationService.watchLocation(
      (locationData) => {
        setLocation(locationData);
        locationService.saveLocationToStorage(locationData);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
  }, [locationService, isWatching]);

  const stopWatching = useCallback(() => {
    if (!isWatching) return;

    locationService.stopWatching();
    setIsWatching(false);
  }, [locationService, isWatching]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isWatching) {
        locationService.stopWatching();
      }
    };
  }, [locationService, isWatching]);

  return {
    location,
    error,
    loading,
    requestLocation,
    startWatching,
    stopWatching,
    isWatching,
  };
};
