import { ModeConfig, TransportMode } from '../types/multimodal';
import { CityContext } from './context-aware.service';

export interface CityProfile {
  id: string;
  name: string;
  state: string;
  context: CityContext;
  modeAdjustments: Partial<Record<TransportMode, Partial<ModeConfig>>>;
  specialRules?: {
    name: string;
    condition: string;
    effect: string;
  }[];
}

export class CityConfigurationManager {
  private static readonly CITY_PROFILES: Record<string, CityProfile> = {
    delhi: {
      id: 'delhi',
      name: 'New Delhi',
      state: 'Delhi',
      context: {
        cityId: 'delhi',
        hasMetro: true,
        metroOperational: true,
        busFrequency: 'high',
        autoAvailability: 'very_high',
        trafficLevel: 'extreme',
      },
      modeAdjustments: {
        bus: { averageSpeed: 12 }, // Very slow due to traffic
        auto: { averageSpeed: 20, baseFare: 25 },
        cab: { averageSpeed: 25, baseFare: 50 },
        metro: { averageSpeed: 35 },
      },
      specialRules: [
        {
          name: 'Odd-Even Rule',
          condition: 'During pollution emergencies',
          effect: 'Private cars restricted on alternate days',
        },
      ],
    },

    mumbai: {
      id: 'mumbai',
      name: 'Mumbai',
      state: 'Maharashtra',
      context: {
        cityId: 'mumbai',
        hasMetro: true,
        metroOperational: true,
        busFrequency: 'very_high', 
        autoAvailability: 'low',
        trafficLevel: 'extreme',
      },
      modeAdjustments: {
        bus: { averageSpeed: 15 },
        auto: { averageSpeed: 22, baseFare: 23, maxDistance: 0 },
        cab: { averageSpeed: 20, baseFare: 60, costPerKm: 22 },
        metro: { averageSpeed: 35 },
      },
      specialRules: [
        {
          name: 'Local Train Preference',
          condition: 'Long distance within city',
          effect: 'Local trains (suburban railway) preferred over metro',
        },
        {
          name: 'Limited Auto Zone',
          condition: 'South Mumbai',
          effect: 'Auto-rickshaws not available in many areas',
        },
      ],
    },

    bangalore: {
      id: 'bangalore',
      name: 'Bangalore',
      state: 'Karnataka',
      context: {
        cityId: 'bangalore',
        hasMetro: true,
        metroOperational: true,
        busFrequency: 'high',
        autoAvailability: 'very_high',
        trafficLevel: 'very_high',
      },
      modeAdjustments: {
        bus: { averageSpeed: 14 },
        auto: { averageSpeed: 18, baseFare: 30 },
        cab: { averageSpeed: 22, baseFare: 50 },
        metro: { averageSpeed: 35 },
      },
      specialRules: [
        {
          name: 'Tech Corridor Traffic',
          condition: 'ORR and Tech Parks',
          effect: 'Extreme traffic during peak hours (8-11 AM, 5-9 PM)',
        },
      ],
    },

    hyderabad: {
      id: 'hyderabad',
      name: 'Hyderabad',
      state: 'Telangana',
      context: {
        cityId: 'hyderabad',
        hasMetro: true,
        metroOperational: true,
        busFrequency: 'medium',
        autoAvailability: 'high',
        trafficLevel: 'high',
      },
      modeAdjustments: {
        bus: { averageSpeed: 16 },
        auto: { averageSpeed: 24, baseFare: 25 },
        cab: { averageSpeed: 28, baseFare: 45 },
        metro: { averageSpeed: 35 },
      },
    },

    chennai: {
      id: 'chennai',
      name: 'Chennai',
      state: 'Tamil Nadu',
      context: {
        cityId: 'chennai',
        hasMetro: true,
        metroOperational: true,
        busFrequency: 'very_high',
        autoAvailability: 'very_high',
        trafficLevel: 'high',
      },
      modeAdjustments: {
        bus: { averageSpeed: 15 },
        auto: { averageSpeed: 22, baseFare: 25 },
        cab: { averageSpeed: 26, baseFare: 50 },
        metro: { averageSpeed: 35 },
      },
      specialRules: [
        {
          name: 'Suburban Train Network',
          condition: 'Long distance travel',
          effect: 'Well-connected suburban train network available',
        },
      ],
    },

    kolkata: {
      id: 'kolkata',
      name: 'Kolkata',
      state: 'West Bengal',
      context: {
        cityId: 'kolkata',
        hasMetro: true,
        metroOperational: true,
        busFrequency: 'high',
        autoAvailability: 'low', // Kolkata has yellow taxis instead
        trafficLevel: 'high',
      },
      modeAdjustments: {
        bus: { averageSpeed: 14 },
        auto: { averageSpeed: 20, baseFare: 25, maxDistance: 0 }, // Limited
        cab: { averageSpeed: 24, baseFare: 40 }, // Yellow taxis common
        metro: { averageSpeed: 35 },
      },
      specialRules: [
        {
          name: 'Yellow Taxi Culture',
          condition: 'All areas',
          effect: 'Yellow cabs (taxis) preferred over auto-rickshaws',
        },
      ],
    },

    pune: {
      id: 'pune',
      name: 'Pune',
      state: 'Maharashtra',
      context: {
        cityId: 'pune',
        hasMetro: false, // Under construction
        metroOperational: false,
        busFrequency: 'medium',
        autoAvailability: 'very_high',
        trafficLevel: 'high',
      },
      modeAdjustments: {
        bus: { averageSpeed: 16 },
        auto: { averageSpeed: 24, baseFare: 23 },
        cab: { averageSpeed: 28, baseFare: 45 },
      },
    },

    ahmedabad: {
      id: 'ahmedabad',
      name: 'Ahmedabad',
      state: 'Gujarat',
      context: {
        cityId: 'ahmedabad',
        hasMetro: true,
        metroOperational: true,
        busFrequency: 'high',
        autoAvailability: 'high',
        trafficLevel: 'medium',
      },
      modeAdjustments: {
        bus: { averageSpeed: 18 }, // BRTS system
        auto: { averageSpeed: 25, baseFare: 20 },
        cab: { averageSpeed: 30, baseFare: 40 },
        metro: { averageSpeed: 35 },
      },
      specialRules: [
        {
          name: 'BRTS Corridor',
          condition: 'Major routes',
          effect: 'Bus Rapid Transit System provides fast bus service',
        },
      ],
    },
  };

  static getCityProfile(cityId: string): CityProfile | undefined {
    return this.CITY_PROFILES[cityId.toLowerCase()];
  }

  static getAllCities(): CityProfile[] {
    return Object.values(this.CITY_PROFILES);
  }

  static getCityContext(cityId: string): CityContext {
    const profile = this.getCityProfile(cityId);
    if (!profile) {
      // Return default context for unknown cities
      return {
        cityId,
        hasMetro: false,
        metroOperational: false,
        busFrequency: 'medium',
        autoAvailability: 'high',
        trafficLevel: 'medium',
      };
    }
    return profile.context;
  }

  static applyModeAdjustments(
    cityId: string,
    mode: TransportMode,
    baseConfig: ModeConfig
  ): ModeConfig {
    const profile = this.getCityProfile(cityId);
    if (!profile || !profile.modeAdjustments[mode]) {
      return baseConfig;
    }

    return {
      ...baseConfig,
      ...profile.modeAdjustments[mode],
    };
  }

  static isModeAvailableInCity(cityId: string, mode: TransportMode): boolean {
    const profile = this.getCityProfile(cityId);
    if (!profile) return true; // Assume available if city unknown

    // Check specific restrictions
    if (mode === 'metro' && !profile.context.hasMetro) {
      return false;
    }

    if (mode === 'auto') {
      return profile.context.autoAvailability !== 'low';
    }

    // Check mode adjustments for maxDistance = 0 (disabled)
    if (profile.modeAdjustments[mode]?.maxDistance === 0) {
      return false;
    }

    return true;
  }

  static getCityRules(cityId: string): string[] {
    const profile = this.getCityProfile(cityId);
    if (!profile || !profile.specialRules) {
      return [];
    }

    return profile.specialRules.map(
      (rule) => `${rule.name}: ${rule.effect}`
    );
  }

  static detectCityFromCoordinates(lat: number, lng: number): string {

    const cityBounds: Record<string, { lat: [number, number]; lng: [number, number] }> = {
      delhi: { lat: [28.4, 28.9], lng: [76.8, 77.5] },
      mumbai: { lat: [18.9, 19.3], lng: [72.7, 73.1] },
      bangalore: { lat: [12.8, 13.2], lng: [77.4, 77.8] },
      hyderabad: { lat: [17.3, 17.6], lng: [78.3, 78.7] },
      chennai: { lat: [12.9, 13.3], lng: [80.1, 80.4] },
      kolkata: { lat: [22.4, 22.7], lng: [88.2, 88.5] },
      pune: { lat: [18.4, 18.7], lng: [73.7, 74.0] },
      ahmedabad: { lat: [22.9, 23.2], lng: [72.4, 72.8] },
    };

    for (const [cityId, bounds] of Object.entries(cityBounds)) {
      if (
        lat >= bounds.lat[0] &&
        lat <= bounds.lat[1] &&
        lng >= bounds.lng[0] &&
        lng <= bounds.lng[1]
      ) {
        return cityId;
      }
    }

    return 'unknown';
  }
}

export class ModeConfigConstants {
  static getDefaultModeConfig(mode: TransportMode): ModeConfig {
    const configs: Record<TransportMode, ModeConfig> = {
      walk: {
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
      bus: {
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
      metro: {
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
      auto: {
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
      cab: {
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
      bike: {
        mode: 'bike',
        averageSpeed: 12,
        baseFare: 0,
        comfortScore: 7,
        reliabilityScore: 10,
        carbonEmission: 0,
        icon: '🚲',
        color: '#10b981',
        displayName: 'Bike',
        maxDistance: 5000,
      },
    };

    return configs[mode];
  }

  static getAllDefaultModeConfigs(): ModeConfig[] {
    const modes: TransportMode[] = ['walk', 'bus', 'metro', 'auto', 'cab', 'bike'];
    return modes.map((mode) => this.getDefaultModeConfig(mode));
  }
}
