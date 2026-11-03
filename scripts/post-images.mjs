// Replace stock photos with the real photo from each Telegram promo post.
// Telegram CDN links expire, so each photo is downloaded and re-hosted in the
// public `promo-images` bucket. Safe to re-run; only touches promos whose
// image_url is still an Unsplash stock URL. Run: node --env-file=.env.local scripts/post-images.mjs
import { createClient } from "@supabase/supabase-js";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !SVC) { console.error("Missing Supabase env"); process.exit(1); }
const admin = createClient(URL_, SVC, { auth: { persistSession: false } });
const UA = "Mozilla/5.0 (compatible; PromoSGBot/1.0)";
const BUCKET = "promo-images";

const { data: promos, error } = await admin
  .from("promotions")
  .select("id, source_url, image_url")
  .eq("status", "active")
  .like("source_url", "https://t.me/%")
  .like("image_url", "%images.unsplash.com%");
if (error) { console.error(error.message); process.exit(1); }

async function postPhotoUrl(sourceUrl) {
  const res = await fetch(`${sourceUrl}?embed=1&mode=tme`, { headers: { "User-Agent": UA } });
  if (!res.ok) return null;
  const html = await res.text();
  const m =
    html.match(/tgme_widget_message_photo_wrap[^>]*background-image:url\('([^']+)'\)/) ||
    html.match(/tgme_widget_message_link_preview[\s\S]*?background-image:url\('([^']+)'\)/) ||
    html.match(/<meta property="og:image" content="([^"]+)"/);
  return m ? m[1].replace(/&amp;/g, "&") : null;
}

let ok = 0, none = 0, failed = 0;
for (const p of promos) {
  try {
    const photo = await postPhotoUrl(p.source_url);
    if (!photo || /telegram\.org\/img|t_logo/.test(photo)) { none++; continue; }
    const img = await fetch(photo, { headers: { "User-Agent": UA } });
    if (!img.ok) { failed++; continue; }
    const type = img.headers.get("content-type") || "image/jpeg";
    if (!type.startsWith("image/")) { failed++; continue; }
    const buf = Buffer.from(await img.arrayBuffer());
    const path = `${p.source_url.replace("https://t.me/", "").replace(/\//g, "_")}.${type.includes("png") ? "png" : "jpg"}`;
    const up = await admin.storage.from(BUCKET).upload(path, buf, { contentType: type, upsert: true });
    if (up.error) { console.log("upload fail", path, up.error.message); failed++; continue; }
    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
    await admin.from("promotions").update({ image_url: pub.publicUrl }).eq("id", p.id);
    ok++;
    console.log("  ✓", p.source_url);
  } catch (e) {
    failed++; console.log("  ✗", p.source_url, e.message);
  }
}
console.log(`post-images: candidates=${promos.length} replaced=${ok} no-photo=${none} failed=${failed}`);
