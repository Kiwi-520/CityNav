import { MultimodalRoute, RouteSegment, TransportMode } from '../types/multimodal';

export interface TimeContext {
  hour: number;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  isWeekend: boolean;
  isPeakHour: boolean;
  isNightTime: boolean;
}

export interface TrafficContext {
  level: 'low' | 'medium' | 'high' | 'extreme';
  multiplier: number;
  affectedModes: TransportMode[];
}

export interface WeatherContext {
  condition: 'clear' | 'rain' | 'hot' | 'storm';
  temperature: number;
  rainfall: number;
  impactLevel: 'low' | 'medium' | 'high';
}

export interface CityContext {
  cityId: string;
  hasMetro: boolean;
  metroOperational: boolean;
  busFrequency: 'low' | 'medium' | 'high' | 'very_high';
  autoAvailability: 'low' | 'medium' | 'high' | 'very_high';
  trafficLevel: 'low' | 'medium' | 'high' | 'very_high' | 'extreme';
}

export interface UserContext {
  age?: number;
  needsAccessibility?: boolean;
  carryingLuggage?: boolean;
  travelingWithChildren?: boolean;
  fitnessLevel?: 'low' | 'medium' | 'high';
  budgetLevel?: 'low' | 'medium' | 'high';
}

export class ContextAwareDecisionEngine {
  static analyzeTimeContext(date: Date): TimeContext {
    const hour = date.getHours();
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Peak hours: 7-10 AM and 5-9 PM on weekdays
    const isMorningPeak = hour >= 7 && hour <= 10 && !isWeekend;
    const isEveningPeak = hour >= 17 && hour <= 21 && !isWeekend;
    const isPeakHour = isMorningPeak || isEveningPeak;

    // Night time: 10 PM - 6 AM
    const isNightTime = hour >= 22 || hour <= 6;

    return {
      hour,
      dayOfWeek,
      isWeekend,
      isPeakHour,
      isNightTime,
    };
  }

  static determineTrafficContext(
    timeContext: TimeContext,
    cityContext: CityContext
  ): TrafficContext {
    let level: TrafficContext['level'] = 'medium';
    let multiplier = 1.0;

    // Peak hour traffic
    if (timeContext.isPeakHour) {
      if (cityContext.trafficLevel === 'extreme') {
        level = 'extreme';
        multiplier = 2.0; // 100% slower
      } else if (cityContext.trafficLevel === 'very_high') {
        level = 'high';
        multiplier = 1.7;
      } else {
        level = 'high';
        multiplier = 1.5;
      }
    }
    // Night time - light traffic
    else if (timeContext.isNightTime) {
      level = 'low';
      multiplier = 0.7; // 30% faster
    }
    // Weekend - moderate traffic
    else if (timeContext.isWeekend) {
      level = 'medium';
      multiplier = 1.2;
    }
    // Off-peak weekday
    else {
      level = 'medium';
      multiplier = 1.0;
    }

    // Affected modes (road-based transport)
    const affectedModes: TransportMode[] = ['bus', 'auto', 'cab'];

    return { level, multiplier, affectedModes };
  }

  static analyzeWeatherContext(
    condition: 'clear' | 'rain' | 'hot' | 'storm',
    temperature?: number
  ): WeatherContext {
    let impactLevel: WeatherContext['impactLevel'] = 'low';
    let rainfall = 0;

    switch (condition) {
      case 'storm':
        impactLevel = 'high';
        rainfall = 50; // mm/hour
        break;
      case 'rain':
        impactLevel = 'medium';
        rainfall = 10;
        break;
      case 'hot':
        impactLevel = temperature && temperature > 40 ? 'high' : 'medium';
        break;
      case 'clear':
        impactLevel = 'low';
        break;
    }

    return {
      condition,
      temperature: temperature || 25,
      rainfall,
      impactLevel,
    };
  }

  static adjustForTraffic(
    route: MultimodalRoute,
    trafficContext: TrafficContext
  ): MultimodalRoute {
    const adjustedRoute = { ...route };
    adjustedRoute.segments = route.segments.map((segment) => {
      if (trafficContext.affectedModes.includes(segment.mode)) {
        return {
          ...segment,
          duration: Math.round(segment.duration * trafficContext.multiplier),
        };
      }
      return segment;
    });

    // Recalculate total duration
    adjustedRoute.totalDuration = adjustedRoute.segments.reduce(
      (sum, seg) => sum + seg.duration + (seg.waitTime || 0),
      0
    );

    // Add traffic warning
    if (trafficContext.level === 'high' || trafficContext.level === 'extreme') {
      adjustedRoute.warnings = [
        ...(adjustedRoute.warnings || []),
        `Heavy traffic expected. Journey time may increase by ${Math.round((trafficContext.multiplier - 1) * 100)}%.`,
      ];
    }

    return adjustedRoute;
  }

  static adjustForWeather(
    route: MultimodalRoute,
    weatherContext: WeatherContext
  ): MultimodalRoute {
    const adjustedRoute = { ...route };
    let weatherWarning: string | null = null;

    // Rain impact
    if (weatherContext.condition === 'rain' || weatherContext.condition === 'storm') {
      adjustedRoute.segments = route.segments.map((segment) => {
        // Walking becomes slower and less comfortable in rain
        if (segment.mode === 'walk') {
          return {
            ...segment,
            duration: Math.round(segment.duration * 1.3),
          };
        }
        // Road transport slower in rain
        if (segment.mode === 'bus' || segment.mode === 'auto' || segment.mode === 'cab') {
          return {
            ...segment,
            duration: Math.round(segment.duration * 1.2),
          };
        }
        return segment;
      });

      weatherWarning = weatherContext.condition === 'storm'
        ? 'Heavy rain/storm. Consider delaying travel or choosing covered transport.'
        : 'Light rain expected. Carry an umbrella.';

      // Reduce comfort level for routes with walking
      if (route.modesUsed.includes('walk')) {
        adjustedRoute.comfortLevel = 'low';
      }
    }

    // Hot weather impact
    if (weatherContext.condition === 'hot') {
      adjustedRoute.segments = route.segments.map((segment) => {
        // Walking much slower in heat
        if (segment.mode === 'walk' && segment.distance > 500) {
          return {
            ...segment,
            duration: Math.round(segment.duration * 1.4),
          };
        }
        return segment;
      });

      if (weatherContext.temperature > 40) {
        weatherWarning = 'Extreme heat. Minimize walking and stay hydrated.';
        if (route.modesUsed.includes('walk')) {
          adjustedRoute.comfortLevel = 'low';
        }
      }
    }

    // Recalculate total duration
    adjustedRoute.totalDuration = adjustedRoute.segments.reduce(
      (sum, seg) => sum + seg.duration + (seg.waitTime || 0),
      0
    );

    // Add weather warning
    if (weatherWarning) {
      adjustedRoute.warnings = [...(adjustedRoute.warnings || []), weatherWarning];
    }

    return adjustedRoute;
  }

  static adjustForUserContext(
    route: MultimodalRoute,
    userContext: UserContext
  ): MultimodalRoute {
    const adjustedRoute = { ...route };
    let adjustmentFactor = 1.0;
    const warnings: string[] = [];

    // Accessibility needs
    if (userContext.needsAccessibility) {
      // Heavily penalize routes with many transfers
      if (route.transferCount > 1) {
        adjustmentFactor *= 0.5;
        warnings.push('Route involves multiple transfers. May be challenging with accessibility needs.');
      }

      // Prefer accessible modes
      if (!route.modesUsed.includes('metro') && !route.modesUsed.includes('cab')) {
        adjustmentFactor *= 0.8;
      }
    }

    // Carrying luggage
    if (userContext.carryingLuggage) {
      // Penalize walking and transfers
      if (route.modesUsed.includes('walk')) {
        const walkingDistance = route.segments
          .filter((s) => s.mode === 'walk')
          .reduce((sum, s) => sum + s.distance, 0);
        if (walkingDistance > 500) {
          adjustmentFactor *= 0.7;
          warnings.push('Involves significant walking with luggage. Consider cab or auto.');
        }
      }

      if (route.transferCount > 0) {
        adjustmentFactor *= 0.8;
      }
    }

    // Traveling with children
    if (userContext.travelingWithChildren) {
      // Prefer single-mode, comfortable routes
      if (route.transferCount === 0) {
        adjustmentFactor *= 1.2;
      } else {
        adjustmentFactor *= 0.7;
      }

      // Prefer comfortable modes
      if (route.modesUsed.includes('cab') || route.modesUsed.includes('metro')) {
        adjustmentFactor *= 1.1;
      }
    }

    // Fitness level
    if (userContext.fitnessLevel === 'low') {
      const walkingDistance = route.segments
        .filter((s) => s.mode === 'walk')
        .reduce((sum, s) => sum + s.distance, 0);

      if (walkingDistance > 500) {
        adjustmentFactor *= 0.6;
        warnings.push('Route involves walking. May be tiring for low fitness levels.');
      }
    }

    // Budget constraints
    if (userContext.budgetLevel === 'low') {
      if (route.totalCost > 100) {
        adjustmentFactor *= 0.7;
        warnings.push('Route may be expensive for budget travelers.');
      } else if (route.totalCost < 50) {
        adjustmentFactor *= 1.2; // Boost economical routes
      }
    }

    // Apply adjustment to score
    adjustedRoute.score = (adjustedRoute.score || 0) * adjustmentFactor;

    // Add warnings
    if (warnings.length > 0) {
      adjustedRoute.warnings = [...(adjustedRoute.warnings || []), ...warnings];
    }

    return adjustedRoute;
  }

  static isModeAvailable(
    mode: TransportMode,
    timeContext: TimeContext,
    cityContext: CityContext
  ): { available: boolean; reason?: string } {
    // Metro operating hours (typically 6 AM - 11 PM)
    if (mode === 'metro') {
      if (!cityContext.metroOperational) {
        return { available: false, reason: 'Metro not operational in this city' };
      }
      if (timeContext.hour < 6 || timeContext.hour >= 23) {
        return { available: false, reason: 'Metro closed (operates 6 AM - 11 PM)' };
      }
    }

    // Bus service (reduced at night and early morning)
    if (mode === 'bus') {
      if (timeContext.isNightTime && cityContext.busFrequency !== 'very_high') {
        return { available: false, reason: 'Limited bus service at this time' };
      }
    }

    // Auto availability varies by city
    if (mode === 'auto') {
      if (cityContext.autoAvailability === 'low') {
        return { available: false, reason: 'Auto-rickshaws limited in this area' };
      }
    }

    return { available: true };
  }

  static adjustWaitTimes(
    route: MultimodalRoute,
    timeContext: TimeContext
  ): MultimodalRoute {
    const adjustedRoute = { ...route };

    adjustedRoute.segments = route.segments.map((segment) => {
      let waitTime = segment.waitTime || 0;

      // Peak hour: reduced wait times (higher frequency)
      if (timeContext.isPeakHour) {
        if (segment.mode === 'metro') {
          waitTime = 3; // Every 3 minutes
        } else if (segment.mode === 'bus') {
          waitTime = 7; // Every 7 minutes
        }
      }
      // Off-peak: increased wait times
      else if (timeContext.isNightTime) {
        if (segment.mode === 'bus') {
          waitTime = 15; // Every 15 minutes
        }
      }
      // Weekend: slightly increased wait times
      else if (timeContext.isWeekend) {
        if (segment.mode === 'bus') {
          waitTime = 8;
        }
      }

      return { ...segment, waitTime };
    });

    // Recalculate total duration
    adjustedRoute.totalDuration = adjustedRoute.segments.reduce(
      (sum, seg) => sum + seg.duration + (seg.waitTime || 0),
      0
    );

    return adjustedRoute;
  }

  static applyAllContexts(
    routes: MultimodalRoute[],
    contexts: {
      time?: Date;
      city: CityContext;
      weather?: WeatherContext;
      user?: UserContext;
    }
  ): MultimodalRoute[] {
    let adjustedRoutes = routes;

    // Analyze time context
    const timeContext = contexts.time
      ? this.analyzeTimeContext(contexts.time)
      : {
          hour: 12,
          dayOfWeek: 3,
          isWeekend: false,
          isPeakHour: false,
          isNightTime: false,
        };

    // Determine traffic context
    const trafficContext = this.determineTrafficContext(timeContext, contexts.city);

    // Apply traffic adjustments
    adjustedRoutes = adjustedRoutes.map((route) =>
      this.adjustForTraffic(route, trafficContext)
    );

    // Apply weather adjustments
    if (contexts.weather) {
      adjustedRoutes = adjustedRoutes.map((route) =>
        this.adjustForWeather(route, contexts.weather!)
      );
    }

    // Apply user context adjustments
    if (contexts.user) {
      adjustedRoutes = adjustedRoutes.map((route) =>
        this.adjustForUserContext(route, contexts.user!)
      );
    }

    // Adjust wait times
    adjustedRoutes = adjustedRoutes.map((route) =>
      this.adjustWaitTimes(route, timeContext)
    );

    // Filter unavailable modes
    adjustedRoutes = adjustedRoutes.filter((route) => {
      const allModesAvailable = route.modesUsed.every((mode) => {
        const availability = this.isModeAvailable(mode, timeContext, contexts.city);
        if (!availability.available) {
          route.warnings = [
            ...(route.warnings || []),
            `${mode}: ${availability.reason}`,
          ];
        }
        return availability.available;
      });
      return allModesAvailable;
    });

    return adjustedRoutes;
  }
}
