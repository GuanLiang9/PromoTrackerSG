import { haversineKm } from "@/lib/geo/distance";
import type { Promotion } from "@/lib/types";

/** Named Singapore zones used for the map "Hot Zones" feature. */
export interface Zone {
  name: string;
  lat: number;
  lng: number;
}

export const ZONES: Zone[] = [
  { name: "Orchard", lat: 1.3048, lng: 103.8318 },
  { name: "Marina Bay", lat: 1.2834, lng: 103.8607 },
  { name: "HarbourFront / VivoCity", lat: 1.2643, lng: 103.8222 },
  { name: "Bugis", lat: 1.3, lng: 103.8558 },
  { name: "Chinatown", lat: 1.282, lng: 103.8443 },
  { name: "City Hall", lat: 1.2931, lng: 103.8520 },
  { name: "Tampines", lat: 1.3536, lng: 103.945 },
  { name: "Jurong East", lat: 1.3331, lng: 103.7422 },
  { name: "Sentosa", lat: 1.2494, lng: 103.8303 },
  { name: "Changi", lat: 1.3644, lng: 103.9915 },
  { name: "Woodlands", lat: 1.4382, lng: 103.789 },
  { name: "Punggol", lat: 1.4041, lng: 103.9025 },
  { name: "Serangoon", lat: 1.3496, lng: 103.8737 },
  { name: "Novena", lat: 1.3203, lng: 103.8438 },
];

const MAX_ZONE_RADIUS_KM = 3;

/** Nearest named zone to a coordinate (within radius), or null. */
export function assignZone(lat: number, lng: number): Zone | null {
  let best: Zone | null = null;
  let bestKm = Infinity;
  for (const z of ZONES) {
    const km = haversineKm({ lat, lng }, { lat: z.lat, lng: z.lng });
    if (km < bestKm) {
      bestKm = km;
      best = z;
    }
  }
  return best && bestKm <= MAX_ZONE_RADIUS_KM ? best : null;
}

export interface HotZone extends Zone {
  count: number;
}

/** Rank zones by how many promotions fall within them. */
export function computeHotZones(promotions: Promotion[], limit = 6): HotZone[] {
  const counts = new Map<string, HotZone>();
  for (const p of promotions) {
    if (p.latitude == null || p.longitude == null) continue;
    const z = assignZone(p.latitude, p.longitude);
    if (!z) continue;
    const cur = counts.get(z.name);
    if (cur) cur.count++;
    else counts.set(z.name, { ...z, count: 1 });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}
