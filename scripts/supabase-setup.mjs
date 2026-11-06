// One-time Supabase setup: npm run supabase:setup
//
// 1. Creates the storage buckets (products: public; designs, receipts, settings: private).
// 2. Checks the tables from supabase/schema.sql exist.
// 3. If Supabase has no products yet and the local data/ folder has some
//    (added while running on your computer), copies those products, their
//    photos and the saved prices / delivery fees in.
//
// Safe to run again: it never overwrites products that are already there.
import { createClient } from "@supabase/supabase-js";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const TYPES = ["image/png", "image/jpeg", "image/webp"];
const MB = 1024 * 1024;
const BUCKETS = [
  { id: "products", public: true, fileSizeLimit: 20 * MB },
  { id: "designs", public: false, fileSizeLimit: 15 * MB },
  { id: "receipts", public: false, fileSizeLimit: 10 * MB },
  { id: "settings", public: false, fileSizeLimit: 256 * 1024, types: ["application/json"] },
];

for (const b of BUCKETS) {
  const options = { public: b.public, fileSizeLimit: b.fileSizeLimit, allowedMimeTypes: b.types ?? TYPES };
  const { error: missing } = await db.storage.getBucket(b.id);
  const { error } = missing ? await db.storage.createBucket(b.id, options) : await db.storage.updateBucket(b.id, options);
  if (error) throw new Error(`Bucket ${b.id}: ${error.message}`);
  console.log(`✓ bucket ${b.id} (${b.public ? "public" : "private"})`);
}

for (const table of ["products", "orders"]) {
  const { error } = await db.from(table).select("id").limit(1);
  if (error) {
    console.error(`\n✗ The "${table}" table is missing (${error.message}).`);
    console.error("  Open Supabase → SQL Editor, paste supabase/schema.sql, press Run, then run this again.");
    process.exit(1);
  }
  console.log(`✓ table ${table}`);
}

const dataDir = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
const { count } = await db.from("products").select("id", { head: true, count: "exact" });
const file = path.join(dataDir, "products.json");
if (count) {
  console.log(`✓ ${count} products already in Supabase, nothing to import`);
} else if (!existsSync(file)) {
  console.log("✓ no local products to import");
} else {
  const rows = JSON.parse(readFileSync(file, "utf8"));
  const publicBase = `${url}/storage/v1/object/public/products/`;
  for (const row of rows) {
    for (const img of row.data.images) {
      if (!img.src.startsWith("/media/")) continue;
      const name = img.src.slice("/media/".length);
      const { error } = await db.storage
        .from("products")
        .upload(name, readFileSync(path.join(dataDir, "files", "products", name)), { contentType: "image/webp", cacheControl: "31536000", upsert: true });
      if (error) throw new Error(`Photo ${name}: ${error.message}`);
      img.src = publicBase + name;
    }
  }
  const { error } = await db.from("products").insert(rows.map((r) => ({ id: r.id, position: r.position, data: r.data })));
  if (error) throw new Error(`Products: ${error.message}`);
  console.log(`✓ imported ${rows.length} products and their photos`);

  const settingsDir = path.join(dataDir, "files", "settings");
  for (const name of ["pricing.json", "delivery-fees.json", "finance.json"]) {
    if (!existsSync(path.join(settingsDir, name))) continue;
    const { error: e } = await db.storage
      .from("settings")
      .upload(name, readFileSync(path.join(settingsDir, name)), { contentType: "application/json", upsert: true });
    if (e) throw new Error(`Settings ${name}: ${e.message}`);
    console.log(`✓ imported ${name}`);
  }
}
if (existsSync(path.join(dataDir, "orders")) && readdirSync(path.join(dataDir, "orders")).some((n) => n.endsWith(".json") && n !== "_counter.json")) {
  console.log("ℹ local test orders in data/orders are not copied (they were placed while testing).");
}
console.log("\nSupabase is ready.");
