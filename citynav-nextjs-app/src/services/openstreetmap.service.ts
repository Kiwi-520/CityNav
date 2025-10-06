/**
 * OpenStreetMap API Service for fetching Points of Interest (POIs)
 * This service uses Overpass API to query OpenStreetMap data
 */

export interface OSMNode {
  type: "node";
  id: number;
  lat: number;
  lon: number;
  tags: { [key: string]: string };
}

export interface OSMWay {
  type: "way";
  id: number;
  center?: { lat: number; lon: number };
  tags: { [key: string]: string };
}

export interface OSMResponse {
  elements: (OSMNode | OSMWay)[];
}

export interface OSMTags {
  [key: string]: string;
}

export interface POIData {
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
  description?: string;
  openingHours?: string;
  amenities?: string[];
}

class OpenStreetMapService {
  private baseUrl = "https://overpass-api.de/api/interpreter";
  private nominatimUrl =
    process.env.NEXT_PUBLIC_NOMINATIM_BASE_URL ||
    "https://nominatim.openstreetmap.org";

  /**
   * Fetch POIs near a given location
   */
  async fetchNearbyPOIs(
    lat: number,
    lng: number,
    radius: number = 2000, // radius in meters
    poiTypes: string[] = ["all"]
  ): Promise<POIData[]> {
    console.log("🔍 OSM Service: Starting POI fetch");
    console.log("📍 Location:", lat, lng);
    console.log("📏 Radius:", radius, "meters");
    console.log("🏷️ POI Types:", poiTypes);

    try {
      const queries = this.buildOverpassQueries(lat, lng, radius, poiTypes);
      console.log("📝 Generated queries:", queries.length);

      const allResults: POIData[] = [];

      for (let i = 0; i < queries.length; i++) {
        const query = queries[i];
        console.log(`🌐 Executing query ${i + 1}/${queries.length}`);
        console.log("Query:", query.substring(0, 100) + "...");

        const response = await fetch(this.baseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: `data=${encodeURIComponent(query)}`,
        });

        if (!response.ok) {
          console.warn(`❌ Query ${i + 1} failed: ${response.statusText}`);
          continue;
        }

        const data = await response.json();
        console.log(
          `📊 Query ${i + 1} returned:`,
          data.elements?.length || 0,
          "elements"
        );

        const pois = this.parseOverpassResponse(data);
        console.log(`✅ Parsed ${pois.length} POIs from query ${i + 1}`);
        allResults.push(...pois);
      }

      const uniqueResults = this.removeDuplicates(allResults);
      console.log("🎯 Total unique POIs found:", uniqueResults.length);
      if (uniqueResults.length > 0) {
        console.log("📋 Sample POI:", uniqueResults[0]);
      } else {
        console.log("⚠️ No POIs found, trying fallback...");
      }

      return uniqueResults.length > 0
        ? uniqueResults
        : this.getFallbackPOIs(lat, lng);
    } catch (error) {
      console.error("❌ Error fetching POIs from OpenStreetMap:", error);
      return this.getFallbackPOIs(lat, lng);
    }
  }

  /**
   * Build Overpass API queries for different POI types
   */
  private buildOverpassQueries(
    lat: number,
    lng: number,
    radius: number,
    poiTypes: string[]
  ): string[] {
    const bbox = this.getBoundingBox(lat, lng, radius);
    const queries: string[] = [];

    const poiQueries = {
      restroom: `
        [out:json][timeout:25];
        (
          node["amenity"="toilets"](${bbox});
          way["amenity"="toilets"](${bbox});
          node["toilets"](${bbox});
        );
        out center;
      `,
      atm: `
        [out:json][timeout:25];
        (
          node["amenity"="atm"](${bbox});
          way["amenity"="atm"](${bbox});
          node["atm"](${bbox});
        );
        out center;
      `,
      water: `
        [out:json][timeout:25];
        (
          node["amenity"="drinking_water"](${bbox});
          way["amenity"="drinking_water"](${bbox});
          node["man_made"="water_point"](${bbox});
        );
        out center;
      `,
      food: `
        [out:json][timeout:25];
        (
          node["amenity"="food_court"](${bbox});
          way["amenity"="food_court"](${bbox});
          node["amenity"="restaurant"](${bbox});
          way["amenity"="restaurant"](${bbox});
          node["amenity"="fast_food"](${bbox});
          way["amenity"="fast_food"](${bbox});
        );
        out center;
      `,
      hotel: `
        [out:json][timeout:25];
        (
          node["tourism"="hotel"](${bbox});
          way["tourism"="hotel"](${bbox});
          node["tourism"="motel"](${bbox});
          way["tourism"="motel"](${bbox});
          node["tourism"="guest_house"](${bbox});
          way["tourism"="guest_house"](${bbox});
        );
        out center;
      `,
      fuel: `
        [out:json][timeout:25];
        (
          node["amenity"="fuel"](${bbox});
          way["amenity"="fuel"](${bbox});
        );
        out center;
      `,
      hospital: `
        [out:json][timeout:25];
        (
          node["amenity"="hospital"](${bbox});
          way["amenity"="hospital"](${bbox});
          node["amenity"="clinic"](${bbox});
          way["amenity"="clinic"](${bbox});
        );
        out center;
      `,
      pharmacy: `
        [out:json][timeout:25];
        (
          node["amenity"="pharmacy"](${bbox});
          way["amenity"="pharmacy"](${bbox});
        );
        out center;
      `,
    };

    if (poiTypes.includes("all")) {
      queries.push(...Object.values(poiQueries));
    } else {
      poiTypes.forEach((type) => {
        if (poiQueries[type as keyof typeof poiQueries]) {
          queries.push(poiQueries[type as keyof typeof poiQueries]);
        }
      });
    }

    return queries;
  }

  /**
   * Get bounding box for the given center and radius
   */
  private getBoundingBox(lat: number, lng: number, radius: number): string {
    const earthRadius = 6371000; // Earth's radius in meters
    const latDelta = (radius / earthRadius) * (180 / Math.PI);
    const lngDelta =
      ((radius / earthRadius) * (180 / Math.PI)) /
      Math.cos((lat * Math.PI) / 180);

    const south = lat - latDelta;
    const north = lat + latDelta;
    const west = lng - lngDelta;
    const east = lng + lngDelta;

    return `${south},${west},${north},${east}`;
  }

  /**
   * Parse Overpass API response to POI data
   */
  private parseOverpassResponse(data: OSMResponse): POIData[] {
    const pois: POIData[] = [];

    if (!data.elements) return pois;

    data.elements.forEach((element: OSMNode | OSMWay) => {
      const poi = this.elementToPOI(element);
      if (poi) {
        pois.push(poi);
      }
    });

    return pois;
  }

  /**
   * Convert OSM element to POI data
   */
  private elementToPOI(element: OSMNode | OSMWay): POIData | null {
    const tags = element.tags || {};
    let lat: number, lng: number;

    if (element.type === "node") {
      lat = element.lat;
      lng = element.lon;
    } else if (element.type === "way" && element.center) {
      lat = element.center.lat;
      lng = element.center.lon;
    } else {
      return null;
    }

    // Determine POI type
    let type: POIData["type"];
    if (tags.amenity === "toilets" || tags.toilets) {
      type = "restroom";
    } else if (tags.amenity === "atm" || tags.atm) {
      type = "atm";
    } else if (
      tags.amenity === "drinking_water" ||
      tags.man_made === "water_point"
    ) {
      type = "water";
    } else if (
      ["food_court", "restaurant", "fast_food"].includes(tags.amenity)
    ) {
      type = "food";
    } else if (["hotel", "motel", "guest_house"].includes(tags.tourism)) {
      type = "hotel";
    } else if (tags.amenity === "fuel") {
      type = "fuel";
    } else if (["hospital", "clinic"].includes(tags.amenity)) {
      type = "hospital";
    } else if (tags.amenity === "pharmacy") {
      type = "pharmacy";
    } else {
      return null;
    }

    // Generate name
    const name =
      tags.name ||
      tags["name:en"] ||
      tags.brand ||
      this.getDefaultName(type, tags);

    // Generate mock ratings (in a real app, this would come from user reviews)
    const ratings = this.generateMockRatings(type);

    const poi: POIData = {
      id: `${element.type}_${element.id}`,
      type,
      name,
      lat,
      lng,
      ratings,
      isBookmarked: false,
      description: this.generateDescription(type, tags),
      openingHours: tags.opening_hours,
      amenities: this.extractAmenities(tags),
    };

    return poi;
  }

  /**
   * Generate default name for POI
   */
  private getDefaultName(type: POIData["type"], tags: OSMTags): string {
    const defaults: Record<POIData["type"], string> = {
      restroom: "Public Restroom",
      atm: tags.operator || tags.brand || "ATM",
      water: "Water Station",
      food: tags.cuisine ? `${tags.cuisine} Restaurant` : "Restaurant",
      hotel: tags.brand || "Hotel",
      fuel: tags.brand || "Gas Station",
      hospital: "Hospital",
      pharmacy: "Pharmacy",
    };
    return defaults[type] || "Point of Interest";
  }

  /**
   * Generate mock ratings (replace with real rating system)
   */
  private generateMockRatings(type: POIData["type"]) {
    const baseRating = 3.5 + Math.random() * 1.5;

    switch (type) {
      case "restroom":
        return {
          cleanliness: Math.round((baseRating + Math.random() * 0.5) * 10) / 10,
          safety: Math.round((baseRating + Math.random() * 0.3) * 10) / 10,
        };
      case "atm":
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
        return {
          safety: Math.round((baseRating + Math.random() * 0.3) * 10) / 10,
          service: Math.round((baseRating + Math.random() * 0.5) * 10) / 10,
        };
      default:
        return { safety: baseRating };
    }
  }

  /**
   * Generate description from tags
   */
  private generateDescription(type: POIData["type"], tags: OSMTags): string {
    const descriptions: { [key: string]: string } = {
      restroom: `Public restroom${
        tags.wheelchair === "yes" ? " with wheelchair access" : ""
      }${tags.fee === "yes" ? " (paid)" : ""}`,
      atm: `${tags.operator || "Bank"} ATM${
        tags["24/7"] === "yes" ? " - 24/7 service" : ""
      }`,
      water: `Drinking water station${
        tags.fee === "yes" ? " (paid)" : " (free)"
      }`,
      food: `${tags.cuisine || "Multi-cuisine"} ${
        tags.amenity === "fast_food" ? "fast food" : "restaurant"
      }`,
    };

    return descriptions[type] || "Point of interest";
  }

  /**
   * Extract amenities from tags
   */
  private extractAmenities(tags: OSMTags): string[] {
    const amenities: string[] = [];

    if (tags.wheelchair === "yes") amenities.push("Wheelchair accessible");
    if (tags.baby === "yes") amenities.push("Baby changing");
    if (tags.fee === "no") amenities.push("Free");
    if (tags["24/7"] === "yes") amenities.push("24/7");
    if (tags.wifi === "yes") amenities.push("WiFi");
    if (tags.air_conditioning === "yes") amenities.push("AC");

    return amenities;
  }

  /**
   * Remove duplicate POIs
   */
  private removeDuplicates(pois: POIData[]): POIData[] {
    const seen = new Set<string>();
    const unique: POIData[] = [];

    for (const poi of pois) {
      const key = `${poi.lat.toFixed(6)}_${poi.lng.toFixed(6)}_${poi.type}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(poi);
      }
    }

    return unique;
  }

  /**
   * Fallback POI data when API fails
   */
  private getFallbackPOIs(lat: number, lng: number): POIData[] {
    console.log("🔄 Using fallback POIs for", lat, lng);
    return [
      {
        id: "fallback_1",
        type: "restroom",
        name: "Public Restroom",
        lat: lat + 0.002,
        lng: lng + 0.001,
        ratings: { cleanliness: 4.0, safety: 4.2 },
        isBookmarked: false,
        description: "Clean public restroom facilities",
        amenities: ["Wheelchair accessible", "Baby changing"],
      },
      {
        id: "fallback_2",
        type: "atm",
        name: "Bank ATM",
        lat: lat - 0.001,
        lng: lng + 0.0015,
        ratings: { safety: 4.1, working: 4.5 },
        isBookmarked: false,
        description: "24/7 ATM service available",
        amenities: ["24/7", "Secure location"],
      },
      {
        id: "fallback_3",
        type: "hotel",
        name: "City Hotel",
        lat: lat + 0.0015,
        lng: lng - 0.002,
        ratings: { safety: 4.5, comfort: 4.3, service: 4.0 },
        isBookmarked: false,
        description: "Comfortable accommodation in city center",
        amenities: ["WiFi", "AC", "Room service"],
      },
      {
        id: "fallback_4",
        type: "food",
        name: "Local Restaurant",
        lat: lat - 0.0018,
        lng: lng - 0.001,
        ratings: { safety: 4.3, taste: 4.4, service: 4.2 },
        isBookmarked: false,
        description: "Authentic local cuisine restaurant",
        amenities: ["Outdoor seating", "Vegetarian options"],
      },
      {
        id: "fallback_5",
        type: "fuel",
        name: "Gas Station",
        lat: lat + 0.001,
        lng: lng - 0.0025,
        ratings: { safety: 4.2, service: 4.0, price: 3.8 },
        isBookmarked: false,
        description: "Full service gas station with convenience store",
        amenities: ["24/7", "Convenience store", "Car wash"],
      },
    ];
  }

  /**
   * Search for places using Nominatim
   */
  async searchPlaces(
    query: string,
    lat?: number,
    lng?: number
  ): Promise<unknown[]> {
    try {
      let url = `${this.nominatimUrl}/search?format=json&q=${encodeURIComponent(
        query
      )}&limit=10`;

      if (lat && lng) {
        url += `&lat=${lat}&lon=${lng}&radius=10000`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error("Search failed");

      return await response.json();
    } catch (error) {
      console.error("Error searching places:", error);
      return [];
    }
  }
}

// Export singleton instance
export const osmService = new OpenStreetMapService();
export default osmService;
