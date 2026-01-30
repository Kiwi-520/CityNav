import { Location, TransportMode, RouteSegment, ModeConfig } from '../types/multimodal';

export interface SegmentationRules {
  ULTRA_SHORT: { max: number; modes: TransportMode[] };
  SHORT: { min: number; max: number; modes: TransportMode[] };
  MEDIUM: { min: number; max: number; modes: TransportMode[] };
  LONG: { min: number; max: number; modes: TransportMode[] };
  VERY_LONG: { min: number; modes: TransportMode[] };
}

export interface TransferPoint {
  location: Location;
  type: 'metro_station' | 'bus_stop' | 'virtual';
  estimatedWaitTime: number;
  transferDuration: number;
}

export class JourneySegmentationEngine {
  // Distance-based thresholds (in meters)
  private static readonly THRESHOLDS = {
    ULTRA_SHORT: 500,
    SHORT: 2000,
    MEDIUM: 10000,
    LONG: 20000,
  };

  // First/last mile configurations
  private static readonly FIRST_LAST_MILE = {
    WALK_PREFERRED: 500,        // Walk if < 500m
    WALK_ACCEPTABLE: 1000,      // Walk acceptable up to 1km
    AUTO_SHORT: 2000,           // Auto for 2km first/last mile
    BUS_SHORT: 3000,            // Bus for 3km first/last mile
  };

  static determineStrategy(distance: number): string {
    if (distance < this.THRESHOLDS.ULTRA_SHORT) return 'ULTRA_SHORT';
    if (distance < this.THRESHOLDS.SHORT) return 'SHORT';
    if (distance < this.THRESHOLDS.MEDIUM) return 'MEDIUM';
    if (distance < this.THRESHOLDS.LONG) return 'LONG';
    return 'VERY_LONG';
  }

  static calculateFirstMile(
    source: Location,
    totalDistance: number,
    preferredModes: TransportMode[] = []
  ): {
    mode: TransportMode;
    distance: number;
    transferPoint: TransferPoint;
  } {
    // Very short journeys: no first mile needed
    if (totalDistance < this.THRESHOLDS.SHORT) {
      return {
        mode: 'walk',
        distance: 0,
        transferPoint: {
          location: source,
          type: 'virtual',
          estimatedWaitTime: 0,
          transferDuration: 0,
        },
      };
    }

    // Walking preference
    if (!preferredModes.includes('walk') || preferredModes.length === 0) {
      if (totalDistance < this.THRESHOLDS.MEDIUM) {
        // Medium distance: comfortable walk to metro/bus
        return {
          mode: 'walk',
          distance: this.FIRST_LAST_MILE.WALK_PREFERRED,
          transferPoint: this.estimateTransferPoint(source, 'walk', 500),
        };
      } else {
        // Long distance: auto to metro for convenience
        return {
          mode: 'auto',
          distance: this.FIRST_LAST_MILE.AUTO_SHORT,
          transferPoint: this.estimateTransferPoint(source, 'auto', 2000),
        };
      }
    }

    // User prefers specific modes
    if (preferredModes.includes('auto')) {
      return {
        mode: 'auto',
        distance: this.FIRST_LAST_MILE.AUTO_SHORT,
        transferPoint: this.estimateTransferPoint(source, 'auto', 2000),
      };
    }

    if (preferredModes.includes('bus')) {
      return {
        mode: 'bus',
        distance: this.FIRST_LAST_MILE.BUS_SHORT,
        transferPoint: this.estimateTransferPoint(source, 'bus', 3000),
      };
    }

    // Default: walk
    return {
      mode: 'walk',
      distance: this.FIRST_LAST_MILE.WALK_PREFERRED,
      transferPoint: this.estimateTransferPoint(source, 'walk', 500),
    };
  }

  static calculateLastMile(
    destination: Location,
    totalDistance: number,
    availableBudget: number = Infinity
  ): {
    mode: TransportMode;
    distance: number;
    transferPoint: TransferPoint;
  } {
    // Budget-conscious: prefer walking
    if (availableBudget < 100) {
      return {
        mode: 'walk',
        distance: this.FIRST_LAST_MILE.WALK_ACCEPTABLE,
        transferPoint: this.estimateTransferPoint(destination, 'walk', 1000),
      };
    }

    // Long journey: comfortable last mile
    if (totalDistance > this.THRESHOLDS.LONG) {
      return {
        mode: 'auto',
        distance: this.FIRST_LAST_MILE.AUTO_SHORT,
        transferPoint: this.estimateTransferPoint(destination, 'auto', 2000),
      };
    }

    // Medium journey: walk acceptable
    return {
      mode: 'walk',
      distance: this.FIRST_LAST_MILE.WALK_PREFERRED,
      transferPoint: this.estimateTransferPoint(destination, 'walk', 500),
    };
  }

  private static estimateTransferPoint(
    origin: Location,
    modeToTransferPoint: TransportMode,
    distance: number
  ): TransferPoint {
    const bearing = 45; // Simplified: assume northeast direction
    const R = 6371e3; // Earth radius in meters
    const d = distance;
    
    const lat1 = origin.lat * Math.PI / 180;
    const lng1 = origin.lng * Math.PI / 180;
    const brng = bearing * Math.PI / 180;
    
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(d / R) +
      Math.cos(lat1) * Math.sin(d / R) * Math.cos(brng)
    );
    
    const lng2 = lng1 + Math.atan2(
      Math.sin(brng) * Math.sin(d / R) * Math.cos(lat1),
      Math.cos(d / R) - Math.sin(lat1) * Math.sin(lat2)
    );

    return {
      location: {
        lat: lat2 * 180 / Math.PI,
        lng: lng2 * 180 / Math.PI,
        name: 'Transfer Point',
      },
      type: modeToTransferPoint === 'walk' ? 'bus_stop' : 'metro_station',
      estimatedWaitTime: this.estimateWaitTime(modeToTransferPoint),
      transferDuration: this.estimateTransferDuration(modeToTransferPoint),
    };
  }
  private static estimateWaitTime(mode: TransportMode): number {
    const waitTimes: Record<TransportMode, number> = {
      walk: 0,
      bus: 5,
      metro: 4,
      auto: 2,
      cab: 3,
      bike: 0,
    };
    return waitTimes[mode] || 0;
  }
  private static estimateTransferDuration(fromMode: TransportMode): number {
    // Time to get off one mode and board another
    const transferDurations: Record<TransportMode, number> = {
      walk: 1,
      bus: 3,
      metro: 4, // Includes walking to platform
      auto: 2,
      cab: 2,
      bike: 1,
    };
    return transferDurations[fromMode] || 3;
  }

  static allocateDistances(
    totalDistance: number,
    segmentCount: 1 | 2 | 3
  ): number[] {
    if (segmentCount === 1) {
      return [totalDistance];
    }

    if (segmentCount === 2) {
      // First mile: 15%, Main: 85%
      return [
        totalDistance * 0.15,
        totalDistance * 0.85,
      ];
    }

    if (segmentCount === 3) {
      // First mile: 15%, Main: 70%, Last mile: 15%
      return [
        totalDistance * 0.15,
        totalDistance * 0.70,
        totalDistance * 0.15,
      ];
    }

    return [totalDistance];
  }

  static determinePrimaryMode(
    distance: number,
    cityHasMetro: boolean = true,
    userPreferences?: TransportMode[]
  ): TransportMode {
    // Very long: cab most practical
    if (distance > this.THRESHOLDS.LONG * 2) {
      return 'cab';
    }

    // Long with metro: prefer metro
    if (distance > this.THRESHOLDS.MEDIUM && cityHasMetro) {
      return 'metro';
    }

    // Long without metro: bus or cab
    if (distance > this.THRESHOLDS.MEDIUM) {
      return userPreferences?.includes('cab') ? 'cab' : 'bus';
    }

    // Medium: auto or bus
    if (distance > this.THRESHOLDS.SHORT) {
      return 'auto';
    }

    // Short: walk
    return 'walk';
  }

  static canCombineModes(mode1: TransportMode, mode2: TransportMode): boolean {
    // Compatibility matrix
    const incompatible = new Set([
      'cab-bus',
      'bus-auto',
      'auto-bus',
      'cab-metro',
      'cab-auto',
      'cab-walk',
    ]);

    const combo1 = `${mode1}-${mode2}`;
    const combo2 = `${mode2}-${mode1}`;

    return !incompatible.has(combo1) && !incompatible.has(combo2);
  }

  static isSegmentFeasible(
    mode: TransportMode,
    distance: number,
    modeConfig?: ModeConfig
  ): boolean {
    if (!modeConfig) return true;

    // Check distance constraints
    if (modeConfig.minDistance && distance < modeConfig.minDistance) {
      return false;
    }

    if (modeConfig.maxDistance && distance > modeConfig.maxDistance) {
      return false;
    }

    return true;
  }
}
