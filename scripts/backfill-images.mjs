// Backfill: give every active promotion with no image a relevant stock photo.
// Mirrors lib/ingestion/image-resolver.ts (scripts can't import the TS module).
// Usage: SUPABASE_DB_URL=... node scripts/backfill-images.mjs
import { Client } from "pg";

const u = (id) => `https://images.unsplash.com/photo-${id}?w=800&q=80&auto=format&fit=crop`;

const CATEGORY_IMAGE = {
  food_beverage: u("1555396273-367ea4eb4db5"),
  shopping:      u("1483985988355-763728e1935b"),
  attractions:   u("1567361808960-dec9cb578182"),
  events:        u("1492684223066-81342ee5ff30"),
  travel:        u("1436491865332-7a61a109cc05"),
  credit_card:   u("1556742049-0cfed4f6a45d"),
  entertainment: u("1489599849927-2ee91cede3ba"),
  lifestyle:     u("1540555700478-4be289fbecef"),
};

const KEYWORD_IMAGE = {
  "mcdonald": u("1552566626-52f8b828add9"), "mcspicy": u("1552566626-52f8b828add9"),
  "burger king": u("1568901346375-23c9450c58cd"), "whopper": u("1568901346375-23c9450c58cd"),
  "burger": u("1568901346375-23c9450c58cd"),
  "kfc": u("1626645738196-c2a7c87a8f58"), "texas chicken": u("1626645738196-c2a7c87a8f58"),
  "fried chicken": u("1626645738196-c2a7c87a8f58"), "drumlet": u("1626645738196-c2a7c87a8f58"),
  "popeyes": u("1626645738196-c2a7c87a8f58"), "4fingers": u("1626645738196-c2a7c87a8f58"),
  "jollibee": u("1626645738196-c2a7c87a8f58"), "nugget": u("1562967914-608f82629710"),
  "fries": u("1552566626-52f8b828add9"), "subway": u("1509722747041-616f39b57569"),
  "sandwich": u("1509722747041-616f39b57569"), "hotdog": u("1509722747041-616f39b57569"),
  "pizza hut": u("1513104890138-7c749659a591"), "domino": u("1513104890138-7c749659a591"),
  "pizza": u("1513104890138-7c749659a591"),
  "bubble tea": u("1558857563-b371033873b8"), "milk tea": u("1558857563-b371033873b8"),
  "boba": u("1558857563-b371033873b8"), "gong cha": u("1558857563-b371033873b8"),
  "koi": u("1558857563-b371033873b8"), "liho": u("1558857563-b371033873b8"),
  "chagee": u("1558857563-b371033873b8"), "playmade": u("1558857563-b371033873b8"),
  "starbucks": u("1521017432531-fbd92d768814"), "coffee bean": u("1495474472287-4d71bcdd2085"),
  "matcha": u("1536256263959-770b48d82b0a"), "latte": u("1495474472287-4d71bcdd2085"),
  "espresso": u("1495474472287-4d71bcdd2085"), "kopi": u("1495474472287-4d71bcdd2085"),
  "cafe": u("1495474472287-4d71bcdd2085"), "café": u("1495474472287-4d71bcdd2085"),
  "coffee": u("1495474472287-4d71bcdd2085"), "juice": u("1600271886742-f049cd451bba"),
  "smoothie": u("1600271886742-f049cd451bba"),
  "gelato": u("1567206563064-6f60f40a2b57"), "ice cream": u("1567206563064-6f60f40a2b57"),
  "froyo": u("1567206563064-6f60f40a2b57"), "donut": u("1551024601-bec78aea704b"),
  "doughnut": u("1551024601-bec78aea704b"), "krispy kreme": u("1551024601-bec78aea704b"),
  "cake": u("1578985545062-69928b1d9587"), "dessert": u("1578985545062-69928b1d9587"),
  "waffle": u("1562376552-0d160a2f238d"), "bakery": u("1509440159596-0249088772ff"),
  "breadtalk": u("1509440159596-0249088772ff"), "bread": u("1509440159596-0249088772ff"),
  "croissant": u("1509440159596-0249088772ff"), "toast": u("1509440159596-0249088772ff"),
  "pastry": u("1509440159596-0249088772ff"),
  "sushi": u("1579871494447-9811cf80d66c"), "sashimi": u("1579871494447-9811cf80d66c"),
  "sushiro": u("1579871494447-9811cf80d66c"), "japanese": u("1579871494447-9811cf80d66c"),
  "donburi": u("1579871494447-9811cf80d66c"), "ramen": u("1569718212165-3a8278d5f624"),
  "udon": u("1569718212165-3a8278d5f624"), "noodle": u("1569718212165-3a8278d5f624"),
  "mee": u("1569718212165-3a8278d5f624"), "pasta": u("1551183053-bf91a1d81141"),
  "hotpot": u("1569058242253-92a9c755a0ec"), "hot pot": u("1569058242253-92a9c755a0ec"),
  "steamboat": u("1569058242253-92a9c755a0ec"), "shabu": u("1569058242253-92a9c755a0ec"),
  "suki": u("1569058242253-92a9c755a0ec"), "haidilao": u("1569058242253-92a9c755a0ec"),
  "buffet": u("1555396273-367ea4eb4db5"), "dim sum": u("1563245372-f21724e3856d"),
  "dumpling": u("1563245372-f21724e3856d"), "bao": u("1563245372-f21724e3856d"),
  "laksa": u("1565299585323-38d6b0865b47"), "prawn noodle": u("1565299585323-38d6b0865b47"),
  "chicken rice": u("1534422298391-e4f8c172dddb"), "nasi lemak": u("1540189549336-e6e99c3679fe"),
  "char kway teow": u("1559847844-5315695dadae"), "hokkien mee": u("1559847844-5315695dadae"),
  "bak kut teh": u("1547592180-85f173990554"), "porridge": u("1547592180-85f173990554"),
  "fish soup": u("1547592180-85f173990554"), "claypot": u("1565299624946-b28f40a0ae38"),
  "rice": u("1565299624946-b28f40a0ae38"), "satay": u("1529692236671-f1f6cf9683ba"),
  "bbq": u("1529692236671-f1f6cf9683ba"), "korean": u("1529692236671-f1f6cf9683ba"),
  "kbbq": u("1529692236671-f1f6cf9683ba"), "prata": u("1631515243349-e0cb75fb8d3a"),
  "thai": u("1559314809-0d155014e29e"), "char siu": u("1598971457999-ca4ef48a9a71"),
  "roast": u("1598971457999-ca4ef48a9a71"), "duck": u("1598971457999-ca4ef48a9a71"),
  "seafood": u("1558618666-fcd25c85cd64"), "crab": u("1558618666-fcd25c85cd64"),
  "prawn": u("1558618666-fcd25c85cd64"), "durian": u("1580189483393-fe6a9d7ac475"),
  "steak": u("1544025162-d76694265947"), "western": u("1544025162-d76694265947"),
  "curry puff": u("1567620905732-2d1ec7ab7445"), "snack": u("1567620905732-2d1ec7ab7445"),
  "hawker": u("1414235077428-338989a2e8c0"), "food court": u("1414235077428-338989a2e8c0"),
  "food republic": u("1414235077428-338989a2e8c0"), "brunch": u("1525351484163-7529414344d8"),
  "breakfast": u("1525351484163-7529414344d8"),
  "uniqlo": u("1441986300917-64674bd600d8"), "fashion": u("1441986300917-64674bd600d8"),
  "apparel": u("1441986300917-64674bd600d8"), "sephora": u("1596462502278-27bfdc403348"),
  "beauty": u("1596462502278-27bfdc403348"), "skincare": u("1596462502278-27bfdc403348"),
  "ikea": u("1556909114-f6e7ad7d3136"), "furniture": u("1556909114-f6e7ad7d3136"),
  "home": u("1556909114-f6e7ad7d3136"), "challenger": u("1517336714731-489689fd1ca8"),
  "laptop": u("1517336714731-489689fd1ca8"), "electronics": u("1517336714731-489689fd1ca8"),
  "gadget": u("1517336714731-489689fd1ca8"), "sale": u("1483985988355-763728e1935b"),
  "voucher": u("1556742049-0cfed4f6a45d"), "cashback": u("1556742049-0cfed4f6a45d"),
  "credit card": u("1556742049-0cfed4f6a45d"), "miles": u("1580048915913-4f8f5cb481c4"),
  "flight": u("1436491865332-7a61a109cc05"), "airline": u("1436491865332-7a61a109cc05"),
  "hotel": u("1551882547-ff40c63fe5fa"), "staycation": u("1551882547-ff40c63fe5fa"),
  "resort": u("1551882547-ff40c63fe5fa"), "zoo": u("1503656142023-618e7d1f435a"),
  "safari": u("1503656142023-618e7d1f435a"), "garden": u("1567361808960-dec9cb578182"),
  "universal studios": u("1597466599360-3b9775841aec"), "theme park": u("1597466599360-3b9775841aec"),
  "sentosa": u("1597466599360-3b9775841aec"), "museum": u("1518998053901-5348d3961a04"),
  "movie": u("1489599849927-2ee91cede3ba"), "cinema": u("1489599849927-2ee91cede3ba"),
  "concert": u("1470229722913-7c0e2dbbafd3"), "festival": u("1492684223066-81342ee5ff30"),
  "market": u("1533174072545-7a4b6ad7a6c3"), "pop-up": u("1533174072545-7a4b6ad7a6c3"),
  "spa": u("1540555700478-4be289fbecef"), "massage": u("1540555700478-4be289fbecef"),
  "gym": u("1534438327276-14e5300c3a48"), "fitness": u("1534438327276-14e5300c3a48"),
  "yoga": u("1544367567-0f2fcb009e0b"), "salon": u("1560066984-138dadb4c035"),
  "hair": u("1560066984-138dadb4c035"), "escape room": u("1511512578047-dfb367046420"),
};

const SORTED_KEYS = Object.keys(KEYWORD_IMAGE).sort((a, b) => b.length - a.length);

function resolveImage(title, description, category) {
  const text = `${title} ${description ?? ""}`.toLowerCase();
  for (const key of SORTED_KEYS) if (text.includes(key)) return { url: KEYWORD_IMAGE[key], byKeyword: true };
  return { url: CATEGORY_IMAGE[category] ?? CATEGORY_IMAGE.lifestyle, byKeyword: false };
}

const c = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
// Replace missing images AND broken/ephemeral Telegram URLs:
//  - telesco.pe  → short-lived tokens that 404 within hours
//  - telegram.org/img/emoji → a tiny emoji icon grabbed by mistake
const { rows } = await c.query(
  `select id, title, description, category from public.promotions
   where status='active'
     and (image_url is null or image_url = ''
          or image_url ilike '%telesco.pe%'
          or image_url ilike '%telegram.org%')`,
);
console.log(`Active promos needing an image (null/broken Telegram): ${rows.length}`);

let byKeyword = 0, byCategory = 0;
for (const r of rows) {
  const { url, byKeyword: kw } = resolveImage(r.title, r.description, r.category);
  await c.query(`update public.promotions set image_url=$1 where id=$2`, [url, r.id]);
  if (kw) byKeyword++; else byCategory++;
}
console.log(`Filled: ${byKeyword} by keyword, ${byCategory} by category default.`);

const { rows: left } = await c.query(
  `select count(*)::int n from public.promotions
   where status='active'
     and (image_url is null or image_url='' or image_url ilike '%telesco.pe%' or image_url ilike '%telegram.org%')`,
);
console.log(`Active promos still without a stable image: ${left[0].n}`);
await c.end();
