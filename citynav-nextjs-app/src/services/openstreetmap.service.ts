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
    | "pharmacy"
    | "bank"
    | "restaurant"
    | "cafe"
    | "park"
    | "police"
    | "fire_station"
    | "general_store"
    | "medical"
    | "bus_station"
    | "train_station"
    | "metro_station"
    | "parking"
    | "post_office"
    | "school"
    | "college"
    | "library"
    | "gym"
    | "shopping_mall"
    | "market";
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
  area?: string; // Location area
  description?: string;
  openingHours?: string;
  amenities?: string[];
}

class OpenStreetMapService {
  private baseUrl = "/api/overpass"; // Use Next.js API route as proxy
  private nominatimUrl =
    process.env.NEXT_PUBLIC_NOMINATIM_BASE_URL ||
    "https://nominatim.openstreetmap.org";
  private poiCounter = 0; // Counter for unique IDs

  async fetchNearbyPOIs(
    lat: number,
    lng: number,
    radius: number = 1000, // Changed to 1km radius (1000 meters)
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
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query }),
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

        const pois = this.parseOverpassResponse(data, lat, lng, radius);
        console.log(`✅ Parsed ${pois.length} POIs from query ${i + 1}`);
        allResults.push(...pois);
      }

      const uniqueResults = this.removeDuplicates(allResults);
      console.log("🎯 Total unique POIs found:", uniqueResults.length);
      if (uniqueResults.length > 0) {
        console.log("📋 Sample POI:", uniqueResults[0]);
      } else {
        console.log("⚠️ No POIs found within", radius, "meters");
      }

      return uniqueResults.length > 0
        ? await this.enrichPOIsWithArea(uniqueResults)
        : [];
    } catch (error) {
      console.error("❌ Error fetching POIs from OpenStreetMap:", error);
      return [];
    }
  }

  private async enrichPOIsWithArea(pois: POIData[]): Promise<POIData[]> {
    const enrichedPOIs = await Promise.all(
      pois.map(async (poi) => {
        if (!poi.area) {
          try {
            const areaInfo = await this.getAreaFromCoordinates(
              poi.lat,
              poi.lng
            );
            return { ...poi, area: areaInfo };
          } catch (error) {
            console.warn(`Failed to get area for POI ${poi.id}:`, error);
            return poi;
          }
        }
        return poi;
      })
    );
    return enrichedPOIs;
  }

  /**
   * Get area name from coordinates using Nominatim reverse geocoding
   */
  private async getAreaFromCoordinates(
    lat: number,
    lng: number
  ): Promise<string | undefined> {
    try {
      const response = await fetch(
        `${this.nominatimUrl}/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
        {
          headers: {
            "User-Agent": "CityNav/1.0",
          },
        }
      );

      if (!response.ok) {
        return undefined;
      }

      const data = await response.json();
      const address = data.address;

      // Try to get the most relevant area information
      return (
        address?.suburb ||
        address?.neighbourhood ||
        address?.quarter ||
        address?.district ||
        address?.city_district ||
        address?.town ||
        address?.city ||
        undefined
      );
    } catch (error) {
      console.warn("Error fetching area:", error);
      return undefined;
    }
  }

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
      bank: `
        [out:json][timeout:25];
        (
          node["amenity"="bank"](${bbox});
          way["amenity"="bank"](${bbox});
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
      restaurant: `
        [out:json][timeout:25];
        (
          node["amenity"="restaurant"](${bbox});
          way["amenity"="restaurant"](${bbox});
        );
        out center;
      `,
      cafe: `
        [out:json][timeout:25];
        (
          node["amenity"="cafe"](${bbox});
          way["amenity"="cafe"](${bbox});
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
      park: `
        [out:json][timeout:25];
        (
          node["leisure"="park"](${bbox});
          way["leisure"="park"](${bbox});
          node["leisure"="garden"](${bbox});
          way["leisure"="garden"](${bbox});
        );
        out center;
      `,
      police: `
        [out:json][timeout:25];
        (
          node["amenity"="police"](${bbox});
          way["amenity"="police"](${bbox});
        );
        out center;
      `,
      fire_station: `
        [out:json][timeout:25];
        (
          node["amenity"="fire_station"](${bbox});
          way["amenity"="fire_station"](${bbox});
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

  private parseOverpassResponse(
    data: OSMResponse,
    userLat: number,
    userLng: number,
    maxRadius: number
  ): POIData[] {
    const pois: POIData[] = [];

    if (!data.elements) return pois;

    data.elements.forEach((element: OSMNode | OSMWay) => {
      const poi = this.elementToPOI(element);
      if (poi) {
        const distance = this.calculateDistance(
          userLat,
          userLng,
          poi.lat,
          poi.lng
        );

        if (distance <= maxRadius) {
          pois.push(poi);
        } else {
          console.log(
            `🚫 Filtered out ${poi.name} - ${distance}m away (max: ${maxRadius}m)`
          );
        }
      }
    });

    return pois;
  }


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
    return R * c; // Distance in meters
  }

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

    let type: POIData["type"];
    if (tags.amenity === "toilets" || tags.toilets) {
      type = "restroom";
    } else if (tags.amenity === "atm" || tags.atm) {
      type = "atm";
    } else if (tags.amenity === "bank") {
      type = "bank";
    } else if (
      tags.amenity === "drinking_water" ||
      tags.man_made === "water_point"
    ) {
      type = "water";
    } else if (["food_court", "fast_food"].includes(tags.amenity)) {
      type = "food";
    } else if (tags.amenity === "restaurant") {
      type = "restaurant";
    } else if (tags.amenity === "cafe") {
      type = "cafe";
    } else if (["hotel", "motel", "guest_house"].includes(tags.tourism)) {
      type = "hotel";
    } else if (tags.amenity === "fuel") {
      type = "fuel";
    } else if (["hospital", "clinic"].includes(tags.amenity)) {
      type = "hospital";
    } else if (tags.amenity === "pharmacy") {
      type = "pharmacy";
    } else if (["park", "garden"].includes(tags.leisure)) {
      type = "park";
    } else if (tags.amenity === "police") {
      type = "police";
    } else if (tags.amenity === "fire_station") {
      type = "fire_station";
    } else {
      return null;
    }

    const name =
      tags.name ||
      tags["name:en"] ||
      tags.brand ||
      this.getDefaultName(type, tags);

    const ratings = this.generateMockRatings(type);

    const area =
      tags["addr:suburb"] ||
      tags["addr:district"] ||
      tags["addr:city"] ||
      tags["addr:neighbourhood"] ||
      undefined;

    const poi: POIData = {
      id: `poi_${element.type}_${element.id}`,
      type,
      name,
      lat,
      lng,
      ratings,
      isBookmarked: false,
      area,
      description: this.generateDescription(type, tags),
      openingHours: tags.opening_hours,
      amenities: this.extractAmenities(tags),
    };

    return poi;
  }

  private getDefaultName(type: POIData["type"], tags: OSMTags): string {
    if (type === "atm") {
      const operator = tags.operator || tags.bank || tags.brand;
      return operator ? `${operator} ATM` : "ATM";
    }

    if (type === "food") {
      const cuisine = tags.cuisine;
      const name = cuisine
        ? `${cuisine.charAt(0).toUpperCase() + cuisine.slice(1)} Restaurant`
        : "Restaurant";
      return name;
    }

    if (type === "fuel") {
      const brand = tags.brand || tags.operator;
      return brand ? `${brand} Gas Station` : "Gas Station";
    }

    if (type === "pharmacy") {
      const brand = tags.brand || tags.operator;
      return brand ? `${brand} Pharmacy` : "Pharmacy";
    }

    const defaults: Record<POIData["type"], string> = {
      restroom: "Public Restroom",
      atm: "ATM",
      bank: "Bank",
      water: "Drinking Water",
      food: "Restaurant",
      restaurant: "Restaurant",
      cafe: "Café",
      hotel: tags.brand || "Hotel",
      fuel: "Gas Station",
      hospital: "Hospital",
      pharmacy: "Pharmacy",
      park: "Park",
      police: "Police Station",
      fire_station: "Fire Station",
    };
    return defaults[type] || "Point of Interest";
  }

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

  private removeDuplicates(pois: POIData[]): POIData[] {
    const seen = new Map<string, POIData>();

    for (const poi of pois) {
      if (!seen.has(poi.id)) {
        seen.set(poi.id, poi);
      } else {
        console.log(`🔄 Skipping duplicate POI: ${poi.id} - ${poi.name}`);
      }
    }

    return Array.from(seen.values());
  }

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

export const osmService = new OpenStreetMapService();
export default osmService;
