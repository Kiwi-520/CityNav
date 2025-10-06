"use client";

import { useState, useEffect, useCallback } from 'react';

type LocationData = {
  latitude: number;
  longitude: number;
  timestamp: number;
  address?: {
    country?: string;
    state?: string;
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    road?: string;
    postcode?: string;
  };
  weather?: {
    temperature?: number;
    weathercode?: number;
    windspeed?: number;
    winddirection?: number;
    time?: string;
  };
};

type UseOfflineLocationReturn = {
  isOnline: boolean;
  storedLocation: LocationData | null;
  storeLocation: (location: LocationData) => void;
  clearStoredLocation: () => void;
};

const STORAGE_KEY = 'citynav-user-location';

export const useOfflineLocation = (): UseOfflineLocationReturn => {
  const [isOnline, setIsOnline] = useState(true);
  const [storedLocation, setStoredLocation] = useState<LocationData | null>(null);

  // Initialize online status and stored location
  useEffect(() => {
    // Set initial online status
    setIsOnline(navigator.onLine);

    // Load stored location from localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const locationData: LocationData = JSON.parse(stored);
        // Check if location is not too old (24 hours)
        const isLocationFresh = Date.now() - locationData.timestamp < 24 * 60 * 60 * 1000;
        if (isLocationFresh) {
          setStoredLocation(locationData);
        } else {
          // Remove expired location
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error('Error loading stored location:', error);
      localStorage.removeItem(STORAGE_KEY);
    }

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Store location data - memoized to prevent re-renders
  const storeLocation = useCallback((location: LocationData) => {
    try {
      const locationWithTimestamp = {
        ...location,
        timestamp: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(locationWithTimestamp));
      setStoredLocation(locationWithTimestamp);
    } catch (error) {
      console.error('Error storing location:', error);
    }
  }, []);

  // Clear stored location - memoized to prevent re-renders
  const clearStoredLocation = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setStoredLocation(null);
    } catch (error) {
      console.error('Error clearing stored location:', error);
    }
  }, []);

  return {
    isOnline,
    storedLocation,
    storeLocation,
    clearStoredLocation
  };
};