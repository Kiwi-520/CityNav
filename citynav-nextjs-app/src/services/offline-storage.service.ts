export interface CachedData<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  location: {
    lat: number;
    lng: number;
  };
}

export interface CacheMetadata {
  key: string;
  timestamp: number;
  expiresAt: number;
  size: number;
}

class OfflineStorageService {
  private readonly CACHE_PREFIX = "citynav_poi_";
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private readonly LOCATION_THRESHOLD = 0.01; // ~1km difference threshold

  async cachePOIs<T>(
    key: string,
    data: T,
    location: { lat: number; lng: number }
  ): Promise<boolean> {
    try {
      const now = Date.now();
      const cachedData: CachedData<T> = {
        data,
        timestamp: now,
        expiresAt: now + this.CACHE_DURATION,
        location,
      };

      const serialized = JSON.stringify(cachedData);
      localStorage.setItem(this.CACHE_PREFIX + key, serialized);

      this.updateCacheMetadata(key, now, serialized.length);

      console.log("✅ Cached data:", key, "Expires in 24 hours");
      return true;
    } catch (error) {
      console.error("❌ Failed to cache data:", error);
      this.clearExpiredCaches();
      return false;
    }
  }

  async getCachedPOIs<T>(
    key: string,
    currentLocation: { lat: number; lng: number }
  ): Promise<T | null> {
    try {
      const cached = localStorage.getItem(this.CACHE_PREFIX + key);
      if (!cached) {
        console.log("📭 No cache found for:", key);
        return null;
      }

      const cachedData: CachedData<T> = JSON.parse(cached);
      const now = Date.now();

      if (now > cachedData.expiresAt) {
        console.log("⏰ Cache expired for:", key);
        this.removeCachedPOIs(key);
        return null;
      }

      const distance = this.calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        cachedData.location.lat,
        cachedData.location.lng
      );

      if (distance > this.LOCATION_THRESHOLD) {
        console.log("📍 Location changed too much, cache invalid:", key);
        return null;
      }

      const timeLeft = Math.round((cachedData.expiresAt - now) / 1000 / 60);
      console.log(
        "✅ Using cached data:",
        key,
        `(expires in ${timeLeft} minutes)`
      );
      return cachedData.data;
    } catch (error) {
      console.error("❌ Failed to retrieve cache:", error);
      return null;
    }
  }

  removeCachedPOIs(key: string): void {
    localStorage.removeItem(this.CACHE_PREFIX + key);
    this.removeCacheMetadata(key);
    console.log("🗑️ Removed cache:", key);
  }

  clearExpiredCaches(): number {
    let cleared = 0;
    const now = Date.now();
    const keys = Object.keys(localStorage);

    for (const key of keys) {
      if (key.startsWith(this.CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const cachedData: CachedData<any> = JSON.parse(cached);
            if (now > cachedData.expiresAt) {
              localStorage.removeItem(key);
              cleared++;
            }
          }
        } catch (error) {
          localStorage.removeItem(key);
          cleared++;
        }
      }
    }

    if (cleared > 0) {
      console.log(`🧹 Cleared ${cleared} expired cache(s)`);
    }
    return cleared;
  }

  clearAllCaches(): number {
    let cleared = 0;
    const keys = Object.keys(localStorage);

    for (const key of keys) {
      if (key.startsWith(this.CACHE_PREFIX)) {
        localStorage.removeItem(key);
        cleared++;
      }
    }

    localStorage.removeItem("citynav_cache_metadata");

    console.log(`🧹 Cleared all ${cleared} cache(s)`);
    return cleared;
  }

  getCacheStats(): {
    totalCaches: number;
    totalSize: number;
    caches: CacheMetadata[];
  } {
    const keys = Object.keys(localStorage);
    const caches: CacheMetadata[] = [];
    let totalSize = 0;

    for (const key of keys) {
      if (key.startsWith(this.CACHE_PREFIX)) {
        const value = localStorage.getItem(key);
        if (value) {
          const size = new Blob([value]).size;
          totalSize += size;

          try {
            const cachedData: CachedData<any> = JSON.parse(value);
            caches.push({
              key: key.replace(this.CACHE_PREFIX, ""),
              timestamp: cachedData.timestamp,
              expiresAt: cachedData.expiresAt,
              size,
            });
          } catch (error) {
            // Corrupted cache
          }
        }
      }
    }

    return {
      totalCaches: caches.length,
      totalSize,
      caches,
    };
  }

  isOfflineModeAvailable(): boolean {
    const stats = this.getCacheStats();
    return stats.totalCaches > 0;
  }

  private updateCacheMetadata(key: string, timestamp: number, size: number): void {
    try {
      const metadata = this.getCacheStats();
      localStorage.setItem(
        "citynav_cache_metadata",
        JSON.stringify({
          lastUpdated: timestamp,
          totalCaches: metadata.totalCaches,
          totalSize: metadata.totalSize,
        })
      );
    } catch (error) {
      console.warn("Failed to update cache metadata:", error);
    }
  }

  private removeCacheMetadata(key: string): void {
    // Metadata is recalculated on next cache
  }

  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const dLat = Math.abs(lat1 - lat2);
    const dLng = Math.abs(lng1 - lng2);
    return Math.sqrt(dLat * dLat + dLng * dLng);
  }

  initAutoCleanup(): void {
    this.clearExpiredCaches();
    if (typeof window !== "undefined") {
      setInterval(() => {
        this.clearExpiredCaches();
      }, 60 * 60 * 1000); // Every hour
    }
  }

  getTimeUntilExpiry(key: string): number | null {
    try {
      const cached = localStorage.getItem(this.CACHE_PREFIX + key);
      if (!cached) return null;

      const cachedData: CachedData<any> = JSON.parse(cached);
      const now = Date.now();
      const timeLeft = cachedData.expiresAt - now;

      return timeLeft > 0 ? timeLeft : null;
    } catch (error) {
      return null;
    }
  }

  formatTimeRemaining(milliseconds: number): string {
    const hours = Math.floor(milliseconds / (60 * 60 * 1000));
    const minutes = Math.floor((milliseconds % (60 * 60 * 1000)) / (60 * 1000));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }
}

export const offlineStorage = new OfflineStorageService();
