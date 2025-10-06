/**
 * Directions Service for CityNav Essential Maps
 * Provides routing functionality using OpenStreetMap data
 */

export interface RoutePoint {
  lat: number;
  lng: number;
  name?: string;
}

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  coordinates: [number, number][];
}

interface OSRMManeuver {
  type: string;
  modifier?: string;
  instruction?: string;
}

interface OSRMGeometry {
  coordinates: number[][];
}

interface OSRMStep {
  maneuver: OSRMManeuver;
  distance: number;
  duration: number;
  geometry: OSRMGeometry;
}

export interface Route {
  distance: number; // in meters
  duration: number; // in seconds
  steps: RouteStep[];
  coordinates: [number, number][];
  summary: string;
}

export interface DirectionsOptions {
  mode?: "walking" | "driving" | "cycling";
  alternatives?: boolean;
  language?: string;
}

class DirectionsService {
  private openRouteServiceUrl =
    "https://api.openrouteservice.org/v2/directions";
  private osrmUrl = "https://router.project-osrm.org/route/v1";

  /**
   * Get directions between two points
   */
  async getDirections(
    from: RoutePoint,
    to: RoutePoint,
    options: DirectionsOptions = {}
  ): Promise<Route> {
    const { mode = "walking" } = options;

    try {
      // Try OSRM first (free, no API key required)
      const route = await this.getOSRMRoute(from, to, mode);
      return route;
    } catch (error) {
      console.error("Error getting directions:", error);
      // Fallback to simple straight line route
      return this.getSimpleRoute(from, to);
    }
  }

  /**
   * Get route using OSRM (Open Source Routing Machine)
   */
  private async getOSRMRoute(
    from: RoutePoint,
    to: RoutePoint,
    mode: string
  ): Promise<Route> {
    const profile =
      mode === "driving" ? "car" : mode === "cycling" ? "bike" : "foot";
    const url = `${this.osrmUrl}/${profile}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OSRM API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      throw new Error("No routes found");
    }

    const route = data.routes[0];
    const steps = this.parseOSRMSteps(route.legs[0].steps);

    return {
      distance: route.distance,
      duration: route.duration,
      steps,
      coordinates: route.geometry.coordinates.map((coord: number[]) => [
        coord[1],
        coord[0],
      ]),
      summary: `${this.formatDistance(route.distance)} • ${this.formatDuration(
        route.duration
      )}`,
    };
  }

  /**
   * Parse OSRM steps into our format
   */
  private parseOSRMSteps(osrmSteps: OSRMStep[]): RouteStep[] {
    return osrmSteps.map((step) => ({
      instruction:
        step.maneuver.instruction || this.getDefaultInstruction(step),
      distance: step.distance,
      duration: step.duration,
      coordinates: step.geometry.coordinates.map((coord: number[]) => [
        coord[1],
        coord[0],
      ]),
    }));
  }

  /**
   * Get default instruction for step
   */
  private getDefaultInstruction(step: OSRMStep): string {
    const type = step.maneuver.type;
    const modifier = step.maneuver.modifier;

    const instructions: { [key: string]: string } = {
      depart: "Head out",
      turn: `Turn ${modifier}`,
      continue: "Continue straight",
      arrive: "You have arrived at your destination",
      merge: "Merge",
      "on-ramp": "Take the on-ramp",
      "off-ramp": "Take the off-ramp",
      fork: `Keep ${modifier}`,
      "end-of-road": `Turn ${modifier} at the end of the road`,
      roundabout: "Enter the roundabout",
    };

    return instructions[type] || "Continue";
  }

  /**
   * Create a simple straight-line route as fallback
   */
  private getSimpleRoute(from: RoutePoint, to: RoutePoint): Route {
    const distance = this.calculateDistance(from.lat, from.lng, to.lat, to.lng);
    const duration = distance / 1.4; // Assume 5 km/h walking speed

    const coordinates: [number, number][] = [
      [from.lat, from.lng],
      [to.lat, to.lng],
    ];

    const steps: RouteStep[] = [
      {
        instruction: `Head towards ${to.name || "destination"}`,
        distance: distance,
        duration: duration,
        coordinates: coordinates,
      },
      {
        instruction: "You have arrived at your destination",
        distance: 0,
        duration: 0,
        coordinates: [[to.lat, to.lng]],
      },
    ];

    return {
      distance,
      duration,
      steps,
      coordinates,
      summary: `${this.formatDistance(distance)} • ${this.formatDuration(
        duration
      )} (straight line)`,
    };
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Format distance for display
   */
  formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  }

  /**
   * Format duration for display
   */
  formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    }
    if (seconds < 3600) {
      return `${Math.round(seconds / 60)}min`;
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    return `${hours}h ${minutes}min`;
  }

  /**
   * Open external navigation app
   */
  openExternalNavigation(to: RoutePoint, from?: RoutePoint): void {
    const destination = `${to.lat},${to.lng}`;
    const origin = from ? `${from.lat},${from.lng}` : "";

    // Detect platform and open appropriate navigation app
    const userAgent = navigator.userAgent || navigator.vendor;

    if (/android/i.test(userAgent)) {
      // Android - try Google Maps app first, fallback to web
      const googleMapsApp = `google.navigation:q=${destination}`;
      const googleMapsWeb = `https://www.google.com/maps/dir/${origin}/${destination}`;

      try {
        window.location.href = googleMapsApp;
        // Fallback after a delay
        setTimeout(() => {
          window.open(googleMapsWeb, "_blank");
        }, 1000);
      } catch {
        window.open(googleMapsWeb, "_blank");
      }
    } else if (/iPad|iPhone|iPod/.test(userAgent)) {
      // iOS - try Apple Maps first, fallback to Google Maps
      const appleMaps = `maps://maps.apple.com/?daddr=${destination}${
        origin ? `&saddr=${origin}` : ""
      }`;
      const googleMapsWeb = `https://www.google.com/maps/dir/${origin}/${destination}`;

      try {
        window.location.href = appleMaps;
        setTimeout(() => {
          window.open(googleMapsWeb, "_blank");
        }, 1000);
      } catch {
        window.open(googleMapsWeb, "_blank");
      }
    } else {
      // Desktop - open Google Maps in new tab
      const googleMapsWeb = `https://www.google.com/maps/dir/${origin}/${destination}`;
      window.open(googleMapsWeb, "_blank");
    }
  }

  /**
   * Get current user location
   */
  async getCurrentLocation(): Promise<RoutePoint> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            name: "Your Location",
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  }
}

// Export singleton instance
export const directionsService = new DirectionsService();
export default directionsService;
