/**
 * Free geocoding for Singapore promotion locations — no API key, no AI cost.
 *
 * Strategy:
 *   1. Match against a built-in dictionary of common SG malls/landmarks/areas
 *      (instant, no network).
 *   2. Fall back to OpenStreetMap Nominatim (free; rate-limited to ~1 req/sec,
 *      requires a descriptive User-Agent).
 * Results are bounds-checked to Singapore. Returns null if unresolved or if the
 * location is clearly not a place ("islandwide", "online", etc.).
 */

export interface LatLng {
  lat: number;
  lng: number;
}

// Singapore bounding box (a little generous to include offshore islands).
const SG_BOUNDS = { minLat: 1.13, maxLat: 1.48, minLng: 103.6, maxLng: 104.1 };

function inSingapore(lat: number, lng: number): boolean {
  return (
    lat >= SG_BOUNDS.minLat &&
    lat <= SG_BOUNDS.maxLat &&
    lng >= SG_BOUNDS.minLng &&
    lng <= SG_BOUNDS.maxLng
  );
}

/** Locations that are not a single pinnable place. */
const NON_PLACES = [
  "islandwide",
  "island wide",
  "nationwide",
  "online",
  "app",
  "website",
  "various",
  "all outlets",
  "selected outlets",
  "participating outlets",
  "delivery",
  "everywhere",
];

/**
 * Common Singapore malls, attractions and areas → coordinates. Keys are matched
 * as case-insensitive substrings of the location text, longest key first.
 */
const SG_PLACES: Record<string, LatLng> = {
  "marina bay sands": { lat: 1.2834, lng: 103.8607 },
  "gardens by the bay": { lat: 1.2816, lng: 103.8636 },
  "orchard road": { lat: 1.3048, lng: 103.8318 },
  "ion orchard": { lat: 1.3043, lng: 103.8318 },
  "orchard central": { lat: 1.3009, lng: 103.8392 },
  "ngee ann city": { lat: 1.3036, lng: 103.8348 },
  "313 somerset": { lat: 1.3009, lng: 103.8385 },
  "plaza singapura": { lat: 1.3007, lng: 103.8452 },
  vivocity: { lat: 1.2643, lng: 103.8222 },
  "harbourfront": { lat: 1.2653, lng: 103.8221 },
  sentosa: { lat: 1.2494, lng: 103.8303 },
  "resorts world sentosa": { lat: 1.2540, lng: 103.8238 },
  "universal studios": { lat: 1.254, lng: 103.8238 },
  "jewel changi": { lat: 1.3601, lng: 103.9896 },
  "changi airport": { lat: 1.3592, lng: 103.9894 },
  "bugis junction": { lat: 1.2996, lng: 103.8554 },
  "bugis+": { lat: 1.3, lng: 103.8556 },
  bugis: { lat: 1.3006, lng: 103.8557 },
  "suntec city": { lat: 1.295, lng: 103.8593 },
  "suntec": { lat: 1.295, lng: 103.8593 },
  "marina square": { lat: 1.2916, lng: 103.857 },
  "raffles city": { lat: 1.2937, lng: 103.8536 },
  "funan": { lat: 1.2913, lng: 103.85 },
  "clarke quay": { lat: 1.2907, lng: 103.8465 },
  "tampines mall": { lat: 1.3525, lng: 103.9447 },
  "tampines": { lat: 1.3496, lng: 103.9568 },
  "jurong east": { lat: 1.3331, lng: 103.7422 },
  "jem": { lat: 1.3331, lng: 103.7434 },
  "westgate": { lat: 1.3339, lng: 103.7423 },
  "imm": { lat: 1.3354, lng: 103.7466 },
  "jurong": { lat: 1.3329, lng: 103.7436 },
  "nex": { lat: 1.3508, lng: 103.8719 },
  "serangoon": { lat: 1.3497, lng: 103.8737 },
  "ang mo kio": { lat: 1.3691, lng: 103.8454 },
  "amk hub": { lat: 1.3692, lng: 103.8484 },
  "compass one": { lat: 1.3851, lng: 103.8951 },
  "sengkang": { lat: 1.3915, lng: 103.8954 },
  "punggol": { lat: 1.4043, lng: 103.9023 },
  "waterway point": { lat: 1.4068, lng: 103.9023 },
  "woodlands": { lat: 1.4360, lng: 103.7865 },
  "causeway point": { lat: 1.4361, lng: 103.7866 },
  "northpoint": { lat: 1.4294, lng: 103.8359 },
  "yishun": { lat: 1.4294, lng: 103.835 },
  "hougang": { lat: 1.3713, lng: 103.8927 },
  "bedok": { lat: 1.3244, lng: 103.9301 },
  "bedok mall": { lat: 1.3253, lng: 103.9295 },
  "paya lebar": { lat: 1.3177, lng: 103.8929 },
  "paya lebar quarter": { lat: 1.3177, lng: 103.8929 },
  "katong": { lat: 1.3045, lng: 103.9054 },
  "i12 katong": { lat: 1.3043, lng: 103.9053 },
  "kallang": { lat: 1.3115, lng: 103.8714 },
  "singapore indoor stadium": { lat: 1.301, lng: 103.8742 },
  "national stadium": { lat: 1.3037, lng: 103.8743 },
  "sports hub": { lat: 1.3045, lng: 103.8748 },
  "dhoby ghaut": { lat: 1.299, lng: 103.8456 },
  "somerset": { lat: 1.3007, lng: 103.8388 },
  "tanjong pagar": { lat: 1.2766, lng: 103.8458 },
  "chinatown": { lat: 1.2829, lng: 103.8443 },
  "chinatown point": { lat: 1.2853, lng: 103.8447 },
  "little india": { lat: 1.3066, lng: 103.8497 },
  "tiong bahru": { lat: 1.2855, lng: 103.827 },
  "holland village": { lat: 1.311, lng: 103.796 },
  "dempsey": { lat: 1.3046, lng: 103.81 },
  "great world": { lat: 1.2937, lng: 103.8324 },
  "mandai": { lat: 1.4043, lng: 103.793 },
  "singapore zoo": { lat: 1.4043, lng: 103.793 },
  "east coast": { lat: 1.3009, lng: 103.9123 },
  "marina bay": { lat: 1.2834, lng: 103.8607 },
  "raffles place": { lat: 1.2843, lng: 103.8515 },
  "city hall": { lat: 1.2931, lng: 103.8520 },
  "esplanade": { lat: 1.2899, lng: 103.8557 },
};

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Dictionary lookup only — synchronous, no network. */
export function geocodeFromDictionary(location: string): LatLng | null {
  const text = normalize(location);
  if (!text) return null;
  if (NON_PLACES.some((np) => text.includes(np))) return null;

  // Longest keys first so "ion orchard" wins over "orchard".
  const keys = Object.keys(SG_PLACES).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (text.includes(key)) return SG_PLACES[key];
  }
  return null;
}

/** Query OpenStreetMap Nominatim (free). Returns null on miss/failure. */
async function geocodeFromNominatim(location: string): Promise<LatLng | null> {
  const q = encodeURIComponent(`${location}, Singapore`);
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=sg`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "PromoSG/1.0 (singapore promotions map; contact: admin@promosg)",
        Accept: "application/json",
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { lat: string; lon: string }[];
    if (!data.length) return null;
    const lat = Number(data[0].lat);
    const lng = Number(data[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (!inSingapore(lat, lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

/**
 * Resolve a location string to coordinates. Tries the dictionary first (free,
 * instant); if `allowNetwork` is true, falls back to Nominatim.
 */
export async function geocodeLocation(
  location: string | null | undefined,
  allowNetwork = true,
): Promise<LatLng | null> {
  if (!location) return null;
  const dict = geocodeFromDictionary(location);
  if (dict) return dict;
  if (NON_PLACES.some((np) => normalize(location).includes(np))) return null;
  if (!allowNetwork) return null;
  return geocodeFromNominatim(location);
}
