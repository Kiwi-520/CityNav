import {
  Location,
  TransportMode,
  RouteRequest,
  RouteResponse,
  MultimodalRoute,
  RouteSegment,
  ModeConfig,
} from '../types/multimodal';
import { transitStopFinder, TransitStop } from './transit-stop-finder.service';

export class EnhancedMultimodalEngine {
  private modeConfigs: Map<TransportMode, ModeConfig> = new Map();

  constructor() {
    this.initializeDefaultModes();
  }

  private initializeDefaultModes(): void {
    const defaultModes: ModeConfig[] = [
      {
        mode: 'walk',
        averageSpeed: 4.5,
        baseFare: 0,
        comfortScore: 6,
        reliabilityScore: 10,
        carbonEmission: 0,
        icon: '🚶',
        color: '#22c55e',
        displayName: 'Walk',
        maxDistance: 2000,
      },
      {
        mode: 'bus',
        averageSpeed: 15,
        baseFare: 10,
        costPerKm: 2,
        comfortScore: 5,
        reliabilityScore: 6,
        carbonEmission: 80,
        icon: '🚌',
        color: '#f59e0b',
        displayName: 'Bus',
        operatingHours: { start: '05:00', end: '23:30' },
      },
      {
        mode: 'metro',
        averageSpeed: 35,
        baseFare: 10,
        costPerKm: 3,
        comfortScore: 8,
        reliabilityScore: 9,
        carbonEmission: 30,
        icon: '🚇',
        color: '#3b82f6',
        displayName: 'Metro',
        operatingHours: { start: '06:00', end: '23:00' },
      },
      {
        mode: 'auto',
        averageSpeed: 22,
        baseFare: 20,
        costPerKm: 15,
        comfortScore: 6,
        reliabilityScore: 7,
        carbonEmission: 120,
        icon: '🛺',
        color: '#eab308',
        displayName: 'Auto',
        maxDistance: 10000,
      },
      {
        mode: 'cab',
        averageSpeed: 28,
        baseFare: 50,
        costPerKm: 20,
        comfortScore: 9,
        reliabilityScore: 8,
        carbonEmission: 150,
        icon: '🚗',
        color: '#8b5cf6',
        displayName: 'Cab',
      },
    ];

    defaultModes.forEach((config) => {
      this.modeConfigs.set(config.mode, config);
    });
  }

  private calculateDistance(loc1: Location, loc2: Location): number {
    const R = 6371e3;
    const φ1 = (loc1.lat * Math.PI) / 180;
    const φ2 = (loc2.lat * Math.PI) / 180;
    const Δφ = ((loc2.lat - loc1.lat) * Math.PI) / 180;
    const Δλ = ((loc2.lng - loc1.lng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private calculateSegmentMetrics(
    mode: TransportMode,
    distance: number
  ): { duration: number; cost: number } {
    const config = this.modeConfigs.get(mode);
    if (!config) {
      throw new Error(`Unknown transport mode: ${mode}`);
    }

    const distanceKm = distance / 1000;
    const duration = (distanceKm / config.averageSpeed) * 60;

    let cost = config.baseFare;
    if (config.costPerKm) {
      cost += distanceKm * config.costPerKm;
    }

    return { duration, cost };
  }

  async calculateRoutesWithStops(request: RouteRequest): Promise<RouteResponse> {
    const totalDistance = this.calculateDistance(request.source, request.destination);
    const distanceKm = totalDistance / 1000;

    // Find nearby transit infrastructure
    const [sourceTransit, destTransit] = await Promise.all([
      transitStopFinder.findNearbyTransitStops(request.source, 1000),
      transitStopFinder.findNearbyTransitStops(request.destination, 1000),
    ]);

    const routes: MultimodalRoute[] = [];

    // Generate routes based on distance and available infrastructure
    if (totalDistance < 500) {
      // Very short: Walk only
      routes.push(this.createWalkRoute(request, totalDistance));
      routes.push(await this.createAutoRoute(request, totalDistance));
    } else if (totalDistance < 2000) {
      // Short: Walk, Auto, or Bus
      routes.push(this.createWalkRoute(request, totalDistance));
      routes.push(await this.createAutoRoute(request, totalDistance));
      const busRoute = await this.createSimpleBusRoute(
        request,
        totalDistance,
        sourceTransit.busStops,
        destTransit.busStops
      );
      if (busRoute) routes.push(busRoute);
    } else if (totalDistance < 10000) {
      // Medium: Multiple multimodal options
      // Option 1: Metro route (if metro available)
      const metroRoute = await this.createMetroRoute(
        request,
        totalDistance,
        sourceTransit.metroStations,
        destTransit.metroStations
      );
      if (metroRoute) routes.push(metroRoute);

      // Option 2: Bus route
      const busRoute = await this.createBusRoute(
        request,
        totalDistance,
        sourceTransit.busStops,
        destTransit.busStops
      );
      if (busRoute) routes.push(busRoute);

      // Option 3: Walk + Metro + Walk
      const walkMetroRoute = await this.createWalkMetroWalkRoute(
        request,
        totalDistance,
        sourceTransit.metroStations,
        destTransit.metroStations
      );
      if (walkMetroRoute) routes.push(walkMetroRoute);

      // Option 4: Auto (direct)
      routes.push(await this.createAutoRoute(request, totalDistance));
    } else {
      // Long distance: Cab, Metro combos
      routes.push(await this.createCabRoute(request, totalDistance));
      
      const metroRoute = await this.createMetroWithFirstLastMile(
        request,
        totalDistance,
        sourceTransit,
        destTransit
      );
      if (metroRoute) routes.push(metroRoute);
    }

    // Sort routes by score (time + cost balanced)
    routes.sort((a, b) => {
      const scoreA = a.totalDuration + a.totalCost * 2;
      const scoreB = b.totalDuration + b.totalCost * 2;
      return scoreA - scoreB;
    });

    return {
      request,
      routes,
      calculatedAt: new Date(),
      calculationTime: 0, // Not tracking calculation time in enhanced version
    };
  }

  private createWalkRoute(request: RouteRequest, distance: number): MultimodalRoute {
    const { duration, cost } = this.calculateSegmentMetrics('walk', distance);

    const segment: RouteSegment = {
      id: `seg-walk-${Date.now()}`,
      mode: 'walk',
      from: request.source,
      to: request.destination,
      distance,
      duration: Math.round(duration),
      cost: 0,
      instruction: `Walk from ${request.source.name || 'your location'} to ${request.destination.name || 'destination'}`,
    };

    return {
      id: `route-walk-${Date.now()}`,
      type: 'cheapest',
      name: 'Walking Route',
      segments: [segment],
      totalDistance: distance,
      totalDuration: Math.round(duration),
      totalCost: 0,
      transferCount: 0,
      modesUsed: ['walk'],
      carbonFootprint: 'low',
      comfortLevel: distance < 1000 ? 'high' : 'medium',
      description: 'Free and healthy option',
      score: duration,
    };
  }

  private async createAutoRoute(
    request: RouteRequest,
    distance: number
  ): Promise<MultimodalRoute> {
    const { duration, cost } = this.calculateSegmentMetrics('auto', distance);

    const segment: RouteSegment = {
      id: `seg-auto-${Date.now()}`,
      mode: 'auto',
      from: request.source,
      to: request.destination,
      distance,
      duration: Math.round(duration),
      cost: Math.round(cost),
      instruction: `Take auto-rickshaw from ${request.source.name || 'your location'} to ${request.destination.name || 'destination'}`,
    };

    return {
      id: `route-auto-${Date.now()}`,
      type: 'comfort',
      name: 'Auto-rickshaw',
      segments: [segment],
      totalDistance: distance,
      totalDuration: Math.round(duration),
      totalCost: Math.round(cost),
      transferCount: 0,
      modesUsed: ['auto'],
      carbonFootprint: 'medium',
      comfortLevel: 'medium',
      description: 'Direct and convenient',
      score: duration + cost,
    };
  }
  private async createCabRoute(
    request: RouteRequest,
    distance: number
  ): Promise<MultimodalRoute> {
    const { duration, cost } = this.calculateSegmentMetrics('cab', distance);

    const segment: RouteSegment = {
      id: `seg-cab-${Date.now()}`,
      mode: 'cab',
      from: request.source,
      to: request.destination,
      distance,
      duration: Math.round(duration),
      cost: Math.round(cost),
      instruction: `Take cab from ${request.source.name || 'your location'} to ${request.destination.name || 'destination'}`,
    };

    return {
      id: `route-cab-${Date.now()}`,
      type: 'fastest',
      name: 'Cab',
      segments: [segment],
      totalDistance: distance,
      totalDuration: Math.round(duration),
      totalCost: Math.round(cost),
      transferCount: 0,
      modesUsed: ['cab'],
      carbonFootprint: 'high',
      comfortLevel: 'high',
      description: 'Fastest and most comfortable',
      score: duration + cost * 0.5,
    };
  }

  private async createSimpleBusRoute(
    request: RouteRequest,
    distance: number,
    sourceBusStops: TransitStop[],
    destBusStops: TransitStop[]
  ): Promise<MultimodalRoute | null> {
    const nearestSourceStop = transitStopFinder.findBestTransitStop(sourceBusStops, 500);
    const nearestDestStop = transitStopFinder.findBestTransitStop(destBusStops, 500);

    if (!nearestSourceStop || !nearestDestStop) {
      return null; // No bus stops within walking distance
    }

    const segments: RouteSegment[] = [];
    let totalDuration = 0;
    let totalCost = 0;
    let totalDistance = distance;

    // Segment 1: Walk to bus stop
    const walkToStop = this.calculateDistance(request.source, nearestSourceStop.location);
    const walkToMetrics = this.calculateSegmentMetrics('walk', walkToStop);
    segments.push({
      id: `seg-walk-to-bus-${Date.now()}`,
      mode: 'walk',
      from: request.source,
      to: { ...nearestSourceStop.location, name: nearestSourceStop.name },
      distance: walkToStop,
      duration: Math.round(walkToMetrics.duration),
      cost: 0,
      instruction: `Walk ${Math.round(walkToStop)}m (${Math.round(walkToMetrics.duration)} min) to ${nearestSourceStop.name}`,
    });
    totalDuration += walkToMetrics.duration;

    // Segment 2: Bus journey
    const busDistance = this.calculateDistance(
      nearestSourceStop.location,
      nearestDestStop.location
    );
    const busMetrics = this.calculateSegmentMetrics('bus', busDistance);
    const routeInfo = nearestSourceStop.routes && nearestSourceStop.routes.length > 0
      ? `Bus ${nearestSourceStop.routes[0]}`
      : 'Bus';
    
    segments.push({
      id: `seg-bus-${Date.now()}`,
      mode: 'bus',
      from: nearestSourceStop.location,
      to: nearestDestStop.location,
      distance: busDistance,
      duration: Math.round(busMetrics.duration),
      cost: Math.round(busMetrics.cost),
      instruction: `Board ${routeInfo} at ${nearestSourceStop.name}, alight at ${nearestDestStop.name}`,
      routeInfo,
      routeNumber: nearestSourceStop.routes?.[0],
    });
    totalDuration += busMetrics.duration;
    totalCost += busMetrics.cost;

    // Segment 3: Walk from bus stop
    const walkFromStop = this.calculateDistance(nearestDestStop.location, request.destination);
    const walkFromMetrics = this.calculateSegmentMetrics('walk', walkFromStop);
    segments.push({
      id: `seg-walk-from-bus-${Date.now()}`,
      mode: 'walk',
      from: { ...nearestDestStop.location, name: nearestDestStop.name },
      to: request.destination,
      distance: walkFromStop,
      duration: Math.round(walkFromMetrics.duration),
      cost: 0,
      instruction: `Walk ${Math.round(walkFromStop)}m (${Math.round(walkFromMetrics.duration)} min) from ${nearestDestStop.name} to ${request.destination.name || 'destination'}`,
    });
    totalDuration += walkFromMetrics.duration;

    return {
      id: `route-bus-${Date.now()}`,
      type: 'cheapest',
      name: 'Bus Route',
      segments,
      totalDistance,
      totalDuration: Math.round(totalDuration),
      totalCost: Math.round(totalCost),
      transferCount: 0,
      modesUsed: ['walk', 'bus'],
      carbonFootprint: 'low',
      comfortLevel: 'medium',
      description: `Take ${routeInfo} with ${Math.round(walkToStop + walkFromStop)}m walking`,
      score: totalDuration + totalCost * 2,
    };
  }

  private async createMetroRoute(
    request: RouteRequest,
    distance: number,
    sourceMetroStations: TransitStop[],
    destMetroStations: TransitStop[]
  ): Promise<MultimodalRoute | null> {
    const nearestSourceStation = transitStopFinder.findBestTransitStop(sourceMetroStations, 800);
    const nearestDestStation = transitStopFinder.findBestTransitStop(destMetroStations, 800);

    if (!nearestSourceStation || !nearestDestStation) {
      return null;
    }

    const segments: RouteSegment[] = [];
    let totalDuration = 0;
    let totalCost = 0;

    // Walk to metro
    const walkToMetro = this.calculateDistance(request.source, nearestSourceStation.location);
    const walkToMetrics = this.calculateSegmentMetrics('walk', walkToMetro);
    segments.push({
      id: `seg-walk-to-metro-${Date.now()}`,
      mode: 'walk',
      from: request.source,
      to: { ...nearestSourceStation.location, name: nearestSourceStation.name },
      distance: walkToMetro,
      duration: Math.round(walkToMetrics.duration),
      cost: 0,
      instruction: `Walk ${Math.round(walkToMetro)}m (${Math.round(walkToMetrics.duration)} min) to ${nearestSourceStation.name}`,
    });
    totalDuration += walkToMetrics.duration;

    // Metro journey
    const metroDistance = this.calculateDistance(
      nearestSourceStation.location,
      nearestDestStation.location
    );
    const metroMetrics = this.calculateSegmentMetrics('metro', metroDistance);
    const metroLine = nearestSourceStation.routes && nearestSourceStation.routes.length > 0
      ? nearestSourceStation.routes[0]
      : 'Metro';

    segments.push({
      id: `seg-metro-${Date.now()}`,
      mode: 'metro',
      from: nearestSourceStation.location,
      to: nearestDestStation.location,
      distance: metroDistance,
      duration: Math.round(metroMetrics.duration),
      cost: Math.round(metroMetrics.cost),
      instruction: `Board ${metroLine} at ${nearestSourceStation.name}, alight at ${nearestDestStation.name}`,
      routeInfo: metroLine,
      routeNumber: metroLine,
    });
    totalDuration += metroMetrics.duration;
    totalCost += metroMetrics.cost;

    // Walk from metro
    const walkFromMetro = this.calculateDistance(nearestDestStation.location, request.destination);
    const walkFromMetrics = this.calculateSegmentMetrics('walk', walkFromMetro);
    segments.push({
      id: `seg-walk-from-metro-${Date.now()}`,
      mode: 'walk',
      from: { ...nearestDestStation.location, name: nearestDestStation.name },
      to: request.destination,
      distance: walkFromMetro,
      duration: Math.round(walkFromMetrics.duration),
      cost: 0,
      instruction: `Walk ${Math.round(walkFromMetro)}m (${Math.round(walkFromMetrics.duration)} min) from ${nearestDestStation.name} to ${request.destination.name || 'destination'}`,
    });
    totalDuration += walkFromMetrics.duration;

    return {
      id: `route-metro-${Date.now()}`,
      type: 'fastest',
      name: `${metroLine} Metro`,
      segments,
      totalDistance: distance,
      totalDuration: Math.round(totalDuration),
      totalCost: Math.round(totalCost),
      transferCount: 0,
      modesUsed: ['walk', 'metro'],
      carbonFootprint: 'low',
      comfortLevel: 'high',
      description: `Fast metro with ${Math.round(walkToMetro + walkFromMetro)}m walking`,
      score: totalDuration * 0.8 + totalCost,
    };
  }

  private async createWalkMetroWalkRoute(
    request: RouteRequest,
    distance: number,
    sourceMetroStations: TransitStop[],
    destMetroStations: TransitStop[]
  ): Promise<MultimodalRoute | null> {
    return this.createMetroRoute(request, distance, sourceMetroStations, destMetroStations);
  }

  private async createMetroWithFirstLastMile(
    request: RouteRequest,
    distance: number,
    sourceTransit: any,
    destTransit: any
  ): Promise<MultimodalRoute | null> {
    const nearestSourceStation = transitStopFinder.findBestTransitStop(
      sourceTransit.metroStations,
      2000
    );
    const nearestDestStation = transitStopFinder.findBestTransitStop(
      destTransit.metroStations,
      2000
    );

    if (!nearestSourceStation || !nearestDestStation) {
      return null;
    }

    const segments: RouteSegment[] = [];
    let totalDuration = 0;
    let totalCost = 0;

    // Auto to metro
    const autoToMetro = this.calculateDistance(request.source, nearestSourceStation.location);
    const autoToMetrics = this.calculateSegmentMetrics('auto', autoToMetro);
    segments.push({
      id: `seg-auto-to-metro-${Date.now()}`,
      mode: 'auto',
      from: request.source,
      to: nearestSourceStation.location,
      distance: autoToMetro,
      duration: Math.round(autoToMetrics.duration),
      cost: Math.round(autoToMetrics.cost),
      instruction: `Take auto to ${nearestSourceStation.name}`,
    });
    totalDuration += autoToMetrics.duration;
    totalCost += autoToMetrics.cost;

    // Metro
    const metroDistance = this.calculateDistance(
      nearestSourceStation.location,
      nearestDestStation.location
    );
    const metroMetrics = this.calculateSegmentMetrics('metro', metroDistance);
    const metroLine = nearestSourceStation.routes?.[0] || 'Metro';
    
    segments.push({
      id: `seg-metro-${Date.now()}`,
      mode: 'metro',
      from: nearestSourceStation.location,
      to: nearestDestStation.location,
      distance: metroDistance,
      duration: Math.round(metroMetrics.duration),
      cost: Math.round(metroMetrics.cost),
      instruction: `Board ${metroLine} at ${nearestSourceStation.name}, alight at ${nearestDestStation.name}`,
      routeInfo: metroLine,
    });
    totalDuration += metroMetrics.duration;
    totalCost += metroMetrics.cost;

    // Auto from metro
    const autoFromMetro = this.calculateDistance(nearestDestStation.location, request.destination);
    const autoFromMetrics = this.calculateSegmentMetrics('auto', autoFromMetro);
    segments.push({
      id: `seg-auto-from-metro-${Date.now()}`,
      mode: 'auto',
      from: nearestDestStation.location,
      to: request.destination,
      distance: autoFromMetro,
      duration: Math.round(autoFromMetrics.duration),
      cost: Math.round(autoFromMetrics.cost),
      instruction: `Take auto from ${nearestDestStation.name} to ${request.destination.name || 'destination'}`,
    });
    totalDuration += autoFromMetrics.duration;
    totalCost += autoFromMetrics.cost;

    return {
      id: `route-metro-auto-${Date.now()}`,
      type: 'balanced',
      name: `${metroLine} + Auto`,
      segments,
      totalDistance: distance,
      totalDuration: Math.round(totalDuration),
      totalCost: Math.round(totalCost),
      transferCount: 2,
      modesUsed: ['auto', 'metro'],
      carbonFootprint: 'low',
      comfortLevel: 'high',
      description: 'Metro with auto for first and last mile',
      score: totalDuration + totalCost,
    };
  }

  private async createBusRoute(
    request: RouteRequest,
    distance: number,
    sourceBusStops: TransitStop[],
    destBusStops: TransitStop[]
  ): Promise<MultimodalRoute | null> {
    return this.createSimpleBusRoute(request, distance, sourceBusStops, destBusStops);
  }
}

// Export singleton
export const enhancedMultimodalEngine = new EnhancedMultimodalEngine();
