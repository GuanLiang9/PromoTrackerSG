import "server-only";
import { FOOD_SPOTS, type CuisineType } from "@/lib/food/spots";
import { JB_FOOD_SPOTS } from "@/lib/food/jb-spots";
import { createClient } from "@/lib/supabase/server";

export interface NearbyVenue {
  name: string;
  cuisine: CuisineType | null;
  area: string | null;
  distanceM: number;
  source: "curated" | "osm" | "community";
  /** Number of check-ins at this venue (community source only). */
  count?: number;
}

export interface NearbyResult {
  venues: NearbyVenue[];
  /** Reverse-geocoded neighbourhood/area for auto-filling the Area field. */
  area: string | null;
}

const UA = "PromoSG/1.0 (singapore food check-ins; contact: admin@promosg)";

/** Metres between two WGS84 points (haversine). */
function distanceM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6_371_000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

// ── Curated venues ─────────────────────────────────────────────────────────
const CURATED = [...FOOD_SPOTS, ...JB_FOOD_SPOTS].filter(
  (s): s is typeof s & { lat: number; lng: number } => s.lat != null && s.lng != null,
);

function nearbyCurated(lat: number, lng: number, radiusM: number): NearbyVenue[] {
  return CURATED.map((s) => ({
    name: s.name,
    cuisine: s.cuisine,
    area: s.area,
    distanceM: distanceM(lat, lng, s.lat, s.lng),
    source: "curated" as const,
  }))
    .filter((v) => v.distanceM <= radiusM)
    .sort((a, b) => a.distanceM - b.distanceM);
}

// ── OpenStreetMap (Overpass) live venues ─────────────────────────────────────
// Map OSM cuisine / amenity tags onto our CuisineType (best-effort).
const OSM_CUISINE: Record<string, CuisineType> = {
  chinese: "chinese", cantonese: "chinese", dim_sum: "chinese", noodle: "chinese",
  malaysian: "malay", malay: "malay", indonesian: "malay",
  indian: "indian", north_indian: "indian", south_indian: "indian",
  japanese: "japanese", sushi: "japanese", ramen: "japanese",
  korean: "korean", thai: "thai", vietnamese: "vietnamese",
  western: "western", american: "western", burger: "western", steak_house: "western",
  italian: "western", pizza: "western", french: "western",
  seafood: "seafood", coffee_shop: "cafe", cafe: "cafe", coffee: "cafe",
  ice_cream: "dessert", dessert: "dessert", cake: "dessert", bakery: "dessert",
  peranakan: "peranakan",
};

function mapOsmCuisine(tags: Record<string, string>): CuisineType | null {
  const raw = (tags.cuisine ?? "").toLowerCase().split(/[;,]/)[0]?.trim();
  if (raw && OSM_CUISINE[raw]) return OSM_CUISINE[raw];
  if (tags.amenity === "cafe") return "cafe";
  if (tags.amenity === "fast_food") return "western";
  if (tags.amenity === "ice_cream") return "dessert";
  return null;
}

interface OverpassEl {
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

async function nearbyOsm(lat: number, lng: number, radiusM: number): Promise<NearbyVenue[]> {
  const filter = '["amenity"~"restaurant|cafe|fast_food|food_court|bar|pub|ice_cream"]';
  const query = `[out:json][timeout:15];(node${filter}(around:${radiusM},${lat},${lng});way${filter}(around:${radiusM},${lat},${lng}););out center 50;`;
  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { elements?: OverpassEl[] };
    const out: NearbyVenue[] = [];
    for (const el of json.elements ?? []) {
      const tags = el.tags ?? {};
      const name = tags.name?.trim();
      if (!name) continue;
      const eLat = el.lat ?? el.center?.lat;
      const eLng = el.lon ?? el.center?.lon;
      if (eLat == null || eLng == null) continue;
      out.push({
        name,
        cuisine: mapOsmCuisine(tags),
        area: tags["addr:suburb"] || tags["addr:neighbourhood"] || null,
        distanceM: distanceM(lat, lng, eLat, eLng),
        source: "osm",
      });
    }
    return out.sort((a, b) => a.distanceM - b.distanceM);
  } catch {
    return [];
  }
}

// ── Community venues (crowd-sourced from check-ins, identity-hidden) ──────────
interface CommunityRow {
  name: string;
  cuisine: string | null;
  area: string | null;
  distance_m: number;
  check_in_count: number;
}

async function nearbyCommunity(lat: number, lng: number, radiusM: number): Promise<NearbyVenue[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("nearby_community_venues", {
      in_lat: lat,
      in_lng: lng,
      radius_m: radiusM,
    });
    if (error || !data) return [];
    return (data as CommunityRow[]).map((r) => ({
      name: r.name,
      cuisine: (r.cuisine as CuisineType | null) ?? null,
      area: r.area,
      distanceM: r.distance_m,
      source: "community" as const,
      count: r.check_in_count,
    }));
  } catch {
    return [];
  }
}

// ── Reverse geocode (area) ───────────────────────────────────────────────────
async function reverseGeocodeArea(lat: number, lng: number): Promise<string | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=16&addressdetails=1`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { address?: Record<string, string> };
    const a = data.address ?? {};
    return (
      a.suburb || a.neighbourhood || a.quarter || a.city_district || a.town || a.city || null
    );
  } catch {
    return null;
  }
}

// ── Combined, deduped, cached ────────────────────────────────────────────────
const cache = new Map<string, { at: number; result: NearbyResult }>();
const TTL = 10 * 60 * 1000;

export async function getNearbyVenues(lat: number, lng: number): Promise<NearbyResult> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.result;

  const curated = nearbyCurated(lat, lng, 350);
  const [community, osm, area] = await Promise.all([
    nearbyCommunity(lat, lng, 250),
    nearbyOsm(lat, lng, 200),
    reverseGeocodeArea(lat, lng),
  ]);

  // Priority curated → community → osm: curated has the richest metadata,
  // community is proven real-user data that fills gaps OSM misses. Dedupe by name.
  const seen = new Set<string>();
  const merged: NearbyVenue[] = [];
  for (const v of [...curated, ...community, ...osm]) {
    const k = v.name.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    merged.push(v);
  }
  merged.sort((a, b) => a.distanceM - b.distanceM);

  const result: NearbyResult = { venues: merged.slice(0, 12), area };
  cache.set(key, { at: Date.now(), result });
  return result;
}
