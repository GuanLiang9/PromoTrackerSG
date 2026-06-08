// One-time backfill: geocode active promos that have a location but no coords.
// Uses the same SG dictionary + Nominatim approach as the ingestion pipeline,
// reimplemented here in plain JS (scripts can't import the TS app modules).
// Usage: SUPABASE_DB_URL=... node scripts/geocode.mjs
import { Client } from "pg";

const SG_BOUNDS = { minLat: 1.13, maxLat: 1.48, minLng: 103.6, maxLng: 104.1 };
const inSG = (lat, lng) =>
  lat >= SG_BOUNDS.minLat && lat <= SG_BOUNDS.maxLat &&
  lng >= SG_BOUNDS.minLng && lng <= SG_BOUNDS.maxLng;

const NON_PLACES = ["islandwide", "island wide", "nationwide", "online", "app",
  "website", "various", "all outlets", "selected outlets",
  "participating outlets", "delivery", "everywhere"];

const SG_PLACES = {
  "marina bay sands": [1.2834, 103.8607], "gardens by the bay": [1.2816, 103.8636],
  "orchard road": [1.3048, 103.8318], "ion orchard": [1.3043, 103.8318],
  "orchard central": [1.3009, 103.8392], "ngee ann city": [1.3036, 103.8348],
  "313 somerset": [1.3009, 103.8385], "plaza singapura": [1.3007, 103.8452],
  "vivocity": [1.2643, 103.8222], "harbourfront": [1.2653, 103.8221],
  "sentosa": [1.2494, 103.8303], "resorts world sentosa": [1.254, 103.8238],
  "universal studios": [1.254, 103.8238], "jewel changi": [1.3601, 103.9896],
  "changi airport": [1.3592, 103.9894], "bugis junction": [1.2996, 103.8554],
  "bugis+": [1.3, 103.8556], "bugis": [1.3006, 103.8557], "suntec city": [1.295, 103.8593],
  "suntec": [1.295, 103.8593], "marina square": [1.2916, 103.857],
  "raffles city": [1.2937, 103.8536], "funan": [1.2913, 103.85],
  "clarke quay": [1.2907, 103.8465], "tampines mall": [1.3525, 103.9447],
  "tampines": [1.3496, 103.9568], "jurong east": [1.3331, 103.7422],
  "jem": [1.3331, 103.7434], "westgate": [1.3339, 103.7423], "imm": [1.3354, 103.7466],
  "jurong": [1.3329, 103.7436], "nex": [1.3508, 103.8719], "serangoon": [1.3497, 103.8737],
  "ang mo kio": [1.3691, 103.8454], "amk hub": [1.3692, 103.8484],
  "compass one": [1.3851, 103.8951], "sengkang": [1.3915, 103.8954],
  "punggol": [1.4043, 103.9023], "waterway point": [1.4068, 103.9023],
  "woodlands": [1.436, 103.7865], "causeway point": [1.4361, 103.7866],
  "northpoint": [1.4294, 103.8359], "yishun": [1.4294, 103.835],
  "hougang": [1.3713, 103.8927], "bedok": [1.3244, 103.9301],
  "bedok mall": [1.3253, 103.9295], "paya lebar": [1.3177, 103.8929],
  "paya lebar quarter": [1.3177, 103.8929], "katong": [1.3045, 103.9054],
  "i12 katong": [1.3043, 103.9053], "kallang": [1.3115, 103.8714],
  "singapore indoor stadium": [1.301, 103.8742], "national stadium": [1.3037, 103.8743],
  "sports hub": [1.3045, 103.8748], "dhoby ghaut": [1.299, 103.8456],
  "somerset": [1.3007, 103.8388], "tanjong pagar": [1.2766, 103.8458],
  "chinatown": [1.2829, 103.8443], "chinatown point": [1.2853, 103.8447],
  "little india": [1.3066, 103.8497], "tiong bahru": [1.2855, 103.827],
  "holland village": [1.311, 103.796], "dempsey": [1.3046, 103.81],
  "great world": [1.2937, 103.8324], "mandai": [1.4043, 103.793],
  "singapore zoo": [1.4043, 103.793], "east coast": [1.3009, 103.9123],
  "marina bay": [1.2834, 103.8607], "raffles place": [1.2843, 103.8515],
  "city hall": [1.2931, 103.852], "esplanade": [1.2899, 103.8557],
};
const PLACE_KEYS = Object.keys(SG_PLACES).sort((a, b) => b.length - a.length);

const norm = (s) => s.toLowerCase().replace(/\s+/g, " ").trim();

function fromDict(loc) {
  const t = norm(loc);
  if (!t || NON_PLACES.some((np) => t.includes(np))) return null;
  for (const k of PLACE_KEYS) if (t.includes(k)) return SG_PLACES[k];
  return null;
}

async function fromNominatim(loc) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    loc + ", Singapore",
  )}&format=json&limit=1&countrycodes=sg`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "PromoSG/1.0 (backfill; admin@promosg)" },
    });
    if (!res.ok) return null;
    const d = await res.json();
    if (!d.length) return null;
    const lat = Number(d[0].lat), lng = Number(d[0].lon);
    return Number.isFinite(lat) && Number.isFinite(lng) && inSG(lat, lng)
      ? [lat, lng] : null;
  } catch {
    return null;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const c = new Client({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});
await c.connect();
const { rows } = await c.query(
  `select id, location, title, description from public.promotions
   where status='active' and latitude is null`,
);
console.log(`Candidates (active, no coords): ${rows.length}`);

let dict = 0, net = 0, miss = 0;
for (const r of rows) {
  // Try the dictionary against location + title + description (free, no network).
  const dictText = [r.location, r.title, r.description].filter(Boolean).join(" ");
  let coords = fromDict(dictText);
  if (coords) {
    dict++;
  } else if (r.location && !NON_PLACES.some((np) => norm(r.location).includes(np))) {
    coords = await fromNominatim(r.location);
    await sleep(1100); // Nominatim usage policy: max ~1 req/sec
    if (coords) net++;
  }
  if (coords) {
    await c.query(
      `update public.promotions set latitude=$1, longitude=$2 where id=$3`,
      [coords[0], coords[1], r.id],
    );
  } else {
    miss++;
  }
}
console.log(`Geocoded — dictionary: ${dict}, nominatim: ${net}, unresolved: ${miss}`);

const { rows: tot } = await c.query(
  `select count(*) filter (where latitude is not null and status='active')::int withcoords,
          count(*) filter (where status='active')::int active
   from public.promotions`,
);
console.log("Active promos with coordinates:", tot[0]);
await c.end();
