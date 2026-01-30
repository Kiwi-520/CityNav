export type TransportMode = 
  | 'walk'      // Walking
  | 'bus'       // City Bus / BRT
  | 'metro'     // Metro / Local Train
  | 'auto'      // Auto-rickshaw
  | 'cab'       // Taxi / Cab
  | 'bike';     // Personal bike / bike-sharing (future)

export interface Location {
  lat: number;
  lng: number;
  name?: string;
  address?: string;
}

export interface RouteSegment {
  id: string;
  mode: TransportMode;
  
  // Start and end points of this segment
  from: Location;
  to: Location;
  
  // Segment metrics
  distance: number;        // in meters
  duration: number;        // in minutes
  cost: number;           // in rupees (INR)
  
  // Mode-specific information
  routeInfo?: string;     // e.g., "Metro Blue Line" or "Bus 405"
  routeNumber?: string;   // e.g., "405" for bus, "Blue Line" for metro
  stops?: string[];       // Intermediate stops (for bus/metro)
  stopCount?: number;     // Number of stops
  
  // Navigation instructions
  instruction: string;    // Human-readable instruction
  
  // Transfer information
  waitTime?: number;      // Wait time at start (for bus/metro) in minutes
  transferTime?: number;  // Time needed if transferring from previous segment
}
export interface MultimodalRoute {
  id: string;
  type: 'fastest' | 'cheapest' | 'balanced' | 'comfort';
  name: string;           // e.g., "Fastest Route" or "Most Economical"
  
  // Complete journey segments in order
  segments: RouteSegment[];
  
  // Aggregated metrics
  totalDistance: number;  // in meters
  totalDuration: number;  // in minutes
  totalCost: number;      // in rupees (INR)
  
  // Number of transfers between modes
  transferCount: number;
  
  // Route characteristics
  modesUsed: TransportMode[];  // Unique modes in this route
  
  // Reliability and other factors
  reliabilityScore?: number;   // 0-100, based on historical data
  carbonFootprint?: 'low' | 'medium' | 'high';
  comfortLevel?: 'low' | 'medium' | 'high';
  
  // Additional metadata
  description: string;    // Brief description
  warnings?: string[];    // e.g., "Heavy traffic expected", "Last metro at 11 PM"
  
  // Scoring (used internally for ranking)
  score?: number;
}
export interface RouteRequest {
  source: Location;
  destination: Location;
  
  // User preferences (optional)
  preferences?: {
    prioritize?: 'time' | 'cost' | 'comfort';  // What to optimize for
    avoidModes?: TransportMode[];              // Modes to avoid
    preferModes?: TransportMode[];             // Preferred modes
    maxWalkingDistance?: number;               // in meters (default: 1000m)
    maxCost?: number;                          // Budget constraint in INR
    maxTransfers?: number;                     // Limit on number of transfers
    accessibilityMode?: boolean;               // Wheelchair accessible routes only
  };
  
  // Context (optional)
  context?: {
    timeOfDay?: Date;                          // For time-based traffic estimates
    isWeekend?: boolean;
    weatherCondition?: 'clear' | 'rain' | 'hot';
  };
}

export interface RouteResponse {
  request: RouteRequest;
  routes: MultimodalRoute[];
  
  // Metadata
  calculatedAt: Date;
  calculationTime: number;  // milliseconds taken to calculate
  
  // Warnings or errors
  warnings?: string[];
  errors?: string[];
}

export interface ModeConfig {
  mode: TransportMode;
  
  // Speed characteristics
  averageSpeed: number;      // km/h
  
  // Cost model
  baseFare: number;          // Base cost in INR
  costPerKm?: number;        // Additional cost per km
  costPerMinute?: number;    // Time-based cost (for cabs)
  
  // Operational constraints
  maxDistance?: number;      // Maximum practical distance for this mode (meters)
  minDistance?: number;      // Minimum distance where this mode makes sense
  
  // Availability
  operatingHours?: {
    start: string;           // e.g., "05:00"
    end: string;             // e.g., "23:00"
  };
  
  // Comfort and reliability
  comfortScore: number;      // 0-10
  reliabilityScore: number;  // 0-10
  carbonEmission: number;    // grams CO2 per km
  
  // UI display
  icon: string;              // Emoji or icon identifier
  color: string;             // Hex color for UI
  displayName: string;
}

export interface TransitNode {
  id: string;
  type: 'metro_station' | 'bus_stop' | 'landmark' | 'intersection';
  name: string;
  location: Location;
  
  // Connected routes
  metroLines?: string[];     // e.g., ["Blue Line", "Red Line"]
  busRoutes?: string[];      // e.g., ["405", "615"]
  
  // Amenities
  facilities?: string[];     // e.g., ["parking", "restroom", "atm"]
  isAccessible?: boolean;    // Wheelchair accessible
}

export interface TransitEdge {
  from: string;              // Node ID
  to: string;                // Node ID
  mode: TransportMode;
  
  distance: number;          // meters
  duration: number;          // minutes (average)
  cost: number;              // INR
  
  // Route information
  routeId?: string;          // Bus/Metro route identifier
  routeName?: string;
}

export interface CityConfig {
  cityId: string;
  cityName: string;
  
  // Default mode configurations
  modes: ModeConfig[];
  
  // Transit network
  nodes: TransitNode[];
  edges: TransitEdge[];
  
  // City-specific constants
  trafficFactor: number;     // Multiplier for time estimates (1.0 = no traffic)
  walkingSpeed: number;      // km/h (typical: 4-5 in Indian cities)
  
  // Geographical bounds
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export interface CalculationState {
  currentNode: string;
  modesUsed: TransportMode[];
  totalTime: number;
  totalCost: number;
  path: RouteSegment[];
  transferCount: number;
}

export interface ScoringWeights {
  time: number;        // Weight for time efficiency (0-1)
  cost: number;        // Weight for cost efficiency (0-1)
  comfort: number;     // Weight for comfort (fewer transfers) (0-1)
  reliability: number; // Weight for reliability (0-1)
}
