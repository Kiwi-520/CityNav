export interface LocationData {
  lat: number;
  lon: number;
  city: string;
  country: string;
  state?: string;
  district?: string;
  address?: string;
}

export interface LocationError {
  code: number;
  message: string;
}

class LocationService {
  private static instance: LocationService;
  private static readonly LOCATION_RETENTION_MS = 3 * 24 * 60 * 60 * 1000;
  private currentLocation: LocationData | null = null;
  private watchId: number | null = null;

  private sanitizeLocationPart(value?: string): string {
    if (!value) return "";
    const cleaned = value.trim();
    if (!cleaned) return "";
    if (/^[.,\-\s]+$/.test(cleaned)) return "";
    return cleaned;
  }

  private async getCurrentPositionWithFallback(): Promise<GeolocationPosition> {
    const highAccuracyOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    const lowAccuracyOptions: PositionOptions = {
      enableHighAccuracy: false,
      timeout: 15000,
      maximumAge: 60000,
    };

    const getPosition = (options: PositionOptions): Promise<GeolocationPosition> => {
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, options);
      });
    };

    try {
      const firstFix = await getPosition(highAccuracyOptions);
      // If accuracy is coarse (cell-tower), try to improve before returning.
      if (firstFix.coords.accuracy <= 800) {
        return firstFix;
      }

      return await this.waitForBetterAccuracyFix(firstFix, 8000, 300);
    } catch {
      const fallbackFix = await getPosition(lowAccuracyOptions);
      if (fallbackFix.coords.accuracy <= 1000) {
        return fallbackFix;
      }
      return await this.waitForBetterAccuracyFix(fallbackFix, 8000, 500);
    }
  }

  private async waitForBetterAccuracyFix(
    initial: GeolocationPosition,
    timeoutMs: number,
    targetAccuracyMeters: number
  ): Promise<GeolocationPosition> {
    if (!navigator.geolocation) return initial;

    return new Promise((resolve) => {
      let settled = false;
      let best = initial;

      const finish = () => {
        if (settled) return;
        settled = true;
        if (watchId != null) navigator.geolocation.clearWatch(watchId);
        resolve(best);
      };

      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (pos.coords.accuracy < best.coords.accuracy) {
            best = pos;
          }
          if (best.coords.accuracy <= targetAccuracyMeters) {
            finish();
          }
        },
        () => finish(),
        {
          enableHighAccuracy: true,
          timeout: timeoutMs,
          maximumAge: 0,
        }
      );

      window.setTimeout(() => finish(), timeoutMs);
    });
  }

  private constructor() {}

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  async getCurrentLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject({
          code: -1,
          message: "Geolocation is not supported by this browser",
        });
        return;
      }

      this.getCurrentPositionWithFallback().then(
        async (position) => {
          try {
            const locationData = await this.reverseGeocode(
              position.coords.latitude,
              position.coords.longitude
            );
            this.currentLocation = locationData;
            resolve(locationData);
          } catch (_error) {
            reject({
              code: -2,
              message: "Failed to get location details",
            });
          }
        },
        (error) => {
          reject({
            code: error.code,
            message: this.getErrorMessage(error.code),
          });
        }
      );
    });
  }

  watchLocation(
    onSuccess: (location: LocationData) => void,
    onError: (error: LocationError) => void
  ): number {
    if (!navigator.geolocation) {
      onError({
        code: -1,
        message: "Geolocation is not supported by this browser",
      });
      return -1;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0, // Always get fresh location for watch
    };

    this.watchId = navigator.geolocation.watchPosition(
      async (position) => {
        try {
          const locationData = await this.reverseGeocode(
            position.coords.latitude,
            position.coords.longitude
          );
          this.currentLocation = locationData;
          onSuccess(locationData);
        } catch (_error) {
          onError({
            code: -2,
            message: "Failed to get location details",
          });
        }
      },
      (error) => {
        onError({
          code: error.code,
          message: this.getErrorMessage(error.code),
        });
      },
      options
    );

    return this.watchId;
  }

  stopWatching(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  private async reverseGeocode(
    lat: number,
    lon: number
  ): Promise<LocationData> {
    try {
      const response = await fetch(
        `/api/google-geocode?lat=${lat}&lng=${lon}`
      );

      if (!response.ok) {
        throw new Error("Google Geocoding API request failed");
      }

      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        return {
          lat,
          lon,
          city: "Current Location",
          country: "Unknown",
          address: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
        };
      }

      const result = data.results[0];
      const components = result.address_components || [];
      const getComponent = (type: string) =>
        components.find((c: any) => c.types.includes(type))?.long_name || '';

      const city =
        this.sanitizeLocationPart(getComponent('locality')) ||
        this.sanitizeLocationPart(getComponent('administrative_area_level_3')) ||
        this.sanitizeLocationPart(getComponent('administrative_area_level_2')) ||
        this.sanitizeLocationPart(getComponent('sublocality_level_1')) ||
        this.sanitizeLocationPart(getComponent('sublocality'));

      const country = this.sanitizeLocationPart(getComponent('country'));
      const state = this.sanitizeLocationPart(getComponent('administrative_area_level_1'));
      const district =
        this.sanitizeLocationPart(getComponent('administrative_area_level_3')) ||
        this.sanitizeLocationPart(getComponent('sublocality_level_1'));

      const fallbackAddress = this.sanitizeLocationPart(result.formatted_address);

      let fallbackCity = city;
      let fallbackCountry = country || state;
      if (!fallbackCity && fallbackAddress) {
        const [firstPart, secondPart] = fallbackAddress
          .split(',')
          .map((part: string) => this.sanitizeLocationPart(part));
        fallbackCity = firstPart || 'Current Location';
        if (!fallbackCountry) {
          fallbackCountry = secondPart || 'Unknown';
        }
      }

      return {
        lat,
        lon,
        city: fallbackCity || 'Current Location',
        country: fallbackCountry || 'Unknown',
        state: state || undefined,
        district: district || undefined,
        address: fallbackAddress || `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
      };
    } catch (_error) {
      return {
        lat,
        lon,
        city: "Current Location",
        country: "Unknown",
        address: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
      };
    }
  }

  getCachedLocation(): LocationData | null {
    return this.currentLocation;
  }

  saveLocationToStorage(location: LocationData): void {
    try {
      localStorage.setItem(
        "citynav_last_location",
        JSON.stringify({ savedAt: Date.now(), data: location })
      );
    } catch (error) {
      console.warn("Failed to save location to storage:", error);
    }
  }

  loadLocationFromStorage(): LocationData | null {
    try {
      const stored = localStorage.getItem("citynav_last_location");
      if (!stored) return null;

      const parsed = JSON.parse(stored) as
        | { savedAt?: number; data?: LocationData }
        | LocationData;

      // Backward-compatible fallback for legacy plain object shape.
      if ((parsed as { data?: LocationData }).data == null) {
        return parsed as LocationData;
      }

      const payload = parsed as { savedAt?: number; data?: LocationData };
      if (!payload.savedAt || (Date.now() - payload.savedAt) >= LocationService.LOCATION_RETENTION_MS) {
        localStorage.removeItem("citynav_last_location");
        return null;
      }

      return payload.data ?? null;
    } catch (error) {
      console.warn("Failed to load location from storage:", error);
      return null;
    }
  }

  private getErrorMessage(code: number): string {
    switch (code) {
      case 1:
        return "Location access denied by user";
      case 2:
        return "Location information is unavailable";
      case 3:
        return "Location request timed out";
      default:
        return "An unknown error occurred while retrieving location";
    }
  }

  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export default LocationService;
