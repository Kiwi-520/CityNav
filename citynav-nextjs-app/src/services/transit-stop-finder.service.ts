import { Location } from '@/types/multimodal';

export interface TransitStop {
  id: string;
  name: string;
  type: 'bus_stop' | 'metro_station' | 'railway_station' | 'tram_stop';
  location: Location;
  distance: number; // meters from source
  routes?: string[]; // e.g., ["405", "764", "Blue Line"]
  operator?: string;
  tags?: Record<string, string>;
}

export interface NearbyTransitHubs {
  busStops: TransitStop[];
  metroStations: TransitStop[];
  railwayStations: TransitStop[];
}

export class TransitStopFinderService {
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Find nearby transit stops using Overpass API (OpenStreetMap)
   * @param location - Source location
   * @param radiusMeters - Search radius (default: 1000m)
   */
  async findNearbyTransitStops(
    location: Location,
    radiusMeters: number = 1000
  ): Promise<NearbyTransitHubs> {
    const { lat, lng } = location;

    // Overpass API query to find bus stops, metro stations, and railway stations
    const query = `
      [out:json][timeout:25];
      (
        node["highway"="bus_stop"](around:${radiusMeters},${lat},${lng});
        node["railway"="station"](around:${radiusMeters},${lat},${lng});
        node["railway"="halt"](around:${radiusMeters},${lat},${lng});
        node["station"="subway"](around:${radiusMeters},${lat},${lng});
        node["public_transport"="stop_position"](around:${radiusMeters},${lat},${lng});
        node["public_transport"="platform"](around:${radiusMeters},${lat},${lng});
      );
      out body;
      >;
      out skel qt;
    `;

    try {
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(
        'https://overpass-api.de/api/interpreter',
        {
          method: 'POST',
          body: query,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn('Overpass API request failed, using mock data:', response.status);
        return this.getMockTransitStops(location, radiusMeters);
      }

      const data = await response.json();
      const result = this.parseOverpassResponse(data, location);
      
      // If no real data found, use mock data
      if (result.busStops.length === 0 && result.metroStations.length === 0) {
        console.log('No transit stops found, using mock data');
        return this.getMockTransitStops(location, radiusMeters);
      }
      
      return result;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn('Overpass API request timed out, using mock data');
      } else {
        console.warn('Error fetching transit stops, using mock data:', error.message);
      }
      // Return mock data for development/offline mode
      return this.getMockTransitStops(location, radiusMeters);
    }
  }
  private parseOverpassResponse(
    data: any,
    sourceLocation: Location
  ): NearbyTransitHubs {
    const busStops: TransitStop[] = [];
    const metroStations: TransitStop[] = [];
    const railwayStations: TransitStop[] = [];

    if (!data.elements || !Array.isArray(data.elements)) {
      return { busStops, metroStations, railwayStations };
    }

    data.elements.forEach((element: any) => {
      if (!element.lat || !element.lon) return;

      const distance = this.calculateDistance(
        sourceLocation.lat,
        sourceLocation.lng,
        element.lat,
        element.lon
      );

      const tags = element.tags || {};
      const name = tags.name || tags.ref || 'Unnamed Stop';
      const routes = tags.route_ref ? tags.route_ref.split(';') : [];

      const stop: TransitStop = {
        id: `stop_${element.id}`,
        name,
        type: this.determineStopType(tags),
        location: { lat: element.lat, lng: element.lon },
        distance,
        routes,
        operator: tags.operator,
        tags,
      };

      // Categorize by type
      if (stop.type === 'bus_stop') {
        busStops.push(stop);
      } else if (stop.type === 'metro_station') {
        metroStations.push(stop);
      } else if (stop.type === 'railway_station') {
        railwayStations.push(stop);
      }
    });

    // Sort by distance
    busStops.sort((a, b) => a.distance - b.distance);
    metroStations.sort((a, b) => a.distance - b.distance);
    railwayStations.sort((a, b) => a.distance - b.distance);

    return { busStops, metroStations, railwayStations };
  }

  private determineStopType(tags: Record<string, string>): TransitStop['type'] {
    if (tags.railway === 'station' || tags.railway === 'halt') {
      return 'railway_station';
    }
    if (tags.station === 'subway' || tags.subway === 'yes') {
      return 'metro_station';
    }
    if (tags.highway === 'bus_stop' || tags.bus === 'yes') {
      return 'bus_stop';
    }
    if (tags.railway === 'tram_stop') {
      return 'tram_stop';
    }
    // Default based on public_transport tag
    if (tags.public_transport === 'platform' || tags.public_transport === 'stop_position') {
      // Try to determine from other tags
      if (tags.train === 'yes') return 'railway_station';
      if (tags.subway === 'yes') return 'metro_station';
      return 'bus_stop';
    }
    return 'bus_stop';
  }

  private getMockTransitStops(
    location: Location,
    radiusMeters: number
  ): NearbyTransitHubs {
    const { lat, lng } = location;

    // Generate mock stops at realistic intervals
    const busStops: TransitStop[] = [
      {
        id: 'bus_1',
        name: 'Main Road Bus Stop',
        type: 'bus_stop',
        location: { lat: lat + 0.003, lng: lng + 0.002 },
        distance: 350,
        routes: ['405', '764', '182'],
        operator: 'DTC',
        tags: {},
      },
      {
        id: 'bus_2',
        name: 'Market Bus Stop',
        type: 'bus_stop',
        location: { lat: lat - 0.004, lng: lng + 0.003 },
        distance: 520,
        routes: ['505', '622'],
        operator: 'DTC',
        tags: {},
      },
    ];

    const metroStations: TransitStop[] = [
      {
        id: 'metro_1',
        name: 'Central Metro Station',
        type: 'metro_station',
        location: { lat: lat + 0.005, lng: lng - 0.004 },
        distance: 720,
        routes: ['Blue Line', 'Yellow Line'],
        operator: 'DMRC',
        tags: {},
      },
    ];

    const railwayStations: TransitStop[] = [
      {
        id: 'railway_1',
        name: 'City Railway Station',
        type: 'railway_station',
        location: { lat: lat - 0.008, lng: lng + 0.006 },
        distance: 1100,
        routes: [],
        operator: 'Indian Railways',
        tags: {},
      },
    ];

    return { busStops, metroStations, railwayStations };
  }

  findBestTransitStop(
    stops: TransitStop[],
    maxWalkingDistance: number = 500
  ): TransitStop | null {
    const walkableStops = stops.filter(
      (stop) => stop.distance <= maxWalkingDistance
    );

    if (walkableStops.length === 0) return null;

    // Prefer stops with more routes
    walkableStops.sort((a, b) => {
      const routeScore = (b.routes?.length || 0) - (a.routes?.length || 0);
      if (routeScore !== 0) return routeScore;
      return a.distance - b.distance; // Then by distance
    });

    return walkableStops[0];
  }
}

// Export singleton instance
export const transitStopFinder = new TransitStopFinderService();
