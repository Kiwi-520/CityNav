import { useState, useEffect } from 'react';
import { RouteRequest, RouteResponse } from '@/types/multimodal';
import { multimodalEngine } from '@/services/multimodal.service';
import { RoutePlanStorageService } from '@/services/route-storage.service';

interface UseOfflineRoutingReturn {
  isOnline: boolean;
  calculateRoutes: (request: RouteRequest) => Promise<RouteResponse>;
  recentRoutes: any[];
  favoriteRoutes: any[];
  saveFavorite: (name: string, source: any, destination: any) => void;
  deleteFavorite: (id: string) => void;
  clearCache: () => void;
}

export const useOfflineRouting = (): UseOfflineRoutingReturn => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [recentRoutes, setRecentRoutes] = useState<any[]>([]);
  const [favoriteRoutes, setFavoriteRoutes] = useState<any[]>([]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load recent and favorite routes
  useEffect(() => {
    loadStoredData();
  }, []);

  const loadStoredData = () => {
    setRecentRoutes(RoutePlanStorageService.getRecentRoutes());
    setFavoriteRoutes(RoutePlanStorageService.getFavoriteRoutes());
  };

  const calculateRoutes = async (request: RouteRequest): Promise<RouteResponse> => {
    try {
      // Always calculate routes (works offline)
      const response = await multimodalEngine.calculateRoutes(request);

      // Save to offline storage
      await RoutePlanStorageService.saveRouteCalculation(request, response);
      
      // Refresh recent routes
      loadStoredData();

      return response;
    } catch (error) {
      console.error('Route calculation error:', error);
      throw error;
    }
  };

  const saveFavorite = (
    name: string,
    source: { name: string; lat: number; lng: number },
    destination: { name: string; lat: number; lng: number }
  ) => {
    RoutePlanStorageService.saveFavoriteRoute(name, source, destination);
    loadStoredData();
  };

  const deleteFavorite = (id: string) => {
    RoutePlanStorageService.deleteFavoriteRoute(id);
    loadStoredData();
  };

  const clearCache = () => {
    RoutePlanStorageService.clearExpiredCache();
    loadStoredData();
  };

  return {
    isOnline,
    calculateRoutes,
    recentRoutes,
    favoriteRoutes,
    saveFavorite,
    deleteFavorite,
    clearCache,
  };
};
