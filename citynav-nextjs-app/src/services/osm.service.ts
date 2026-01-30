/**
 * OpenStreetMap Overpass API Service
 */

import { offlineStorage } from "./offline-storage.service";

export interface OSMPOI {
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
  area?: string;
  description?: string;
  address?: string;
  openingHours?: string;
  amenities?: string[];
  distance?: number;
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: {
    name?: string;
    amenity?: string;
    shop?: string;
    leisure?: string;
    [key: string]: any;
  };
}

class OSMService {
  private overpassUrl = "https://overpass-api.de/api/interpreter";
  private backupServers = [
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.openstreetmap.ru/api/interpreter",
  ];
  private typeToOSMTags: Record<string, string[]> = {
    hospital: ['amenity="hospital"', 'amenity="clinic"', 'healthcare="hospital"'],
    pharmacy: ['amenity="pharmacy"', 'shop="chemist"'],
    restaurant: ['amenity="restaurant"'],
    cafe: ['amenity="cafe"'],
    hotel: ['tourism="hotel"', 'tourism="motel"', 'tourism="guest_house"'],
    atm: ['amenity="atm"'],
    bank: ['amenity="bank"'],
    fuel: ['amenity="fuel"', 'amenity="charging_station"'],
    restroom: ['amenity="toilets"'],
    water: ['amenity="drinking_water"', 'man_made="water_well"'],
    food: ['amenity="fast_food"', 'amenity="food_court"'],
    park: ['leisure="park"', 'leisure="garden"'],
    police: ['amenity="police"'],
    fire_station: ['amenity="fire_station"'],
    general_store: ['shop="convenience"', 'shop="supermarket"', 'shop="general"', 'shop="department_store"'],
    medical: ['amenity="doctors"', 'amenity="clinic"', 'healthcare="doctor"'],
    bus_station: ['amenity="bus_station"', 'highway="bus_stop"'],
    train_station: ['railway="station"', 'public_transport="station"'],
    metro_station: ['station="subway"', 'railway="subway_entrance"'],
    parking: ['amenity="parking"'],
    post_office: ['amenity="post_office"'],
    school: ['amenity="school"'],
    college: ['amenity="college"', 'amenity="university"'],
    library: ['amenity="library"'],
    gym: ['leisure="fitness_centre"', 'leisure="sports_centre"'],
    shopping_mall: ['shop="mall"', 'shop="shopping_centre"'],
    market: ['amenity="marketplace"', 'shop="market"'],
  };

  async fetchNearbyPOIs(
    lat: number,
    lng: number,
    radius = 1000, // Changed to 1km radius (1000 meters)
    poiTypes: string[] = ["all"]
  ): Promise<OSMPOI[]> {
    try {
      console.log("🔍 OSM Service: Fetching POIs...");
      console.log("  📍 Location:", { lat, lng, radius });
      console.log("  🏷️ Types:", poiTypes);

      // Generate cache key
      const cacheKey = this.generateCacheKey(lat, lng, radius, poiTypes);

      // Try to get from cache first
      const cachedPOIs = await offlineStorage.getCachedPOIs<OSMPOI[]>(
        cacheKey,
        { lat, lng }
      );

      if (cachedPOIs && cachedPOIs.length > 0) {
        console.log("✅ Using cached POIs:", cachedPOIs.length);
        return cachedPOIs;
      }

      // If no cache or expired, fetch from API
      console.log("🌐 Fetching from OpenStreetMap API...");

      const typesToFetch =
        poiTypes.includes("all") || poiTypes.length === 0
          ? Object.keys(this.typeToOSMTags)
          : poiTypes;
      console.log("  ✅ Fetching types:", typesToFetch);

      const allPOIs: OSMPOI[] = [];
      const batchSize = 5;

      for (let i = 0; i < typesToFetch.length; i += batchSize) {
        const batch = typesToFetch.slice(i, i + batchSize);
        console.log(`  📦 Batch ${Math.floor(i / batchSize) + 1}:`, batch);

        const batchPOIs = await this.fetchBatch(lat, lng, batch, radius);
        console.log(
          `  ✅ Batch ${Math.floor(i / batchSize) + 1} returned ${
            batchPOIs.length
          } POIs`
        );

        allPOIs.push(...batchPOIs);
        if (i + batchSize < typesToFetch.length) await this.sleep(1000);
      }

      const uniquePOIs = this.removeDuplicates(allPOIs);
      const filteredPOIs = uniquePOIs.filter(
        (poi: OSMPOI) => poi.distance && poi.distance <= radius
      );

      console.log("  📊 Summary:");
      console.log("    - Total POIs fetched:", allPOIs.length);
      console.log("    - After deduplication:", uniquePOIs.length);
      console.log("    - After distance filter:", filteredPOIs.length);

      // Cache the results for offline access
      if (filteredPOIs.length > 0) {
        await offlineStorage.cachePOIs(cacheKey, filteredPOIs, { lat, lng });
        console.log("💾 Cached POIs for offline use (24 hours)");
      }

      return filteredPOIs;
    } catch (error) {
      console.error("❌ Error fetching POIs:", error);
      return [];
    }
  }

  private async fetchBatch(
    lat: number,
    lng: number,
    types: string[],
    radius: number,
    serverIdx = 0,
    retry = 0
  ): Promise<OSMPOI[]> {
    const maxRetries = 2;
    const servers = [this.overpassUrl, ...this.backupServers];
    const queries: string[] = [];

    for (const type of types) {
      const tags = this.typeToOSMTags[type] || [];
      for (const tag of tags.slice(0, 2)) {
        queries.push(
          "  node[" + tag + "](around:" + radius + "," + lat + "," + lng + ");"
        );
        queries.push(
          "  way[" + tag + "](around:" + radius + "," + lat + "," + lng + ");"
        );
      }
    }

    const query =
      "[out:json][timeout:20];(\n" + queries.join("\n") + "\n);out center;";
    const url = servers[serverIdx];

    console.log(
      `    🌐 Fetching from server ${serverIdx + 1}/${servers.length}: ${
        url.split("/")[2]
      }`
    );

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      const res = await fetch(url, {
        method: "POST",
        body: query,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      console.log(`    📡 Response status: ${res.status} ${res.statusText}`);

      if (res.ok === false) {
        if (res.status === 429 && serverIdx + 1 < servers.length) {
          console.log("    ⚠️ Rate limited, trying backup server...");
          await this.sleep(1000);
          return this.fetchBatch(lat, lng, types, radius, serverIdx + 1, 0);
        }
        if (res.status === 504 && serverIdx + 1 < servers.length) {
          console.log("    ⚠️ Timeout, trying backup server...");
          return this.fetchBatch(lat, lng, types, radius, serverIdx + 1, 0);
        }
        if (retry < maxRetries) {
          console.log(
            `    ⚠️ Error ${res.status}, retrying (${
              retry + 1
            }/${maxRetries})...`
          );
          await this.sleep(3000);
          return this.fetchBatch(lat, lng, types, radius, serverIdx, retry + 1);
        }
        console.log(`    ❌ Failed after ${maxRetries} retries`);
        return [];
      }

      const data = await res.json();
      const pois: OSMPOI[] = [];
      if (data.elements) {
        console.log(
          `    ✅ Received ${data.elements.length} elements from OSM`
        );
        for (const el of data.elements) {
          const poi = this.elementToPOI(el, types, lat, lng);
          if (poi && poi.distance && poi.distance <= radius) pois.push(poi);
        }
        console.log(`    ✅ Converted to ${pois.length} valid POIs`);
      } else {
        console.log("    ⚠️ No elements in response");
      }
      return pois;
    } catch (err: any) {
      console.log(`    ❌ Error: ${err.message}`);
      if (err.name === "AbortError" && serverIdx + 1 < servers.length) {
        console.log("    ⚠️ Request timeout, trying backup server...");
        return this.fetchBatch(lat, lng, types, radius, serverIdx + 1, 0);
      }
      if (retry < maxRetries) {
        console.log(`    ⚠️ Retrying (${retry + 1}/${maxRetries})...`);
        await this.sleep(2000);
        return this.fetchBatch(lat, lng, types, radius, serverIdx, retry + 1);
      }
      console.log(`    ❌ Failed after ${maxRetries} retries`);
      return [];
    }
  }

  private elementToPOI(
    el: OverpassElement,
    types: string[],
    userLat: number,
    userLng: number
  ): OSMPOI | null {
    const lat = el.lat || el.center?.lat;
    const lng = el.lon || el.center?.lon;
    if (!lat || !lng) return null;

    const detectedType = this.detectType(el.tags, types);
    if (!detectedType) return null;

    const name =
      el.tags?.name ||
      el.tags?.brand ||
      el.tags?.operator ||
      this.getDefaultName(detectedType);
    const distance = this.calcDistance(userLat, userLng, lat, lng);

    return {
      id: "osm_" + el.type + "_" + el.id,
      type: detectedType as any,
      name,
      lat,
      lng,
      distance,
      ratings: { safety: 4.0 },
      isBookmarked: false,
      address: el.tags?.["addr:street"] || Math.floor(distance) + "m away",
      openingHours: el.tags?.opening_hours,
      amenities: [],
    };
  }

  private detectType(tags: any = {}, types: string[]): string | null {
    for (const type of types) {
      const osmTags = this.typeToOSMTags[type] || [];
      for (const osmTag of osmTags) {
        const match = osmTag.match(/(\w+)="(.+)"/);
        if (match && tags[match[1]] === match[2]) return type;
      }
    }
    return null;
  }

  private getDefaultName(type: string): string {
    const names: Record<string, string> = {
      hospital: "Hospital",
      pharmacy: "Pharmacy",
      restaurant: "Restaurant",
      cafe: "Café",
      hotel: "Hotel",
      atm: "ATM",
      bank: "Bank",
      fuel: "Fuel Station",
      restroom: "Restroom",
      water: "Drinking Water",
      food: "Food Court",
      park: "Park",
      police: "Police",
      fire_station: "Fire Station",
      general_store: "General Store",
      medical: "Medical Center",
      bus_station: "Bus Station",
      train_station: "Train Station",
      metro_station: "Metro Station",
      parking: "Parking",
      post_office: "Post Office",
      school: "School",
      college: "College",
      library: "Library",
      gym: "Gym",
      shopping_mall: "Shopping Mall",
      market: "Market",
    };
    return names[type] || "POI";
  }

  private calcDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return Math.round(distance);
  }

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }

  private removeDuplicates(pois: OSMPOI[]): OSMPOI[] {
    const seen = new Map<string, OSMPOI>();
    for (const poi of pois) {
      const key =
        poi.lat.toFixed(6) + "_" + poi.lng.toFixed(6) + "_" + poi.name;
      if (!seen.has(key)) seen.set(key, poi);
    }
    return Array.from(seen.values());
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private generateCacheKey(
    lat: number,
    lng: number,
    radius: number,
    types: string[]
  ): string {
    const latRounded = lat.toFixed(3); // ~100m precision
    const lngRounded = lng.toFixed(3);
    const typesStr = types.sort().join("_");
    return `${latRounded}_${lngRounded}_${radius}_${typesStr}`;
  }

  clearCache(): void {
    offlineStorage.clearAllCaches();
  }

  getCacheStats() {
    return offlineStorage.getCacheStats();
  }
}

export const osmService = new OSMService();
