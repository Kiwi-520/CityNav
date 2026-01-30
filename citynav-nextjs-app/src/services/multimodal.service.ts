import {
  Location,
  TransportMode,
  RouteRequest,
  RouteResponse,
  MultimodalRoute,
  RouteSegment,
  ModeConfig,
  ScoringWeights,
  CityConfig,
} from '../types/multimodal';

// Import enhanced services
import { JourneySegmentationEngine } from './journey-segmentation.service';
import { RouteScoringEngine } from './route-scoring.service';
import { ContextAwareDecisionEngine, CityContext, WeatherContext } from './context-aware.service';
import { CityConfigurationManager, ModeConfigConstants } from './city-config.service';

export class MultimodalDecisionEngine {
  private cityConfig: CityConfig | null = null;
  private modeConfigs: Map<TransportMode, ModeConfig> = new Map();

  constructor() {
    this.initializeDefaultModes();
  }

  private initializeDefaultModes(): void {
    const defaultModes: ModeConfig[] = [
      {
        mode: 'walk',
        averageSpeed: 4.5, // km/h
        baseFare: 0,
        comfortScore: 6,
        reliabilityScore: 10,
        carbonEmission: 0,
        icon: '🚶',
        color: '#22c55e',
        displayName: 'Walk',
        maxDistance: 2000, // 2km practical walking limit
      },
      {
        mode: 'bus',
        averageSpeed: 15, // km/h (with stops and traffic)
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
        averageSpeed: 35, // km/h (including station wait)
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
        averageSpeed: 22, // km/h (traffic dependent)
        baseFare: 20,
        costPerKm: 15,
        comfortScore: 6,
        reliabilityScore: 7,
        carbonEmission: 120,
        icon: '🛺',
        color: '#eab308',
        displayName: 'Auto',
        maxDistance: 10000, // Autos typically for shorter distances
      },
      {
        mode: 'cab',
        averageSpeed: 28, // km/h
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
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (loc1.lat * Math.PI) / 180;
    const φ2 = (loc2.lat * Math.PI) / 180;
    const Δφ = ((loc2.lat - loc1.lat) * Math.PI) / 180;
    const Δλ = ((loc2.lng - loc1.lng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  private calculateSegmentMetrics(
    mode: TransportMode,
    distance: number
  ): { duration: number; cost: number } {
    const config = this.modeConfigs.get(mode);
    if (!config) {
      throw new Error(`Unknown transport mode: ${mode}`);
    }

    // Calculate duration (in minutes)
    const distanceKm = distance / 1000;
    const duration = (distanceKm / config.averageSpeed) * 60;

    // Calculate cost
    let cost = config.baseFare;
    if (config.costPerKm) {
      cost += distanceKm * config.costPerKm;
    }

    return { duration, cost };
  }

  private generateSingleModeRoute(
    request: RouteRequest,
    mode: TransportMode
  ): RouteSegment {
    const distance = this.calculateDistance(request.source, request.destination);
    const { duration, cost } = this.calculateSegmentMetrics(mode, distance);
    const config = this.modeConfigs.get(mode)!;

    return {
      id: `segment-${mode}-${Date.now()}`,
      mode,
      from: request.source,
      to: request.destination,
      distance,
      duration: Math.round(duration),
      cost: Math.round(cost),
      instruction: `Take ${config.displayName} from ${request.source.name || 'source'} to ${request.destination.name || 'destination'}`,
    };
  }

  private generateRouteOptions(request: RouteRequest): MultimodalRoute[] {
    const routes: MultimodalRoute[] = [];
    const distance = this.calculateDistance(request.source, request.destination);
    const distanceKm = distance / 1000;

    // SCENARIO 1: Very Short Distance (< 500m) - Walking only
    if (distance < 500) {
      routes.push(this.createWalkOnlyRoute(request, distance));
      routes.push(this.createAutoRoute(request, distance)); // Option if user prefers not to walk
      return routes;
    }

    // SCENARIO 2: Short Distance (0.5km - 2km) - Walk or Auto
    if (distance >= 500 && distance < 2000) {
      routes.push(this.createWalkOnlyRoute(request, distance));
      routes.push(this.createAutoRoute(request, distance));
      routes.push(this.createBusRoute(request, distance));
      return routes;
    }

    // SCENARIO 3: Medium Distance (2km - 10km) - Multiple options
    if (distance >= 2000 && distance < 10000) {
      // Option 1: Metro (fastest if available)
      routes.push(this.createMetroRoute(request, distance));
      
      // Option 2: Bus (cheapest)
      routes.push(this.createBusRoute(request, distance));
      
      // Option 3: Auto (direct, moderate cost)
      routes.push(this.createAutoRoute(request, distance));
      
      // Option 4: Multimodal - Walk + Metro + Walk
      routes.push(this.createWalkMetroWalkRoute(request, distance));
      
      return routes;
    }

    // SCENARIO 4: Long Distance (10km - 20km)
    if (distance >= 10000 && distance < 20000) {
      // Option 1: Metro with first/last mile
      routes.push(this.createMetroWithAutoRoute(request, distance));
      
      // Option 2: Direct Cab (fastest but expensive)
      routes.push(this.createCabRoute(request, distance));
      
      // Option 3: Bus + Metro combination
      routes.push(this.createBusMetroBusRoute(request, distance));
      
      // Option 4: Metro + Bus
      routes.push(this.createMetroBusRoute(request, distance));
      
      return routes;
    }

    // SCENARIO 5: Very Long Distance (> 20km)
    if (distance >= 20000) {
      // Option 1: Cab (most practical)
      routes.push(this.createCabRoute(request, distance));
      
      // Option 2: Metro + Auto (economical)
      routes.push(this.createMetroWithAutoRoute(request, distance));
      
      // Option 3: Long distance bus
      routes.push(this.createBusRoute(request, distance));
      
      return routes;
    }

    return routes;
  }

  private createWalkOnlyRoute(request: RouteRequest, distance: number): MultimodalRoute {
    const segment = this.generateSingleModeRoute(request, 'walk');
    
    return {
      id: `route-walk-${Date.now()}`,
      type: 'cheapest',
      name: 'Walk',
      segments: [segment],
      totalDistance: distance,
      totalDuration: segment.duration,
      totalCost: 0,
      transferCount: 0,
      modesUsed: ['walk'],
      carbonFootprint: 'low',
      comfortLevel: distance < 1000 ? 'high' : 'medium',
      reliabilityScore: 100,
      description: 'Healthy and free option',
    };
  }

  private createAutoRoute(request: RouteRequest, distance: number): MultimodalRoute {
    const segment = this.generateSingleModeRoute(request, 'auto');
    
    return {
      id: `route-auto-${Date.now()}`,
      type: 'comfort',
      name: 'Auto-rickshaw',
      segments: [segment],
      totalDistance: distance,
      totalDuration: segment.duration,
      totalCost: segment.cost,
      transferCount: 0,
      modesUsed: ['auto'],
      carbonFootprint: 'medium',
      comfortLevel: 'medium',
      reliabilityScore: 70,
      description: 'Direct and convenient',
    };
  }

  private createCabRoute(request: RouteRequest, distance: number): MultimodalRoute {
    const segment = this.generateSingleModeRoute(request, 'cab');
    
    return {
      id: `route-cab-${Date.now()}`,
      type: 'fastest',
      name: 'Cab',
      segments: [segment],
      totalDistance: distance,
      totalDuration: segment.duration,
      totalCost: segment.cost,
      transferCount: 0,
      modesUsed: ['cab'],
      carbonFootprint: 'high',
      comfortLevel: 'high',
      reliabilityScore: 85,
      description: 'Fastest and most comfortable',
    };
  }

  private createBusRoute(request: RouteRequest, distance: number): MultimodalRoute {
    const segment = this.generateSingleModeRoute(request, 'bus');
    // Add typical bus wait time
    segment.waitTime = 5;
    segment.duration += 5;
    
    return {
      id: `route-bus-${Date.now()}`,
      type: 'cheapest',
      name: 'Bus',
      segments: [segment],
      totalDistance: distance,
      totalDuration: segment.duration,
      totalCost: segment.cost,
      transferCount: 0,
      modesUsed: ['bus'],
      carbonFootprint: 'low',
      comfortLevel: 'medium',
      reliabilityScore: 60,
      description: 'Most economical option',
    };
  }

  private createMetroRoute(request: RouteRequest, distance: number): MultimodalRoute {
    const segment = this.generateSingleModeRoute(request, 'metro');
    // Add typical metro wait time
    segment.waitTime = 4;
    segment.duration += 4;
    
    return {
      id: `route-metro-${Date.now()}`,
      type: 'fastest',
      name: 'Metro',
      segments: [segment],
      totalDistance: distance,
      totalDuration: segment.duration,
      totalCost: segment.cost,
      transferCount: 0,
      modesUsed: ['metro'],
      carbonFootprint: 'low',
      comfortLevel: 'high',
      reliabilityScore: 90,
      description: 'Fast and reliable',
    };
  }

  private createWalkMetroWalkRoute(request: RouteRequest, distance: number): MultimodalRoute {
    const segments: RouteSegment[] = [];
    
    // First mile walk (500m)
    const firstWalkDist = 500;
    const firstWalk = this.createWalkSegment(
      request.source,
      { ...request.source, name: 'Metro Station' },
      firstWalkDist,
      'Walk to nearest metro station'
    );
    segments.push(firstWalk);
    
    // Metro segment (main distance)
    const metroDistance = distance - 1000; // Minus first and last mile
    const metroSegment = this.createMetroSegment(metroDistance);
    segments.push(metroSegment);
    
    // Last mile walk (500m)
    const lastWalkDist = 500;
    const lastWalk = this.createWalkSegment(
      { ...request.destination, name: 'Metro Station' },
      request.destination,
      lastWalkDist,
      'Walk to destination'
    );
    segments.push(lastWalk);
    
    const totalDuration = segments.reduce((sum, seg) => sum + seg.duration, 0) + 3; // Transfer time
    const totalCost = segments.reduce((sum, seg) => sum + seg.cost, 0);
    
    return {
      id: `route-walk-metro-walk-${Date.now()}`,
      type: 'balanced',
      name: 'Metro + Walk',
      segments,
      totalDistance: distance,
      totalDuration: Math.round(totalDuration),
      totalCost: Math.round(totalCost),
      transferCount: 2,
      modesUsed: ['walk', 'metro'],
      carbonFootprint: 'low',
      comfortLevel: 'medium',
      reliabilityScore: 85,
      description: 'Balanced time and cost',
    };
  }

  private createMetroWithAutoRoute(request: RouteRequest, distance: number): MultimodalRoute {
    const segments: RouteSegment[] = [];
    
    // Auto to metro (2km)
    const autoToMetroDist = 2000;
    const autoToMetro = this.createAutoSegment(
      request.source,
      { ...request.source, name: 'Metro Station' },
      autoToMetroDist,
      'Auto to metro station'
    );
    segments.push(autoToMetro);
    
    // Metro segment (main distance)
    const metroDistance = distance - 4000; // Minus first and last mile
    const metroSegment = this.createMetroSegment(metroDistance);
    segments.push(metroSegment);
    
    // Auto from metro (2km)
    const autoFromMetroDist = 2000;
    const autoFromMetro = this.createAutoSegment(
      { ...request.destination, name: 'Metro Station' },
      request.destination,
      autoFromMetroDist,
      'Auto to destination'
    );
    segments.push(autoFromMetro);
    
    const totalDuration = segments.reduce((sum, seg) => sum + seg.duration, 0) + 5; // Transfer time
    const totalCost = segments.reduce((sum, seg) => sum + seg.cost, 0);
    
    return {
      id: `route-auto-metro-auto-${Date.now()}`,
      type: 'fastest',
      name: 'Auto + Metro + Auto',
      segments,
      totalDistance: distance,
      totalDuration: Math.round(totalDuration),
      totalCost: Math.round(totalCost),
      transferCount: 2,
      modesUsed: ['auto', 'metro'],
      carbonFootprint: 'medium',
      comfortLevel: 'high',
      reliabilityScore: 80,
      description: 'Fast with first/last mile comfort',
    };
  }

  private createBusMetroBusRoute(request: RouteRequest, distance: number): MultimodalRoute {
    const segments: RouteSegment[] = [];
    
    // Bus to metro
    const busToMetroDist = 2000;
    const busToMetro = this.createBusSegment(
      request.source,
      { ...request.source, name: 'Metro Station' },
      busToMetroDist,
      'Bus to metro station'
    );
    segments.push(busToMetro);
    
    // Metro segment
    const metroDistance = distance - 4000;
    const metroSegment = this.createMetroSegment(metroDistance);
    segments.push(metroSegment);
    
    // Bus from metro
    const busFromMetroDist = 2000;
    const busFromMetro = this.createBusSegment(
      { ...request.destination, name: 'Metro Station' },
      request.destination,
      busFromMetroDist,
      'Bus to destination'
    );
    segments.push(busFromMetro);
    
    const totalDuration = segments.reduce((sum, seg) => sum + seg.duration, 0) + 8; // Transfer + wait time
    const totalCost = segments.reduce((sum, seg) => sum + seg.cost, 0);
    
    return {
      id: `route-bus-metro-bus-${Date.now()}`,
      type: 'cheapest',
      name: 'Bus + Metro + Bus',
      segments,
      totalDistance: distance,
      totalDuration: Math.round(totalDuration),
      totalCost: Math.round(totalCost),
      transferCount: 2,
      modesUsed: ['bus', 'metro'],
      carbonFootprint: 'low',
      comfortLevel: 'medium',
      reliabilityScore: 70,
      description: 'Most economical for long distance',
    };
  }

  private createMetroBusRoute(request: RouteRequest, distance: number): MultimodalRoute {
    const segments: RouteSegment[] = [];
    
    // Metro segment (70% of distance)
    const metroDistance = distance * 0.7;
    const metroSegment = this.createMetroSegment(metroDistance);
    segments.push(metroSegment);
    
    // Bus segment (30% of distance)
    const busDistance = distance * 0.3;
    const busSegment = this.createBusSegment(
      { ...request.source, name: 'Metro Station' },
      request.destination,
      busDistance,
      'Bus to destination'
    );
    segments.push(busSegment);
    
    const totalDuration = segments.reduce((sum, seg) => sum + seg.duration, 0) + 5;
    const totalCost = segments.reduce((sum, seg) => sum + seg.cost, 0);
    
    return {
      id: `route-metro-bus-${Date.now()}`,
      type: 'balanced',
      name: 'Metro + Bus',
      segments,
      totalDistance: distance,
      totalDuration: Math.round(totalDuration),
      totalCost: Math.round(totalCost),
      transferCount: 1,
      modesUsed: ['metro', 'bus'],
      carbonFootprint: 'low',
      comfortLevel: 'medium',
      reliabilityScore: 75,
      description: 'Good balance of time and cost',
    };
  }

  private createWalkSegment(from: Location, to: Location, distance: number, instruction: string): RouteSegment {
    const { duration, cost } = this.calculateSegmentMetrics('walk', distance);
    return {
      id: `walk-${Date.now()}-${Math.random()}`,
      mode: 'walk',
      from,
      to,
      distance,
      duration: Math.round(duration),
      cost,
      instruction,
    };
  }

  private createAutoSegment(from: Location, to: Location, distance: number, instruction: string): RouteSegment {
    const { duration, cost } = this.calculateSegmentMetrics('auto', distance);
    return {
      id: `auto-${Date.now()}-${Math.random()}`,
      mode: 'auto',
      from,
      to,
      distance,
      duration: Math.round(duration),
      cost: Math.round(cost),
      instruction,
    };
  }

  private createBusSegment(from: Location, to: Location, distance: number, instruction: string): RouteSegment {
    const { duration, cost } = this.calculateSegmentMetrics('bus', distance);
    return {
      id: `bus-${Date.now()}-${Math.random()}`,
      mode: 'bus',
      from,
      to,
      distance,
      duration: Math.round(duration) + 5, // Add wait time
      cost: Math.round(cost),
      waitTime: 5,
      instruction,
    };
  }

  private createMetroSegment(distance: number): RouteSegment {
    const { duration, cost } = this.calculateSegmentMetrics('metro', distance);
    return {
      id: `metro-${Date.now()}-${Math.random()}`,
      mode: 'metro',
      from: { lat: 0, lng: 0, name: 'Metro Start' },
      to: { lat: 0, lng: 0, name: 'Metro End' },
      distance,
      duration: Math.round(duration) + 4, // Add wait time
      cost: Math.round(cost),
      waitTime: 4,
      instruction: 'Take metro',
      routeInfo: 'Metro Line',
    };
  }

  private scoreAndRankRoutes(
    routes: MultimodalRoute[],
    preferences?: RouteRequest['preferences']
  ): MultimodalRoute[] {
    // Default weights
    const weights: ScoringWeights = {
      time: 0.4,
      cost: 0.3,
      comfort: 0.2,
      reliability: 0.1,
    };

    // Adjust weights based on user preference
    if (preferences?.prioritize === 'time') {
      weights.time = 0.6;
      weights.cost = 0.2;
    } else if (preferences?.prioritize === 'cost') {
      weights.cost = 0.6;
      weights.time = 0.2;
    } else if (preferences?.prioritize === 'comfort') {
      weights.comfort = 0.5;
      weights.time = 0.3;
    }

    // Normalize and score each route
    const maxTime = Math.max(...routes.map((r) => r.totalDuration));
    const maxCost = Math.max(...routes.map((r) => r.totalCost));
    const maxTransfers = Math.max(...routes.map((r) => r.transferCount));

    routes.forEach((route) => {
      // Normalize metrics (0-1, where 1 is best)
      const timeScore = 1 - route.totalDuration / maxTime;
      const costScore = 1 - route.totalCost / (maxCost || 1);
      const comfortScore = 1 - route.transferCount / (maxTransfers || 1);
      const reliabilityScore = (route.reliabilityScore || 50) / 100;

      // Calculate weighted score
      route.score =
        timeScore * weights.time +
        costScore * weights.cost +
        comfortScore * weights.comfort +
        reliabilityScore * weights.reliability;
    });

    // Sort by score (highest first)
    return routes.sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  public async calculateRoutes(request: RouteRequest): Promise<RouteResponse> {
    const startTime = Date.now();

    try {
      const cityId = CityConfigurationManager.detectCityFromCoordinates(
        request.source.lat,
        request.source.lng
      );
      const cityContext = CityConfigurationManager.getCityContext(cityId);
      let routes = this.generateRouteOptions(request);
      routes = routes.filter((route) =>
        route.modesUsed.every((mode) =>
          CityConfigurationManager.isModeAvailableInCity(cityId, mode)
        )
      );
      if (request.context?.timeOfDay || request.context?.weatherCondition) {
        const weatherContext = request.context.weatherCondition
          ? ContextAwareDecisionEngine.analyzeWeatherContext(
              request.context.weatherCondition,
              35 // Default temperature
            )
          : undefined;

        routes = ContextAwareDecisionEngine.applyAllContexts(routes, {
          time: request.context.timeOfDay,
          city: cityContext,
          weather: weatherContext,
          user: {
            needsAccessibility: request.preferences?.accessibilityMode,
          },
        });
      }
      routes = RouteScoringEngine.applyConstraints(routes, request.preferences);
      const rankedRoutes = RouteScoringEngine.scoreAndRankRoutes(
        routes,
        request.preferences
      );
      RouteScoringEngine.assignRouteTypes(rankedRoutes);
      const topRoutes = rankedRoutes.slice(0, 4);

      const calculationTime = Date.now() - startTime;
      const cityRules = CityConfigurationManager.getCityRules(cityId);
      const warnings = cityRules.length > 0 ? cityRules : undefined;

      return {
        request,
        routes: topRoutes,
        calculatedAt: new Date(),
        calculationTime,
        warnings,
      };
    } catch (error) {
      const calculationTime = Date.now() - startTime;
      return {
        request,
        routes: [],
        calculatedAt: new Date(),
        calculationTime,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
      };
    }
  }

  public async getBestRoutes(request: RouteRequest): Promise<{
    fastest: MultimodalRoute;
    cheapest: MultimodalRoute;
    recommended: MultimodalRoute;
    comfort: MultimodalRoute;
    eco: MultimodalRoute;
  }> {
    const response = await this.calculateRoutes(request);
    
    if (response.routes.length === 0) {
      throw new Error('No routes available');
    }

    return RouteScoringEngine.selectTopRoutes(response.routes);
  }
  public getModeConfig(mode: TransportMode): ModeConfig | undefined {
    return this.modeConfigs.get(mode);
  }

  public updateModeConfig(mode: TransportMode, config: Partial<ModeConfig>): void {
    const existing = this.modeConfigs.get(mode);
    if (existing) {
      this.modeConfigs.set(mode, { ...existing, ...config });
    }
  }
}

// Export singleton instance
export const multimodalEngine = new MultimodalDecisionEngine();
