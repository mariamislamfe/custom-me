import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Where the store keeps what it saves: products, orders and files.
 *
 * - **Supabase** (production, any host including Vercel): used as soon as
 *   NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set. Products
 *   and orders live in Postgres (supabase/schema.sql), files in Storage.
 * - **Local folder** (your computer, or a server with a persistent disk):
 *   everything goes in `data/` (or DATA_DIR). Serverless hosts wipe their
 *   disk, so don't run the live shop this way on Vercel.
 *
 * The rest of the app only talks to this module.
 */

export type Bucket = "products" | "designs" | "receipts" | "settings";
export type Row<T> = { id: string; position: number; data: T; updated_at: string };
export type OrderRow<T> = { id: string; number: number; data: T };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
export const usingSupabase = () => Boolean(SUPABASE_URL && SERVICE_KEY);

/** Order numbers start here: CM-1001, CM-1002… */
const FIRST_ORDER_NUMBER = 1001;

// ── Supabase ─────────────────────────────────────────────────────

let client: SupabaseClient | undefined;

function db() {
  client ??= createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    // Never let Next's fetch cache keep database answers; caching happens one level up
    // ("use cache" + tags in catalog-data.ts), where the dashboard can clear it.
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
  return client;
}

const bucket = (b: Bucket) => db().storage.from(b);

// ── Local folder ─────────────────────────────────────────────────

export const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const ORDERS_DIR = path.join(DATA_DIR, "orders");
const COUNTER_FILE = path.join(ORDERS_DIR, "_counter.json");
const filePath = (b: Bucket, name: string) => path.join(DATA_DIR, "files", b, ...name.split("/"));

async function readJsonFile<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw err;
  }
}

/**
 * Atomic replace. Windows refuses to rename over a file another request is
 * reading at that instant (EPERM/EBUSY), so retry briefly before giving up.
 */
async function writeFileAtomic(file: string, data: string | Buffer) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  await fs.writeFile(tmp, data);
  for (let attempt = 0; ; attempt++) {
    try {
      await fs.rename(tmp, file);
      return;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if ((code !== "EPERM" && code !== "EBUSY" && code !== "EACCES") || attempt >= 12) {
        await fs.rm(tmp, { force: true });
        throw err;
      }
      await new Promise((r) => setTimeout(r, 25 * (attempt + 1)));
    }
  }
}

// One writer at a time in this process, so two saves can't interleave.
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>) {
  const run = queue.then(fn);
  queue = run.catch(() => undefined);
  return run;
}

type LocalOrder<T> = { id: string; number: number; client_key: string; created_at: string; data: T };

async function localOrders<T>(): Promise<LocalOrder<T>[]> {
  let names: string[];
  try {
    names = await fs.readdir(ORDERS_DIR);
  } catch {
    return [];
  }
  const rows = await Promise.all(
    names.filter((n) => /^[a-f0-9-]{36}\.json$/.test(n)).map((n) => readJsonFile<LocalOrder<T> | null>(path.join(ORDERS_DIR, n), null)),
  );
  return rows.filter((r): r is LocalOrder<T> => Boolean(r));
}

// ── Products ─────────────────────────────────────────────────────

export async function readProductRows<T>(): Promise<Row<T>[]> {
  if (usingSupabase()) {
    const { data, error } = await db().from("products").select("id, position, data, updated_at").order("position");
    if (error) throw new Error(`Couldn't load products: ${error.message}`);
    return data as Row<T>[];
  }
  const rows = await readJsonFile<Row<T>[]>(PRODUCTS_FILE, []);
  return [...rows].sort((a, b) => a.position - b.position);
}

/** Writes the rows that changed and deletes the ones that are gone. */
export async function writeProductRows<T>(changed: Row<T>[], gone: string[]) {
  if (usingSupabase()) {
    if (changed.length) {
      const { error } = await db().from("products").upsert(changed);
      if (error) throw new Error(`Couldn't save products: ${error.message}`);
    }
    if (gone.length) {
      const { error } = await db().from("products").delete().in("id", gone);
      if (error) throw new Error(`Couldn't delete products: ${error.message}`);
    }
    return;
  }
  await serial(async () => {
    const rows = await readJsonFile<Row<T>[]>(PRODUCTS_FILE, []);
    const byId = new Map(rows.map((r) => [r.id, r]));
    for (const r of changed) byId.set(r.id, r);
    for (const id of gone) byId.delete(id);
    await writeFileAtomic(PRODUCTS_FILE, JSON.stringify([...byId.values()], null, 2));
  });
}

// ── Orders ───────────────────────────────────────────────────────

/** Newest first. */
export async function readOrderRows<T>(): Promise<OrderRow<T>[]> {
  if (usingSupabase()) {
    const { data, error } = await db().from("orders").select("id, number, data").order("number", { ascending: false });
    if (error) throw new Error(`Couldn't load orders: ${error.message}`);
    return data as OrderRow<T>[];
  }
  const rows = await localOrders<T>();
  return rows.sort((a, b) => b.number - a.number).map(({ id, number, data }) => ({ id, number, data }));
}

export async function readOrderRow<T>(id: string): Promise<OrderRow<T> | null> {
  if (!/^[a-f0-9-]{36}$/.test(id)) return null;
  if (usingSupabase()) {
    const { data, error } = await db().from("orders").select("id, number, data").eq("id", id).maybeSingle();
    if (error) throw new Error(`Couldn't load the order: ${error.message}`);
    return (data as OrderRow<T>) ?? null;
  }
  const row = await readJsonFile<LocalOrder<T> | null>(path.join(ORDERS_DIR, `${id}.json`), null);
  return row ? { id: row.id, number: row.number, data: row.data } : null;
}

/** Orders with this number, or placed with this (normalized) mobile number; newest first. */
export async function findOrderRows<T>(by: { number: number } | { phone: string }): Promise<OrderRow<T>[]> {
  if (usingSupabase()) {
    const query = db().from("orders").select("id, number, data").order("number", { ascending: false }).limit(20);
    const { data, error } = await ("number" in by ? query.eq("number", by.number) : query.eq("data->customer->>phone", by.phone));
    if (error) throw new Error(`Couldn't look the order up: ${error.message}`);
    return data as OrderRow<T>[];
  }
  const rows = await localOrders<T>();
  return rows
    .filter((r) => ("number" in by ? r.number === by.number : (r.data as { customer?: { phone?: string } }).customer?.phone === by.phone))
    .sort((a, b) => b.number - a.number)
    .map(({ id, number, data }) => ({ id, number, data }));
}

/** Saves a new order and hands out its number. */
export async function insertOrderRow<T>(id: string, clientKey: string, createdAt: string, data: T): Promise<OrderRow<T>> {
  if (usingSupabase()) {
    const { data: row, error } = await db()
      .from("orders")
      .insert({ id, client_key: clientKey, created_at: createdAt, data })
      .select("id, number, data")
      .single();
    if (error) throw new Error(`Couldn't save the order: ${error.message}`);
    return row as OrderRow<T>;
  }
  return serial(async () => {
    const { last } = await readJsonFile(COUNTER_FILE, { last: FIRST_ORDER_NUMBER - 1 });
    const number = last + 1;
    await writeFileAtomic(path.join(ORDERS_DIR, `${id}.json`), JSON.stringify({ id, number, client_key: clientKey, created_at: createdAt, data }, null, 2));
    await writeFileAtomic(COUNTER_FILE, JSON.stringify({ last: number }));
    return { id, number, data };
  });
}

export async function updateOrderRow<T>(id: string, data: T) {
  if (usingSupabase()) {
    const { error } = await db().from("orders").update({ data }).eq("id", id);
    if (error) throw new Error(`Couldn't save the order: ${error.message}`);
    return;
  }
  await serial(async () => {
    const file = path.join(ORDERS_DIR, `${id}.json`);
    const row = await readJsonFile<LocalOrder<T> | null>(file, null);
    if (row) await writeFileAtomic(file, JSON.stringify({ ...row, data }, null, 2));
  });
}

export async function deleteOrderRow(id: string) {
  if (usingSupabase()) {
    const { error } = await db().from("orders").delete().eq("id", id);
    if (error) throw new Error(`Couldn't delete the order: ${error.message}`);
    return;
  }
  await serial(() => fs.rm(path.join(ORDERS_DIR, `${id}.json`), { force: true }));
}

/** Orders a device placed since a moment (basic flood guard). */
export async function countRecentOrders(clientKey: string, sinceIso: string) {
  if (usingSupabase()) {
    const { count, error } = await db()
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("client_key", clientKey)
      .gte("created_at", sinceIso);
    return error ? 0 : (count ?? 0);
  }
  return (await localOrders()).filter((o) => o.client_key === clientKey && o.created_at >= sinceIso).length;
}

// ── Files ────────────────────────────────────────────────────────

export async function putFile(b: Bucket, name: string, data: Buffer | string, contentType: string, { upsert = false } = {}) {
  if (usingSupabase()) {
    const { error } = await bucket(b).upload(name, data, {
      contentType,
      // Product photos have random names that are never reused; settings change
      cacheControl: b === "products" ? "31536000" : "0",
      upsert,
    });
    if (error) throw new Error(`Couldn't save ${name}: ${error.message}`);
    return;
  }
  const file = filePath(b, name);
  if (!upsert) {
    const there = await fs.stat(file).then(() => true, () => false);
    if (there) throw new Error(`${name} already exists`);
  }
  await writeFileAtomic(file, data);
}

export async function getFile(b: Bucket, name: string): Promise<Buffer | null> {
  if (usingSupabase()) {
    // A fresh nonce skips Supabase's CDN copy, which can lag behind a save by a few seconds
    const { data, error } = await bucket(b).download(name, b === "settings" ? { cacheNonce: randomBytes(8).toString("hex") } : undefined);
    return error || !data ? null : Buffer.from(await data.arrayBuffer());
  }
  try {
    return await fs.readFile(filePath(b, name));
  } catch {
    return null;
  }
}

export async function fileExists(b: Bucket, name: string) {
  if (usingSupabase()) {
    const { data } = await bucket(b).exists(name);
    return Boolean(data);
  }
  return fs.stat(filePath(b, name)).then((s) => s.isFile(), () => false);
}

export async function removeFiles(b: Bucket, names: string[]) {
  if (!names.length) return;
  if (usingSupabase()) {
    await bucket(b).remove(names);
    return;
  }
  await Promise.all(names.map((n) => fs.rm(filePath(b, n), { force: true })));
}

/** Address of a public product photo. */
export function publicUrl(name: string) {
  return usingSupabase() ? `${SUPABASE_URL}/storage/v1/object/public/products/${name}` : `/media/${name}`;
}

/** The file name behind one of our product photo addresses, or null for any other URL. */
export function publicName(src: string) {
  const base = usingSupabase() ? `${SUPABASE_URL}/storage/v1/object/public/products/` : "/media/";
  return src.startsWith(base) ? src.slice(base.length) : null;
}

// ── Direct uploads ───────────────────────────────────────────────
//
// Big files go straight from the browser to storage with a one-time link,
// so they never pass through (or get cut off by) a serverless function.
// Supabase signs those links itself; the local folder uses our own signed
// link to /api/uploads/local.

const LOCAL_SECRET = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || randomBytes(32).toString("hex");
const sign = (v: string) => createHmac("sha256", `upload:${LOCAL_SECRET}`).update(v).digest("base64url");

export async function signedUploadUrl(b: Bucket, name: string, maxBytes: number) {
  if (usingSupabase()) {
    const { data, error } = await bucket(b).createSignedUploadUrl(name);
    if (error) throw new Error(error.message);
    return data.signedUrl;
  }
  const payload = Buffer.from(JSON.stringify({ b, n: name, m: maxBytes, e: Date.now() + 10 * 60 * 1000 })).toString("base64url");
  return `/api/uploads/local?token=${payload}.${sign(payload)}`;
}

/** Checks a local upload link; returns where the file may be written. */
export function readLocalUploadToken(token: string): { bucket: Bucket; name: string; maxBytes: number } | null {
  if (usingSupabase()) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const { b: bk, n, m, e } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof e !== "number" || e < Date.now()) return null;
    return { bucket: bk, name: n, maxBytes: m };
  } catch {
    return null;
  }
}
