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
  private currentLocation: LocationData | null = null;
  private watchId: number | null = null;

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

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0, // Always get fresh location
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const locationData = await this.reverseGeocode(
              position.coords.latitude,
              position.coords.longitude
            );
            this.currentLocation = locationData;
            resolve(locationData);
          } catch (error) {
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
        },
        options
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
        } catch (error) {
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
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'CityNav/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error("Geocoding API request failed");
      }

      const data = await response.json();

      return {
        lat,
        lon,
        city:
          data.address?.city ||
          data.address?.town ||
          data.address?.village ||
          data.address?.municipality ||
          "Unknown City",
        country: data.address?.country || "Unknown Country",
        state: data.address?.state || data.address?.province,
        district: data.address?.district || data.address?.county,
        address: data.display_name,
      };
    } catch (error) {
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
      localStorage.setItem("citynav_last_location", JSON.stringify(location));
    } catch (error) {
      console.warn("Failed to save location to storage:", error);
    }
  }

  loadLocationFromStorage(): LocationData | null {
    try {
      const stored = localStorage.getItem("citynav_last_location");
      return stored ? JSON.parse(stored) : null;
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
