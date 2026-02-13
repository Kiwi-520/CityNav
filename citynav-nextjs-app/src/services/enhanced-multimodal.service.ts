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
import {
  googleDirectionsService,
  GoogleDirectionsResult,
  GoogleDirectionStep,
  MultiDirectionsResult,
} from './google-directions.service';

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

    // Fetch Google Directions data and nearby transit stops in parallel
    const [googleDirections, sourceTransit, destTransit] = await Promise.all([
      googleDirectionsService.getAllDirections(request.source, request.destination),
      transitStopFinder.findNearbyTransitStops(request.source, 1000),
      transitStopFinder.findNearbyTransitStops(request.destination, 1000),
    ]);

    const routes: MultimodalRoute[] = [];
    
    if (googleDirections.driving) {
      routes.push(this.createGoogleCabRoute(request, googleDirections.driving));
      // Auto route uses driving data with adjusted cost
      if (googleDirections.driving.distance < 15000) {
        routes.push(this.createGoogleAutoRoute(request, googleDirections.driving));
      }
    }

    if (googleDirections.walking && totalDistance < 3000) {
      routes.push(this.createGoogleWalkRoute(request, googleDirections.walking));
    }

    if (googleDirections.transit.length > 0) {
      for (const transitRoute of googleDirections.transit.slice(0, 3)) {
        const route = this.createGoogleTransitRoute(request, transitRoute);
        if (route) routes.push(route);
      }
    }

    if (googleDirections.transitBus) {
      const existing = routes.find(r => r.name.toLowerCase().includes('bus'));
      if (!existing) {
        const busRoute = this.createGoogleTransitRoute(request, googleDirections.transitBus, 'bus');
        if (busRoute) routes.push(busRoute);
      }
    }

    if (googleDirections.transitSubway) {
      const existing = routes.find(r => r.name.toLowerCase().includes('metro') || r.name.toLowerCase().includes('subway'));
      if (!existing) {
        const metroRoute = this.createGoogleTransitRoute(request, googleDirections.transitSubway, 'metro');
        if (metroRoute) routes.push(metroRoute);
      }
    }

    if (routes.length < 2) {
      if (totalDistance < 500) {
        if (!routes.find(r => r.modesUsed.includes('walk'))) {
          routes.push(this.createWalkRoute(request, totalDistance));
        }
        routes.push(await this.createAutoRoute(request, totalDistance));
      } else if (totalDistance < 2000) {
        if (!routes.find(r => r.modesUsed.includes('walk'))) {
          routes.push(this.createWalkRoute(request, totalDistance));
        }
        if (!routes.find(r => r.modesUsed.includes('auto'))) {
          routes.push(await this.createAutoRoute(request, totalDistance));
        }
        const busRoute = await this.createSimpleBusRoute(
          request, totalDistance, sourceTransit.busStops, destTransit.busStops
        );
        if (busRoute) routes.push(busRoute);
      } else if (totalDistance < 10000) {
        const metroRoute = await this.createMetroRoute(
          request, totalDistance, sourceTransit.metroStations, destTransit.metroStations
        );
        if (metroRoute) routes.push(metroRoute);
        const busRoute = await this.createBusRoute(
          request, totalDistance, sourceTransit.busStops, destTransit.busStops
        );
        if (busRoute) routes.push(busRoute);
        if (!routes.find(r => r.modesUsed.includes('auto'))) {
          routes.push(await this.createAutoRoute(request, totalDistance));
        }
      } else {
        if (!routes.find(r => r.modesUsed.includes('cab'))) {
          routes.push(await this.createCabRoute(request, totalDistance));
        }
        const metroRoute = await this.createMetroWithFirstLastMile(
          request, totalDistance, sourceTransit, destTransit
        );
        if (metroRoute) routes.push(metroRoute);
      }
    }

    const deduped = this.deduplicateRoutes(routes);

    deduped.sort((a, b) => {

      const aHasGoogle = a.segments.some(s => s.routeInfo?.includes('via'));
      const bHasGoogle = b.segments.some(s => s.routeInfo?.includes('via'));
      if (aHasGoogle && !bHasGoogle) return -1;
      if (!aHasGoogle && bHasGoogle) return 1;

      const scoreA = a.totalDuration + a.totalCost * 2;
      const scoreB = b.totalDuration + b.totalCost * 2;
      return scoreA - scoreB;
    });

    return {
      request,
      routes: deduped.slice(0, 5), // Return top 5 routes
      calculatedAt: new Date(),
      calculationTime: 0,
    };
  }

  private createGoogleCabRoute(
    request: RouteRequest,
    directions: GoogleDirectionsResult
  ): MultimodalRoute {
    const durationMin = directions.durationInTraffic || directions.duration;
    const distanceKm = directions.distance / 1000;
    
    // Indian cab pricing: base ₹50 + ₹15-20/km
    const cost = Math.round(50 + distanceKm * 18);

    const segment: RouteSegment = {
      id: `seg-cab-google-${Date.now()}`,
      mode: 'cab',
      from: request.source,
      to: request.destination,
      distance: directions.distance,
      duration: durationMin,
      cost,
      instruction: `Take cab from ${request.source.name || 'your location'} to ${request.destination.name || 'destination'}`,
      routeInfo: directions.summary ? `via ${directions.summary}` : undefined,
    };

    return {
      id: `route-cab-google-${Date.now()}`,
      type: 'fastest',
      name: `Cab${directions.summary ? ' via ' + directions.summary : ''}`,
      segments: [segment],
      totalDistance: directions.distance,
      totalDuration: durationMin,
      totalCost: cost,
      transferCount: 0,
      modesUsed: ['cab'],
      carbonFootprint: 'high',
      comfortLevel: 'high',
      description: `${durationMin} min drive (live traffic) • ₹${cost}`,
      score: durationMin + cost * 0.5,
    };
  }

  private createGoogleAutoRoute(
    request: RouteRequest,
    directions: GoogleDirectionsResult
  ): MultimodalRoute {
    // Auto is slower than car in traffic: add ~20%
    const durationMin = Math.round((directions.durationInTraffic || directions.duration) * 1.2);
    const distanceKm = directions.distance / 1000;
    
    // Indian auto pricing: base ₹25 + ₹12-15/km
    const cost = Math.round(25 + distanceKm * 14);

    const segment: RouteSegment = {
      id: `seg-auto-google-${Date.now()}`,
      mode: 'auto',
      from: request.source,
      to: request.destination,
      distance: directions.distance,
      duration: durationMin,
      cost,
      instruction: `Take auto-rickshaw from ${request.source.name || 'your location'} to ${request.destination.name || 'destination'}`,
      routeInfo: directions.summary ? `via ${directions.summary}` : undefined,
    };

    return {
      id: `route-auto-google-${Date.now()}`,
      type: 'comfort',
      name: `Auto-rickshaw${directions.summary ? ' via ' + directions.summary : ''}`,
      segments: [segment],
      totalDistance: directions.distance,
      totalDuration: durationMin,
      totalCost: cost,
      transferCount: 0,
      modesUsed: ['auto'],
      carbonFootprint: 'medium',
      comfortLevel: 'medium',
      description: `${durationMin} min ride • ₹${cost}`,
      score: durationMin + cost,
    };
  }

  private createGoogleWalkRoute(
    request: RouteRequest,
    directions: GoogleDirectionsResult
  ): MultimodalRoute {
    const segment: RouteSegment = {
      id: `seg-walk-google-${Date.now()}`,
      mode: 'walk',
      from: request.source,
      to: request.destination,
      distance: directions.distance,
      duration: directions.duration,
      cost: 0,
      instruction: `Walk from ${request.source.name || 'your location'} to ${request.destination.name || 'destination'}`,
      routeInfo: directions.summary ? `via ${directions.summary}` : undefined,
    };

    return {
      id: `route-walk-google-${Date.now()}`,
      type: 'cheapest',
      name: 'Walking Route',
      segments: [segment],
      totalDistance: directions.distance,
      totalDuration: directions.duration,
      totalCost: 0,
      transferCount: 0,
      modesUsed: ['walk'],
      carbonFootprint: 'low',
      comfortLevel: directions.distance < 1000 ? 'high' : 'medium',
      description: `${directions.duration} min walk (${(directions.distance / 1000).toFixed(1)} km)`,
      score: directions.duration,
    };
  }

  private createGoogleTransitRoute(
    request: RouteRequest,
    directions: GoogleDirectionsResult,
    preferredType?: 'bus' | 'metro'
  ): MultimodalRoute | null {
    if (!directions.steps || directions.steps.length === 0) return null;

    const segments: RouteSegment[] = [];
    const modesUsed: Set<TransportMode> = new Set();
    let totalCost = 0;
    let transferCount = 0;
    const routeLabels: string[] = [];

    for (const step of directions.steps) {
      if (step.mode === 'WALKING' && step.duration > 0) {
        segments.push({
          id: `seg-walk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          mode: 'walk',
          from: request.source, // Simplified; Google steps have lat/lng too
          to: request.destination,
          distance: step.distance,
          duration: step.duration,
          cost: 0,
          instruction: step.instruction || `Walk ${Math.round(step.distance)}m`,
        });
        modesUsed.add('walk');
      } else if (step.mode === 'TRANSIT' && step.transitDetails) {
        const td = step.transitDetails;
        const vehicleType = td.vehicleType.toUpperCase();
        
        let mode: TransportMode = 'bus';
        if (vehicleType === 'SUBWAY' || vehicleType === 'METRO_RAIL' || vehicleType === 'HEAVY_RAIL') {
          mode = 'metro';
        } else if (vehicleType === 'BUS' || vehicleType === 'INTERCITY_BUS') {
          mode = 'bus';
        } else if (vehicleType === 'COMMUTER_TRAIN' || vehicleType === 'RAIL' || vehicleType === 'HIGH_SPEED_TRAIN') {
          mode = 'metro'; // Map rail/train to metro category
        }

        const lineName = td.lineShortName || td.lineName || 'Transit';
        routeLabels.push(lineName);

        // Estimate transit costs (Indian pricing)
        let segmentCost = 0;
        if (mode === 'bus') {
          segmentCost = Math.round(10 + (step.distance / 1000) * 2); // ~₹10 base + ₹2/km
        } else if (mode === 'metro') {
          segmentCost = Math.round(10 + (step.distance / 1000) * 3); // ~₹10 base + ₹3/km
        }
        totalCost += segmentCost;

        segments.push({
          id: `seg-${mode}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          mode,
          from: { lat: 0, lng: 0, name: td.departureStop },
          to: { lat: 0, lng: 0, name: td.arrivalStop },
          distance: step.distance,
          duration: step.duration,
          cost: segmentCost,
          instruction: `Board ${lineName} at ${td.departureStop}, alight at ${td.arrivalStop} (${td.numStops} stops)`,
          routeInfo: lineName,
          routeNumber: td.lineShortName || undefined,
          stopCount: td.numStops,
          waitTime: td.headway > 0 ? Math.round(td.headway / 60) : undefined,
        });
        modesUsed.add(mode);

        if (segments.filter(s => s.mode !== 'walk').length > 1) {
          transferCount++;
        }
      }
    }

    if (segments.length === 0) return null;

    // Determine route type
    const allModes = Array.from(modesUsed);
    const hasMetro = modesUsed.has('metro');
    const hasBus = modesUsed.has('bus');

    let type: 'fastest' | 'cheapest' | 'balanced' | 'comfort' = 'balanced';
    if (hasMetro && !hasBus) type = 'fastest';
    else if (hasBus && !hasMetro) type = 'cheapest';

    // Build descriptive name from transit lines used
    const routeName = routeLabels.length > 0
      ? routeLabels.join(' → ')
      : (hasMetro ? 'Metro' : 'Bus') + ' Route';

    const carbonFootprint = hasMetro ? 'low' : hasBus ? 'low' : 'medium';

    return {
      id: `route-transit-google-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      name: routeName,
      segments,
      totalDistance: directions.distance,
      totalDuration: directions.duration,  // Real Google-calculated duration
      totalCost: totalCost,
      transferCount,
      modesUsed: allModes,
      carbonFootprint,
      comfortLevel: hasMetro ? 'high' : 'medium',
      description: `${directions.duration} min • ${routeLabels.join(' + ')} • ₹${totalCost}`,
      score: directions.duration + totalCost,
    };
  }

  private deduplicateRoutes(routes: MultimodalRoute[]): MultimodalRoute[] {
    const seen = new Map<string, MultimodalRoute>();
    
    for (const route of routes) {
      const key = route.modesUsed.sort().join('-');
      const existing = seen.get(key);
      
      if (!existing) {
        seen.set(key, route);
      } else {
        // Keep the one with the better (lower) score
        const existingScore = existing.totalDuration + existing.totalCost;
        const newScore = route.totalDuration + route.totalCost;
        
        // If durations differ significantly, both are unique routes
        if (Math.abs(existing.totalDuration - route.totalDuration) > 5) {
          // Different enough, add with modified key
          seen.set(key + '-' + route.id, route);
        } else if (newScore < existingScore) {
          seen.set(key, route);
        }
      }
    }

    return Array.from(seen.values());
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
    const totalDistance = distance;

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
