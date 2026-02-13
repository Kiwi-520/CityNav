import { Location } from '@/types/multimodal';

export interface GoogleDirectionsResult {
  distance: number;          // meters (actual road distance)
  duration: number;          // minutes (real-time traffic-aware)
  durationInTraffic: number; // minutes (with live traffic for driving)
  summary: string;           // e.g., "NH48" or "Blue Line"
  polyline: string;          // encoded polyline for map rendering
  steps: GoogleDirectionStep[];
  startAddress: string;
  endAddress: string;
  warnings: string[];
}

export interface GoogleDirectionStep {
  instruction: string;
  distance: number;     // meters
  duration: number;     // minutes
  mode: string;         // WALKING, DRIVING, TRANSIT
  transitDetails?: {
    lineName: string;       // e.g., "Blue Line", "Bus 405"
    lineShortName: string;  // e.g., "BL", "405"
    vehicleType: string;    // BUS, SUBWAY, HEAVY_RAIL, TRAM
    departureStop: string;
    arrivalStop: string;
    numStops: number;
    departureTime: string;
    arrivalTime: string;
    headway: number;        // seconds between departures
    color: string;
  };
}

export interface MultiDirectionsResult {
  driving: GoogleDirectionsResult | null;
  walking: GoogleDirectionsResult | null;
  transit: GoogleDirectionsResult[];  // Multiple transit alternatives
  transitBus: GoogleDirectionsResult | null;
  transitSubway: GoogleDirectionsResult | null;
}

class GoogleDirectionsService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

  private getCacheKey(
    from: Location,
    to: Location,
    mode: string,
    transitMode?: string
  ): string {
    // Round to 5 decimal places for cache key stability
    const fLat = from.lat.toFixed(5);
    const fLng = from.lng.toFixed(5);
    const tLat = to.lat.toFixed(5);
    const tLng = to.lng.toFixed(5);
    return `${fLat},${fLng}-${tLat},${tLng}-${mode}${transitMode ? '-' + transitMode : ''}`;
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any): void {
    // Limit cache size
    if (this.cache.size > 100) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  async getDirections(
    from: Location,
    to: Location,
    mode: 'driving' | 'walking' | 'transit' | 'bicycling' = 'driving',
    transitMode?: 'bus' | 'subway' | 'train' | 'rail'
  ): Promise<GoogleDirectionsResult | null> {
    const cacheKey = this.getCacheKey(from, to, mode, transitMode);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      let url = `/api/google-directions?fromLat=${from.lat}&fromLng=${from.lng}&toLat=${to.lat}&toLng=${to.lng}&mode=${mode}`;
      if (transitMode) {
        url += `&transit_mode=${transitMode}`;
      }

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`Google Directions API returned ${response.status} for mode=${mode}`);
        return null;
      }

      const data = await response.json();

      if (data.status !== 'OK' || !data.routes || data.routes.length === 0) {
        console.warn(`Google Directions: no routes found for mode=${mode}, status=${data.status}`);
        return null;
      }

      const result = this.parseDirectionsResponse(data.routes[0]);
      this.setCache(cacheKey, result);
      return result;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn(`Google Directions request timed out for mode=${mode}`);
      } else {
        console.warn(`Error fetching Google Directions (mode=${mode}):`, error.message);
      }
      return null;
    }
  }

  async getTransitAlternatives(
    from: Location,
    to: Location
  ): Promise<GoogleDirectionsResult[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const url = `/api/google-directions?fromLat=${from.lat}&fromLng=${from.lng}&toLat=${to.lat}&toLng=${to.lng}&mode=transit`;
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) return [];

      const data = await response.json();
      if (data.status !== 'OK' || !data.routes) return [];

      return data.routes.map((route: any) => this.parseDirectionsResponse(route));
    } catch (error) {
      console.warn('Error fetching transit alternatives:', error);
      return [];
    }
  }

  async getAllDirections(
    from: Location,
    to: Location
  ): Promise<MultiDirectionsResult> {
    const [driving, walking, transitAll, transitBus, transitSubway] =
      await Promise.allSettled([
        this.getDirections(from, to, 'driving'),
        this.getDirections(from, to, 'walking'),
        this.getTransitAlternatives(from, to),
        this.getDirections(from, to, 'transit', 'bus'),
        this.getDirections(from, to, 'transit', 'subway'),
      ]);

    return {
      driving: driving.status === 'fulfilled' ? driving.value : null,
      walking: walking.status === 'fulfilled' ? walking.value : null,
      transit: transitAll.status === 'fulfilled' ? transitAll.value : [],
      transitBus: transitBus.status === 'fulfilled' ? transitBus.value : null,
      transitSubway: transitSubway.status === 'fulfilled' ? transitSubway.value : null,
    };
  }

  private parseDirectionsResponse(route: any): GoogleDirectionsResult {
    const leg = route.legs[0]; // We use first leg (no waypoints)

    const steps: GoogleDirectionStep[] = (leg.steps || []).map(
      (step: any) => this.parseStep(step)
    );

    return {
      distance: leg.distance?.value || 0,
      duration: Math.round((leg.duration?.value || 0) / 60), // seconds → minutes
      durationInTraffic: Math.round(
        (leg.duration_in_traffic?.value || leg.duration?.value || 0) / 60
      ),
      summary: route.summary || '',
      polyline: route.overview_polyline?.points || '',
      steps,
      startAddress: leg.start_address || '',
      endAddress: leg.end_address || '',
      warnings: route.warnings || [],
    };
  }

  private parseStep(step: any): GoogleDirectionStep {
    const result: GoogleDirectionStep = {
      instruction: step.html_instructions?.replace(/<[^>]*>/g, '') || '',
      distance: step.distance?.value || 0,
      duration: Math.round((step.duration?.value || 0) / 60),
      mode: step.travel_mode || 'DRIVING',
    };

    // Parse transit-specific details
    if (step.transit_details) {
      const td = step.transit_details;
      result.transitDetails = {
        lineName: td.line?.name || '',
        lineShortName: td.line?.short_name || '',
        vehicleType: td.line?.vehicle?.type || '',
        departureStop: td.departure_stop?.name || '',
        arrivalStop: td.arrival_stop?.name || '',
        numStops: td.num_stops || 0,
        departureTime: td.departure_time?.text || '',
        arrivalTime: td.arrival_time?.text || '',
        headway: td.headway || 0,
        color: td.line?.color || '#3b82f6',
      };
    }

    return result;
  }
}

// Export singleton
export const googleDirectionsService = new GoogleDirectionsService();
