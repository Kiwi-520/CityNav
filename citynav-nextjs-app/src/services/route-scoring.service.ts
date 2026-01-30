import {
  MultimodalRoute,
  TransportMode,
  ScoringWeights,
  RouteRequest,
} from '../types/multimodal';

export interface ScoringMetrics {
  timeScore: number;
  costScore: number;
  comfortScore: number;
  reliabilityScore: number;
  sustainabilityScore: number;
}

export interface RankingResult {
  fastest: MultimodalRoute;
  cheapest: MultimodalRoute;
  recommended: MultimodalRoute;
  comfort: MultimodalRoute;
  eco: MultimodalRoute;
}

export class RouteScoringEngine {
  private static readonly DEFAULT_WEIGHTS: ScoringWeights = {
    time: 0.4,
    cost: 0.3,
    comfort: 0.2,
    reliability: 0.1,
  };

  private static readonly MODE_COMFORT: Record<TransportMode, number> = {
    walk: 0.6,
    bus: 0.5,
    metro: 0.8,
    auto: 0.6,
    cab: 0.9,
    bike: 0.7,
  };

  static calculateWeights(prioritize?: 'time' | 'cost' | 'comfort'): ScoringWeights {
    switch (prioritize) {
      case 'time':
        return { time: 0.6, cost: 0.2, comfort: 0.1, reliability: 0.1 };
      case 'cost':
        return { time: 0.2, cost: 0.6, comfort: 0.1, reliability: 0.1 };
      case 'comfort':
        return { time: 0.2, cost: 0.1, comfort: 0.5, reliability: 0.2 };
      default:
        return this.DEFAULT_WEIGHTS;
    }
  }

  static calculateMetrics(
    route: MultimodalRoute,
    allRoutes: MultimodalRoute[]
  ): ScoringMetrics {
    // Normalization ranges
    const maxTime = Math.max(...allRoutes.map((r) => r.totalDuration));
    const minTime = Math.min(...allRoutes.map((r) => r.totalDuration));
    const maxCost = Math.max(...allRoutes.map((r) => r.totalCost));
    const minCost = Math.min(...allRoutes.map((r) => r.totalCost));
    const maxTransfers = Math.max(...allRoutes.map((r) => r.transferCount));

    // Time score (0-1, where 1 is fastest)
    const timeScore = maxTime === minTime 
      ? 1 
      : 1 - (route.totalDuration - minTime) / (maxTime - minTime);

    // Cost score (0-1, where 1 is cheapest)
    const costScore = maxCost === minCost
      ? 1
      : 1 - (route.totalCost - minCost) / (maxCost - minCost);

    // Comfort score (combines transfers and mode comfort)
    const comfortScore = this.calculateComfortScore(route, maxTransfers);

    // Reliability score (0-1)
    const reliabilityScore = (route.reliabilityScore || 50) / 100;

    // Sustainability score (carbon footprint)
    const sustainabilityScore = this.calculateSustainabilityScore(route);

    return {
      timeScore,
      costScore,
      comfortScore,
      reliabilityScore,
      sustainabilityScore,
    };
  }

  private static calculateComfortScore(
    route: MultimodalRoute,
    maxTransfers: number
  ): number {
    // Transfer penalty (fewer is better)
    const transferScore = maxTransfers === 0 
      ? 1 
      : 1 - route.transferCount / maxTransfers;

    // Mode comfort (average of all modes used)
    const modeComfortScores = route.modesUsed.map(
      (mode) => this.MODE_COMFORT[mode] || 0.5
    );
    const avgModeComfort = modeComfortScores.length > 0
      ? modeComfortScores.reduce((sum, score) => sum + score, 0) / modeComfortScores.length
      : 0.5;

    // Walking penalty (long walks reduce comfort)
    let walkingPenalty = 0;
    route.segments.forEach((segment) => {
      if (segment.mode === 'walk' && segment.distance > 500) {
        walkingPenalty += 0.1 * (segment.distance / 1000); // Penalty per km walked
      }
    });

    const comfortScore = (transferScore * 0.4 + avgModeComfort * 0.6) - walkingPenalty;
    return Math.max(0, Math.min(1, comfortScore));
  }

  private static calculateSustainabilityScore(route: MultimodalRoute): number {
    const carbonMap: Record<'low' | 'medium' | 'high', number> = {
      low: 1.0,
      medium: 0.5,
      high: 0.2,
    };

    return carbonMap[route.carbonFootprint || 'medium'];
  }

  static calculateFinalScore(
    metrics: ScoringMetrics,
    weights: ScoringWeights
  ): number {
    return (
      metrics.timeScore * weights.time +
      metrics.costScore * weights.cost +
      metrics.comfortScore * weights.comfort +
      metrics.reliabilityScore * weights.reliability
    );
  }

  static scoreAndRankRoutes(
    routes: MultimodalRoute[],
    preferences?: RouteRequest['preferences']
  ): MultimodalRoute[] {
    if (routes.length === 0) return [];

    // Calculate weights based on preferences
    const weights = this.calculateWeights(preferences?.prioritize);

    // Calculate metrics and scores for each route
    routes.forEach((route) => {
      const metrics = this.calculateMetrics(route, routes);
      route.score = this.calculateFinalScore(metrics, weights);
    });

    // Sort by score (highest first)
    return routes.sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  static selectTopRoutes(routes: MultimodalRoute[]): RankingResult {
    if (routes.length === 0) {
      throw new Error('No routes available for selection');
    }

    // Fastest: minimum total duration
    const fastest = routes.reduce((min, route) =>
      route.totalDuration < min.totalDuration ? route : min
    );

    // Cheapest: minimum total cost
    const cheapest = routes.reduce((min, route) =>
      route.totalCost < min.totalCost ? route : min
    );

    // Recommended: highest score with balanced weights
    const balancedWeights = this.DEFAULT_WEIGHTS;
    const scoredRoutes = routes.map((route) => {
      const metrics = this.calculateMetrics(route, routes);
      return {
        route,
        score: this.calculateFinalScore(metrics, balancedWeights),
      };
    });
    const recommended = scoredRoutes.sort((a, b) => b.score - a.score)[0].route;

    // Comfort: best comfort score
    const comfort = routes.map((route) => {
      const metrics = this.calculateMetrics(route, routes);
      return { route, comfortScore: metrics.comfortScore };
    }).sort((a, b) => b.comfortScore - a.comfortScore)[0].route;

    // Eco-friendly: best sustainability score
    const eco = routes.map((route) => {
      const metrics = this.calculateMetrics(route, routes);
      return { route, ecoScore: metrics.sustainabilityScore };
    }).sort((a, b) => b.ecoScore - a.ecoScore)[0].route;

    return { fastest, cheapest, recommended, comfort, eco };
  }

  static applyTransferPenalty(
    baseScore: number,
    transferCount: number,
    context?: { isAccessibilityMode?: boolean; isPeakHour?: boolean }
  ): number {
    let penalty = transferCount * 0.05; // 5% penalty per transfer

    // Increased penalty for accessibility mode
    if (context?.isAccessibilityMode) {
      penalty *= 2;
    }

    // Increased penalty during peak hours
    if (context?.isPeakHour) {
      penalty *= 1.3;
    }

    return Math.max(0, baseScore - penalty);
  }

  static calculateWalkingEffort(
    route: MultimodalRoute,
    weatherCondition?: 'clear' | 'rain' | 'hot'
  ): number {
    let totalWalkingDistance = 0;
    route.segments.forEach((segment) => {
      if (segment.mode === 'walk') {
        totalWalkingDistance += segment.distance;
      }
    });

    // Base effort: 100m = 1 effort point
    let effortScore = totalWalkingDistance / 100;

    // Weather adjustments
    if (weatherCondition === 'hot' || weatherCondition === 'rain') {
      effortScore *= 1.5;
    }

    // Classify effort level
    if (effortScore < 5) return 0.9; // minimal
    if (effortScore < 15) return 0.7; // moderate
    if (effortScore < 30) return 0.4; // high
    return 0.1; // extreme
  }

  static adjustForContext(
    routes: MultimodalRoute[],
    context?: RouteRequest['context']
  ): MultimodalRoute[] {
    return routes.map((route) => {
      let adjustedScore = route.score || 0;

      // Weather adjustments
      if (context?.weatherCondition) {
        const walkingEffort = this.calculateWalkingEffort(route, context.weatherCondition);
        adjustedScore *= walkingEffort;
      }

      // Time-of-day adjustments
      if (context?.timeOfDay) {
        const hour = context.timeOfDay.getHours();
        const isPeakHour = (hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 21);

        if (isPeakHour) {
          // Prefer metro over road transport during peak hours
          if (route.modesUsed.includes('metro')) {
            adjustedScore *= 1.1;
          }
          if (route.modesUsed.includes('bus') || route.modesUsed.includes('auto')) {
            adjustedScore *= 0.9;
          }
        }
      }

      return { ...route, score: adjustedScore };
    });
  }

  static applyConstraints(
    routes: MultimodalRoute[],
    preferences?: RouteRequest['preferences']
  ): MultimodalRoute[] {
    let filteredRoutes = routes;

    // Filter by max cost
    if (preferences?.maxCost !== undefined) {
      filteredRoutes = filteredRoutes.filter(
        (route) => route.totalCost <= preferences.maxCost!
      );
    }

    // Filter by max transfers
    if (preferences?.maxTransfers !== undefined) {
      filteredRoutes = filteredRoutes.filter(
        (route) => route.transferCount <= preferences.maxTransfers!
      );
    }

    // Filter by avoided modes
    if (preferences?.avoidModes && preferences.avoidModes.length > 0) {
      filteredRoutes = filteredRoutes.filter((route) =>
        !route.modesUsed.some((mode) => preferences.avoidModes?.includes(mode))
      );
    }

    // Filter by max walking distance
    if (preferences?.maxWalkingDistance !== undefined) {
      filteredRoutes = filteredRoutes.filter((route) => {
        const totalWalkingDistance = route.segments
          .filter((seg) => seg.mode === 'walk')
          .reduce((sum, seg) => sum + seg.distance, 0);
        return totalWalkingDistance <= preferences.maxWalkingDistance!;
      });
    }

    // Prefer specific modes
    if (preferences?.preferModes && preferences.preferModes.length > 0) {
      filteredRoutes = filteredRoutes.map((route) => {
        const hasPreferredMode = route.modesUsed.some((mode) =>
          preferences.preferModes?.includes(mode)
        );
        if (hasPreferredMode) {
          route.score = (route.score || 0) * 1.2; // 20% boost
        }
        return route;
      });
    }

    return filteredRoutes;
  }

  static assignRouteTypes(routes: MultimodalRoute[]): void {
    if (routes.length === 0) return;

    const fastest = routes.reduce((min, r) => 
      r.totalDuration < min.totalDuration ? r : min
    );
    const cheapest = routes.reduce((min, r) =>
      r.totalCost < min.totalCost ? r : min
    );

    routes.forEach((route) => {
      if (route.id === fastest.id) {
        route.type = 'fastest';
      } else if (route.id === cheapest.id) {
        route.type = 'cheapest';
      } else if (route.transferCount === 0 && this.MODE_COMFORT[route.modesUsed[0]] >= 0.8) {
        route.type = 'comfort';
      } else {
        route.type = 'balanced';
      }
    });
  }
}
