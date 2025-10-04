/**
 * Shared types for Essential Maps feature
 */

export interface POI {
  id: string;
  type:
    | "restroom"
    | "atm"
    | "water"
    | "food"
    | "hotel"
    | "fuel"
    | "hospital"
    | "pharmacy";
  name: string;
  lat: number;
  lng: number;
  ratings: {
    cleanliness?: number;
    safety: number;
    working?: number;
    comfort?: number;
    service?: number;
    taste?: number;
    price?: number;
  };
  isBookmarked: boolean;
  distance?: string;
  description?: string;
  openingHours?: string;
  amenities?: string[];
}

export interface MapLocation {
  lat: number;
  lng: number;
}

export interface FilterOption {
  id: string;
  label: string;
  icon: string;
  count: number;
}

export type POIType = POI["type"];

export interface DirectionsDestination {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: string;
  description?: string;
}
