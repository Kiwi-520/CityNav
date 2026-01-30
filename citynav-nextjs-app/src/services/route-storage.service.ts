import { RouteRequest, RouteResponse, MultimodalRoute } from '../types/multimodal';

interface StoredRouteData {
  id: string;
  request: RouteRequest;
  response: RouteResponse;
  savedAt: Date;
  expiresAt: Date;
}

interface FavoriteRoute {
  id: string;
  name: string;
  source: { name: string; lat: number; lng: number };
  destination: { name: string; lat: number; lng: number };
  savedAt: Date;
}

export class RoutePlanStorageService {
  private static readonly STORAGE_KEYS = {
    RECENT_ROUTES: 'citynav_recent_routes',
    FAVORITE_ROUTES: 'citynav_favorite_routes',
    OFFLINE_CACHE: 'citynav_offline_cache',
  };

  private static readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  private static readonly MAX_RECENT_ROUTES = 10;
  static async saveRouteCalculation(
    request: RouteRequest,
    response: RouteResponse
  ): Promise<void> {
    const stored: StoredRouteData = {
      id: this.generateRouteId(request),
      request,
      response,
      savedAt: new Date(),
      expiresAt: new Date(Date.now() + this.CACHE_DURATION),
    };

    try {
      // Save to localStorage
      const recentRoutes = this.getRecentRoutes();
      recentRoutes.unshift(stored);
      
      // Keep only recent routes
      const trimmed = recentRoutes.slice(0, this.MAX_RECENT_ROUTES);
      
      localStorage.setItem(
        this.STORAGE_KEYS.RECENT_ROUTES,
        JSON.stringify(trimmed)
      );

      // Save to IndexedDB for larger storage
      await this.saveToIndexedDB(stored);
    } catch (error) {
      console.error('Failed to save route calculation:', error);
    }
  }
  static getRecentRoutes(): StoredRouteData[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEYS.RECENT_ROUTES);
      if (!data) return [];

      const routes: StoredRouteData[] = JSON.parse(data);
      
      // Filter expired routes
      const now = new Date();
      return routes.filter((route) => new Date(route.expiresAt) > now);
    } catch (error) {
      console.error('Failed to get recent routes:', error);
      return [];
    }
  }

  static saveFavoriteRoute(
    name: string,
    source: { name: string; lat: number; lng: number },
    destination: { name: string; lat: number; lng: number }
  ): void {
    try {
      const favorites = this.getFavoriteRoutes();
      
      const favorite: FavoriteRoute = {
        id: `fav_${Date.now()}`,
        name,
        source,
        destination,
        savedAt: new Date(),
      };

      favorites.push(favorite);
      
      localStorage.setItem(
        this.STORAGE_KEYS.FAVORITE_ROUTES,
        JSON.stringify(favorites)
      );
    } catch (error) {
      console.error('Failed to save favorite route:', error);
    }
  }

  static getFavoriteRoutes(): FavoriteRoute[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEYS.FAVORITE_ROUTES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get favorite routes:', error);
      return [];
    }
  }

  static deleteFavoriteRoute(id: string): void {
    try {
      const favorites = this.getFavoriteRoutes();
      const filtered = favorites.filter((fav) => fav.id !== id);
      
      localStorage.setItem(
        this.STORAGE_KEYS.FAVORITE_ROUTES,
        JSON.stringify(filtered)
      );
    } catch (error) {
      console.error('Failed to delete favorite route:', error);
    }
  }

  private static generateRouteId(request: RouteRequest): string {
    const sourceKey = `${request.source.lat.toFixed(4)},${request.source.lng.toFixed(4)}`;
    const destKey = `${request.destination.lat.toFixed(4)},${request.destination.lng.toFixed(4)}`;
    return `route_${sourceKey}_${destKey}`;
  }

  private static async saveToIndexedDB(data: StoredRouteData): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('CityNavDB', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['routes'], 'readwrite');
        const store = transaction.objectStore('routes');
        
        store.put(data);
        
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('routes')) {
          db.createObjectStore('routes', { keyPath: 'id' });
        }
      };
    });
  }

  static clearExpiredCache(): void {
    const routes = this.getRecentRoutes();
    localStorage.setItem(
      this.STORAGE_KEYS.RECENT_ROUTES,
      JSON.stringify(routes)
    );
  }

  static exportUserData(): string {
    const data = {
      recentRoutes: this.getRecentRoutes(),
      favoriteRoutes: this.getFavoriteRoutes(),
      exportedAt: new Date(),
    };
    return JSON.stringify(data, null, 2);
  }

  static importUserData(jsonData: string): void {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.favoriteRoutes) {
        localStorage.setItem(
          this.STORAGE_KEYS.FAVORITE_ROUTES,
          JSON.stringify(data.favoriteRoutes)
        );
      }
    } catch (error) {
      console.error('Failed to import user data:', error);
      throw new Error('Invalid data format');
    }
  }
}
