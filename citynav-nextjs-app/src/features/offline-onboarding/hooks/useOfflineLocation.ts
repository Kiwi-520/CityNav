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

  useEffect(() => {
    setIsOnline(navigator.onLine);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const locationData: LocationData = JSON.parse(stored);
        const isLocationFresh = Date.now() - locationData.timestamp < 24 * 60 * 60 * 1000;
        if (isLocationFresh) {
          setStoredLocation(locationData);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error('Error loading stored location:', error);
      localStorage.removeItem(STORAGE_KEY);
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
