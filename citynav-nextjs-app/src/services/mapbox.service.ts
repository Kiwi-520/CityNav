/**
 * Mapbox API Service for fetching Points of Interest (POIs)
 * Uses Mapbox Geocoding API and Places API
 */

export interface MapboxPOI {
  id: string;
  type:
    | "restroom"
    | "atm"
    | "water"
    | "food"
    | "hotel"
    | "fuel"
    | "hospital"
    | "pharmacy"
    | "bank"
    | "restaurant"
    | "cafe"
    | "park"
    | "police"
    | "fire_station";
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
  area?: string;
  description?: string;
  address?: string;
  openingHours?: string;
  amenities?: string[];
  distance?: number; // Distance in meters
}

interface MapboxFeature {
  id: string;
  type: string;
  place_type: string[];
  relevance: number;
  properties: {
    category?: string;
    maki?: string;
    [key: string]: any;
  };
  text: string;
  place_name: string;
  center: [number, number];
  geometry: {
    coordinates: [number, number];
    type: string;
  };
  context?: Array<{
    id: string;
    text: string;
  }>;
}

class MapboxService {
  private accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

  private geocodingUrl = "https://api.mapbox.com/geocoding/v5/mapbox.places";
  private poiCounter = 0;

  // Category mapping from our types to Mapbox categories
  private categoryMapping: { [key: string]: string[] } = {
    restroom: ["restroom", "toilet", "bathroom", "wc"],
    atm: ["atm", "cash machine"],
    bank: ["bank", "financial"],
    water: ["drinking water", "water fountain"],
    food: ["food", "fast food", "takeaway"],
    restaurant: ["restaurant", "dining"],
    cafe: ["cafe", "coffee shop", "coffee"],
    hotel: ["hotel", "accommodation", "motel", "inn"],
    fuel: ["gas station", "fuel", "petrol"],
    hospital: ["hospital", "clinic", "medical center"],
    pharmacy: ["pharmacy", "drugstore", "chemist"],
    park: ["park", "garden", "recreation"],
    police: ["police station", "police"],
    fire_station: ["fire station", "fire department"],
  };

  /**
   * Fetch POIs near a given location using Mapbox Places API
   */
  async fetchNearbyPOIs(
    lat: number,
    lng: number,
    radius: number = 2000, // radius in meters
    poiTypes: string[] = ["all"]
  ): Promise<MapboxPOI[]> {
    console.log("🗺️ Mapbox Service: Starting POI fetch");
    console.log("📍 Location:", lat, lng);
    console.log("📏 Radius:", radius, "meters (2km max)");
    console.log("🏷️ POI Types:", poiTypes);
    console.log("🔑 Token available:", !!this.accessToken);
    console.log(
      "🔑 Token (first 20 chars):",
      this.accessToken.substring(0, 20)
    );

    if (!this.accessToken) {
      console.error("❌ Mapbox access token not found!");
      alert("❌ Mapbox token is missing! Check .env.local file");
      return [];
    }

    try {
      const allPOIs: MapboxPOI[] = [];
      const typesToFetch = poiTypes.includes("all")
        ? Object.keys(this.categoryMapping)
        : poiTypes;

      console.log(`🔍 Fetching ${typesToFetch.length} POI categories`);

      // Fetch POIs for each category
      for (const type of typesToFetch) {
        const categories = this.categoryMapping[type];
        if (!categories) {
          console.warn(`⚠️ No category mapping for type: ${type}`);
          continue;
        }

        console.log(`📂 Fetching type: ${type}, categories:`, categories);

        for (const category of categories) {
          try {
            console.log(`   🔎 Searching for: ${category}`);
            const pois = await this.fetchPOIsByCategory(
              lat,
              lng,
              category,
              type,
              radius
            );
            console.log(`   ✅ Found ${pois.length} ${category} POIs`);
            allPOIs.push(...pois);
          } catch (error) {
            console.warn(
              `⚠️ Failed to fetch ${category}:`,
              error instanceof Error ? error.message : error
            );
          }
        }
      }

      console.log(`📊 Total POIs before deduplication: ${allPOIs.length}`);

      // Remove duplicates and filter by distance
      const uniquePOIs = this.removeDuplicates(allPOIs);
      console.log(`📊 Unique POIs: ${uniquePOIs.length}`);

      const filteredPOIs = uniquePOIs.filter((poi) => {
        if (poi.distance && poi.distance <= radius) {
          return true;
        }
        return false;
      });

      console.log(`✅ Found ${filteredPOIs.length} POIs within ${radius}m`);
      console.log(
        "📍 Sample POIs:",
        filteredPOIs
          .slice(0, 3)
          .map((p) => ({ name: p.name, type: p.type, distance: p.distance }))
      );

      // If no POIs found, generate sample POIs for demonstration
      if (filteredPOIs.length === 0) {
        console.warn(
          "⚠️ No POIs from Mapbox API - generating sample POIs for demonstration"
        );
        const samplePOIs = this.generateSamplePOIs(
          lat,
          lng,
          typesToFetch,
          radius
        );
        console.log(`✅ Generated ${samplePOIs.length} sample POIs`);
        return samplePOIs;
      }

      return filteredPOIs;
    } catch (error) {
      console.error("❌ Error fetching POIs from Mapbox:", error);
      return [];
    }
  }

  /**
   * Fetch POIs by specific category
   */
  private async fetchPOIsByCategory(
    lat: number,
    lng: number,
    category: string,
    type: string,
    radius: number
  ): Promise<MapboxPOI[]> {
    const query = encodeURIComponent(category);
    const proximity = `${lng},${lat}`; // Mapbox uses lng,lat format
    const limit = 25; // Increased limit to get more results

    const url = `${this.geocodingUrl}/${query}.json?access_token=${this.accessToken}&proximity=${proximity}&limit=${limit}&types=poi`;

    console.log(`   🌐 API URL: ${url.substring(0, 100)}...`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`   📦 API Response for ${category}:`, {
      features: data.features?.length || 0,
      attribution: data.attribution,
    });

    const pois: MapboxPOI[] = [];

    if (data.features && Array.isArray(data.features)) {
      console.log(
        `   🔍 Processing ${data.features.length} features for ${category}`
      );

      for (const feature of data.features) {
        const poi = this.featureToPOI(feature, type, lat, lng);
        if (poi) {
          console.log(
            `      ✓ Created POI: ${poi.name} (${poi.distance}m away)`
          );
          if (poi.distance && poi.distance <= radius) {
            pois.push(poi);
          } else {
            console.log(
              `      ✗ POI ${poi.name} too far: ${poi.distance}m > ${radius}m`
            );
          }
        }
      }
    } else {
      console.warn(`   ⚠️ No features in response for ${category}`);
    }

    console.log(`   📊 Returning ${pois.length} POIs for ${category}`);
    return pois;
  }

  /**
   * Convert Mapbox feature to POI
   */
  private featureToPOI(
    feature: MapboxFeature,
    type: string,
    userLat: number,
    userLng: number
  ): MapboxPOI | null {
    try {
      const [lng, lat] = feature.center;
      const name = feature.text || feature.place_name.split(",")[0];

      // Extract area from context
      const area = this.extractArea(feature);

      // Calculate distance
      const distance = this.calculateDistance(userLat, userLng, lat, lng);

      this.poiCounter++;
      const poi: MapboxPOI = {
        id: `mapbox_${feature.id}_${this.poiCounter}`,
        type: type as MapboxPOI["type"],
        name,
        lat,
        lng,
        ratings: this.generateMockRatings(type as MapboxPOI["type"]),
        isBookmarked: false,
        area,
        description: this.generateDescription(
          type as MapboxPOI["type"],
          feature
        ),
        address: feature.place_name,
        amenities: this.extractAmenities(feature),
        distance,
      };

      return poi;
    } catch (error) {
      console.warn("Failed to parse feature:", error);
      return null;
    }
  }

  /**
   * Extract area from Mapbox feature context
   */
  private extractArea(feature: MapboxFeature): string | undefined {
    if (!feature.context) return undefined;

    // Try to find neighborhood, locality, or place
    for (const ctx of feature.context) {
      if (
        ctx.id.startsWith("neighborhood") ||
        ctx.id.startsWith("locality") ||
        ctx.id.startsWith("place")
      ) {
        return ctx.text;
      }
    }

    return undefined;
  }

  /**
   * Calculate distance between two points in meters
   */
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Generate mock ratings
   */
  private generateMockRatings(type: MapboxPOI["type"]) {
    const baseRating = 3.5 + Math.random() * 1.5;

    switch (type) {
      case "restroom":
        return {
          cleanliness: Math.round((baseRating + Math.random() * 0.5) * 10) / 10,
          safety: Math.round((baseRating + Math.random() * 0.3) * 10) / 10,
        };
      case "atm":
      case "bank":
        return {
          safety: Math.round((baseRating + Math.random() * 0.3) * 10) / 10,
          working: Math.round((baseRating + Math.random() * 0.7) * 10) / 10,
        };
      case "water":
        return {
          cleanliness: Math.round((baseRating + Math.random() * 0.5) * 10) / 10,
          safety: Math.round((baseRating + Math.random() * 0.3) * 10) / 10,
        };
      case "food":
      case "restaurant":
      case "cafe":
        return {
          cleanliness: Math.round((baseRating + Math.random() * 0.4) * 10) / 10,
          safety: Math.round((baseRating + Math.random() * 0.3) * 10) / 10,
          taste: Math.round((baseRating + Math.random() * 0.6) * 10) / 10,
          service: Math.round((baseRating + Math.random() * 0.5) * 10) / 10,
        };
      case "hotel":
        return {
          safety: Math.round((baseRating + Math.random() * 0.3) * 10) / 10,
          comfort: Math.round((baseRating + Math.random() * 0.5) * 10) / 10,
          service: Math.round((baseRating + Math.random() * 0.4) * 10) / 10,
        };
      case "fuel":
        return {
          safety: Math.round((baseRating + Math.random() * 0.3) * 10) / 10,
          service: Math.round((baseRating + Math.random() * 0.4) * 10) / 10,
          price: Math.round((3.0 + Math.random() * 2.0) * 10) / 10,
        };
      case "hospital":
      case "pharmacy":
      case "police":
      case "fire_station":
        return {
          safety: Math.round((baseRating + Math.random() * 0.3) * 10) / 10,
          service: Math.round((baseRating + Math.random() * 0.5) * 10) / 10,
        };
      case "park":
        return {
          safety: Math.round((baseRating + Math.random() * 0.3) * 10) / 10,
          cleanliness: Math.round((baseRating + Math.random() * 0.4) * 10) / 10,
        };
      default:
        return { safety: baseRating };
    }
  }

  /**
   * Generate description
   */
  private generateDescription(
    type: MapboxPOI["type"],
    feature: MapboxFeature
  ): string {
    const category = feature.properties?.category || type;
    const descriptions: { [key: string]: string } = {
      restroom: "Public restroom facilities",
      atm: "24/7 ATM service available",
      bank: "Full banking services",
      water: "Drinking water station",
      food: "Dining options available",
      restaurant: "Restaurant with various cuisines",
      cafe: "Coffee and refreshments",
      hotel: "Accommodation services",
      fuel: "Fuel station with convenience store",
      hospital: "Medical services available",
      pharmacy: "Pharmacy and medical supplies",
      park: "Public park and recreational area",
      police: "Police station and emergency services",
      fire_station: "Fire and emergency services",
    };

    return descriptions[type] || `${category} point of interest`;
  }

  /**
   * Extract amenities
   */
  private extractAmenities(feature: MapboxFeature): string[] {
    const amenities: string[] = [];
    const props = feature.properties || {};

    if (props.wheelchair === "yes") amenities.push("Wheelchair accessible");
    if (props.wifi === "yes") amenities.push("WiFi");
    if (props.parking === "yes") amenities.push("Parking available");

    return amenities;
  }

  /**
   * Remove duplicate POIs
   */
  private removeDuplicates(pois: MapboxPOI[]): MapboxPOI[] {
    const seen = new Map<string, MapboxPOI>();

    for (const poi of pois) {
      // Create a unique key based on coordinates and name
      const key = `${poi.lat.toFixed(6)}_${poi.lng.toFixed(6)}_${poi.name}`;
      if (!seen.has(key)) {
        seen.set(key, poi);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Generate sample POIs for demonstration when Mapbox API returns no results
   * This creates realistic POIs around the user's location
   */
  private generateSamplePOIs(
    lat: number,
    lng: number,
    types: string[],
    radius: number
  ): MapboxPOI[] {
    console.log(
      `📝 Generating sample POIs around user location: ${lat.toFixed(
        6
      )}, ${lng.toFixed(6)}`
    );
    console.log(
      `📏 Maximum radius: ${radius}m (${(radius / 1000).toFixed(2)}km)`
    );

    const pois: MapboxPOI[] = [];
    const maxRadius = radius / 1000; // Convert to km

    // Sample data for each type
    const sampleData: { [key: string]: string[] } = {
      restaurant: [
        "Taj Restaurant",
        "Spice Garden",
        "Urban Kitchen",
        "The Food Court",
        "Curry House",
      ],
      cafe: [
        "Starbucks",
        "Cafe Coffee Day",
        "Barista",
        "Blue Tokai Coffee",
        "Third Wave Coffee",
      ],
      hotel: [
        "Marriott Hotel",
        "Taj Hotel",
        "Lemon Tree",
        "OYO Rooms",
        "Treebo Hotels",
      ],
      atm: ["HDFC ATM", "ICICI ATM", "SBI ATM", "Axis Bank ATM", "PNB ATM"],
      bank: [
        "HDFC Bank",
        "ICICI Bank",
        "State Bank",
        "Axis Bank",
        "Kotak Bank",
      ],
      hospital: [
        "City Hospital",
        "Apollo Hospital",
        "Max Healthcare",
        "Fortis Hospital",
        "Columbia Asia",
      ],
      pharmacy: [
        "Apollo Pharmacy",
        "MedPlus",
        "Wellness Forever",
        "Netmeds Pharmacy",
        "1mg Store",
      ],
      fuel: [
        "Indian Oil Pump",
        "HP Petrol Pump",
        "Bharat Petroleum",
        "Shell Station",
        "Reliance Petrol",
      ],
      restroom: [
        "Public Restroom",
        "Mall Restroom",
        "Park Facilities",
        "Station Restroom",
        "Community Center WC",
      ],
      water: [
        "Water ATM",
        "Public Fountain",
        "RO Water Station",
        "Community Water Point",
        "Drinking Fountain",
      ],
      park: [
        "Central Park",
        "City Garden",
        "Children's Park",
        "Botanical Garden",
        "Recreation Ground",
      ],
      police: [
        "City Police Station",
        "Traffic Police Post",
        "Women Police Station",
        "Cyber Crime Cell",
        "Police Outpost",
      ],
      fire_station: [
        "Fire Station",
        "Fire Brigade",
        "Emergency Services",
        "Rescue Station",
        "Fire Department",
      ],
      food: [
        "Food Plaza",
        "Street Food Court",
        "Quick Bites",
        "Snack Corner",
        "Food Hub",
      ],
    };

    // Generate POIs for each requested type
    for (const type of types) {
      const names = sampleData[type] || [
        `${type} Location 1`,
        `${type} Location 2`,
        `${type} Location 3`,
      ];

      // Generate 3-5 POIs per type
      const countForType = Math.min(
        names.length,
        Math.floor(Math.random() * 3) + 3
      );

      for (let i = 0; i < countForType; i++) {
        // Generate random offset within radius
        const angle = Math.random() * 2 * Math.PI;
        const distance = Math.random() * maxRadius; // km

        // Calculate new coordinates
        const latOffset = (distance / 111.32) * Math.cos(angle); // 111.32 km per degree of latitude
        const lngOffset =
          (distance / (111.32 * Math.cos((lat * Math.PI) / 180))) *
          Math.sin(angle);

        const poiLat = lat + latOffset;
        const poiLng = lng + lngOffset;

        // Calculate actual distance
        const actualDistance = this.calculateDistance(lat, lng, poiLat, poiLng);

        // Ensure POI is within radius
        if (actualDistance > radius) {
          console.warn(
            `⚠️ POI ${names[i]} generated outside radius: ${actualDistance}m > ${radius}m, skipping`
          );
          continue;
        }

        const poi: MapboxPOI = {
          id: `sample_${type}_${i}_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`,
          type: type as any,
          name: names[i] || `${type} ${i + 1}`,
          lat: poiLat,
          lng: poiLng,
          distance: actualDistance,
          ratings: {
            safety: Math.random() * 2 + 3, // 3-5
            cleanliness: Math.random() * 2 + 3,
            service: Math.random() * 2 + 3,
          },
          isBookmarked: false,
          area: "Nearby Area",
          description: `Sample ${type} location for demonstration`,
          address: `${Math.floor(actualDistance)}m away from your location`,
        };

        console.log(
          `   ✓ Generated: ${poi.name} at ${actualDistance.toFixed(0)}m (${(
            actualDistance / 1000
          ).toFixed(2)}km)`
        );
        pois.push(poi);
      }
    }

    console.log(
      `📝 Generated ${pois.length} sample POIs within ${radius}m radius`
    );
    console.log(
      `📊 Breakdown by type:`,
      types
        .map((t) => `${t}: ${pois.filter((p) => p.type === t).length}`)
        .join(", ")
    );

    return pois;
  }

  /**
   * Reverse geocode to get location details
   */
  async reverseGeocode(
    lat: number,
    lng: number
  ): Promise<{ city?: string; country?: string; area?: string }> {
    try {
      const url = `${this.geocodingUrl}/${lng},${lat}.json?access_token=${this.accessToken}&types=place,locality,neighborhood`;

      const response = await fetch(url);
      if (!response.ok) return {};

      const data = await response.json();
      if (!data.features || data.features.length === 0) return {};

      const feature = data.features[0];
      const result: { city?: string; country?: string; area?: string } = {};

      if (feature.context) {
        for (const ctx of feature.context) {
          if (ctx.id.startsWith("place")) {
            result.city = ctx.text;
          } else if (ctx.id.startsWith("country")) {
            result.country = ctx.text;
          } else if (ctx.id.startsWith("neighborhood")) {
            result.area = ctx.text;
          }
        }
      }

      return result;
    } catch (error) {
      console.error("Reverse geocode error:", error);
      return {};
    }
  }
}

// Export singleton instance
export const mapboxService = new MapboxService();
export default mapboxService;
