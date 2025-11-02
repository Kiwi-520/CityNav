/**
 * OpenStreetMap Overpass API Service
 */

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
    hospital: ['amenity="hospital"', 'amenity="clinic"'],
    pharmacy: ['amenity="pharmacy"'],
    restaurant: ['amenity="restaurant"'],
    cafe: ['amenity="cafe"'],
    hotel: ['tourism="hotel"'],
    atm: ['amenity="atm"'],
    bank: ['amenity="bank"'],
    fuel: ['amenity="fuel"'],
    restroom: ['amenity="toilets"'],
    water: ['amenity="drinking_water"'],
    food: ['amenity="fast_food"'],
    park: ['leisure="park"'],
    police: ['amenity="police"'],
    fire_station: ['amenity="fire_station"'],
  };

  async fetchNearbyPOIs(
    lat: number,
    lng: number,
    radius = 2000,
    poiTypes: string[] = ["all"]
  ): Promise<OSMPOI[]> {
    try {
      console.log("🔍 OSM Service: Fetching POIs...");
      console.log("  📍 Location:", { lat, lng, radius });
      console.log("  🏷️ Types:", poiTypes);

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
    };
    return names[type] || "POI";
  }

  private calcDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371000;
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
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
}

export const osmService = new OSMService();
