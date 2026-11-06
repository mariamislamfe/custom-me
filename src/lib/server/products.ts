import "server-only";
import { randomUUID } from "node:crypto";
import { cacheLife, cacheTag } from "next/cache";
import { PALETTES, type PaletteId } from "@/components/art/artworks";
import { categories, categoryOrder, COLOUR_TAGS, type CategoryId, type Product, type ProductColour, type ProductImage, type ProductSize } from "@/data/catalog";
import { PRODUCT_IMAGE } from "@/config/products";
import { HEX as HEX_COLOUR, lab, LIMITS, type DesignLayer, type DesignTemplate } from "@/config/customization";
import { publicName, readProductRows, removeFiles, writeProductRows } from "./backend";

export { PRODUCT_IMAGE };

/** Only our own generated photo names are ever written or deleted. */
export const PHOTO_NAME = /^[a-f0-9-]{36}\.webp$/;

export const PRODUCTS_TAG = "products";

/** Every product saved from the dashboard, in shop order (drafts included). */
export async function readProducts(): Promise<Product[]> {
  return (await readProductRows<Product>()).map((r) => withDefaults(r.data));
}

/** Rows saved before sizes and colours existed get empty lists. */
function withDefaults(p: Product): Product {
  return { ...p, sizes: p.sizes ?? [], colours: p.colours ?? [] };
}

/** What the shop shows: published products, grouped by category. */
export function storefront(products: Product[]) {
  const live = products.filter((p) => p.published);
  return categoryOrder.flatMap((c) => live.filter((p) => p.category === c));
}

/**
 * Products for the storefront, cached and tagged so the dashboard can
 * refresh them instantly with updateTag(PRODUCTS_TAG) after every change;
 * the short lifetime is a safety net if a row is edited in Supabase directly.
 */
export async function getStoreProducts(): Promise<Product[]> {
  "use cache";
  cacheTag(PRODUCTS_TAG);
  cacheLife("minutes");
  return storefront(await readProducts());
}

/** Read the list, change it, and write back only the rows that changed. */
async function mutate<T>(fn: (list: Product[]) => { list: Product[]; result: T }) {
  const before = await readProductRows<Product>();
  const { list, result } = fn(before.map((r) => withDefaults(r.data)));
  const now = new Date().toISOString();
  const changed = list
    .map((p, position) => ({ id: p.id, position, data: p, updated_at: now }))
    .filter((row, i) => before[i]?.id !== row.id || JSON.stringify(before[i].data) !== JSON.stringify(row.data));
  const gone = before.filter((r) => !list.some((p) => p.id === r.id)).map((r) => r.id);
  await writeProductRows(changed, gone);
  return result;
}

// Serialize dashboard writes in this server so two saves can't interleave.
let queue: Promise<unknown> = Promise.resolve();
function mutateProducts<T>(fn: (list: Product[]) => { list: Product[]; result: T }) {
  const run = queue.then(() => mutate(fn));
  queue = run.catch(() => undefined);
  return run;
}

async function deletePhotos(srcs: string[]) {
  const names = srcs.map(publicName).filter((n): n is string => Boolean(n && PHOTO_NAME.test(n)));
  await removeFiles("products", names).catch((err) => console.error("Photos not deleted", err));
}

// ── Dashboard form ───────────────────────────────────────────────

export type FieldErrors = Partial<Record<"name" | "price" | "category" | "images" | "sizes" | "colours" | "template" | "form", string>>;

export function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function parseImages(raw: string): ProductImage[] | null {
  try {
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return null;
    const out: ProductImage[] = [];
    for (const i of list) {
      const name = typeof i?.src === "string" ? publicName(i.src) : null;
      if (!name || !PHOTO_NAME.test(name)) return null;
      const width = Math.round(Number(i.width));
      const height = Math.round(Number(i.height));
      if (!(width > 0 && height > 0)) return null;
      const colour = typeof i.colour === "string" && ID.test(i.colour) ? i.colour : undefined;
      out.push({ src: i.src, width, height, cutout: Boolean(i.cutout), alt: String(i.alt ?? "").slice(0, 140), back: Boolean(i.back) || undefined, colour });
    }
    return out;
  } catch {
    return null;
  }
}

const ID = /^[a-z0-9-]{1,40}$/;
const HEX = /^#[0-9a-f]{6}$/i;

/** A list of {id, label, ...} rows from the form; null when it's malformed. */
function parseRows(raw: string) {
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? (list.slice(0, 12) as Record<string, unknown>[]) : null;
  } catch {
    return null;
  }
}

/** Sizes: a label each, an own price or none (= the main price). */
function parseSizes(raw: string): ProductSize[] | string {
  const rows = parseRows(raw);
  if (!rows) return "Something went wrong with the sizes. Reload the page and try again.";
  const out: ProductSize[] = [];
  for (const r of rows) {
    const label = String(r.label ?? "").trim().slice(0, 30);
    if (!label) return "Give every size a name, or remove the empty one.";
    const id = String(r.id ?? "");
    const priceRaw = String(r.price ?? "").replace(/,/g, "").trim();
    const price = Number(priceRaw);
    if (priceRaw && (!Number.isFinite(price) || price <= 0 || price > 1_000_000)) return `Enter a price above 0 for ${label}, or leave it empty to use the main price.`;
    if (!ID.test(id) || out.some((s) => s.id === id)) return "Something went wrong with the sizes. Reload the page and try again.";
    out.push({ id, label, price: priceRaw ? Math.round(price) : null, available: r.available !== false });
  }
  return out;
}

function parseColours(raw: string): ProductColour[] | string {
  const rows = parseRows(raw);
  if (!rows) return "Something went wrong with the colours. Reload the page and try again.";
  const out: ProductColour[] = [];
  for (const r of rows) {
    const label = String(r.label ?? "").trim().slice(0, 30);
    if (!label) return "Give every colour a name, or remove the empty one.";
    const id = String(r.id ?? "");
    const hex = String(r.hex ?? "");
    if (!ID.test(id) || !HEX.test(hex) || out.some((c) => c.id === id)) return "Something went wrong with the colours. Reload the page and try again.";
    out.push({ id, label, hex: hex.toLowerCase(), available: r.available !== false });
  }
  return out;
}

/** An original design file in the designs bucket (same names as lib/server/uploads.ts). */
const DESIGN_FILE = /^[a-f0-9-]{36}\.(png|jpg|webp)$/;
const num = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

/**
 * The editable original from the dashboard: a base colour and layers, each
 * image with its original file (for print) and a WebP preview (for the shop).
 * undefined = none; a string = what's wrong.
 */
function parseTemplate(raw: string): DesignTemplate | undefined | string {
  if (!raw) return undefined;
  const broken = "Something went wrong with the editable design. Reload the page and try again.";
  let t: { base?: unknown; layers?: unknown };
  try {
    t = JSON.parse(raw);
  } catch {
    return broken;
  }
  if (!t || !Array.isArray(t.layers)) return broken;
  if (t.layers.length === 0) return undefined;
  if (t.layers.length > lab.maxLayers) return `The editable design can have up to ${lab.maxLayers} layers.`;
  const base = typeof t.base === "string" && HEX_COLOUR.test(t.base) ? t.base.toUpperCase() : null;
  if (!base) return broken;
  const layers: DesignLayer[] = [];
  for (const l of t.layers as Record<string, unknown>[]) {
    const place = { id: randomUUID(), x: num(l.x, 0, 1, 0.5), y: num(l.y, 0, 1, 0.5), rotation: num(l.rotation, -180, 180, 0) };
    if (l.kind === "image") {
      const fileId = String(l.fileId ?? "");
      const preview = typeof l.src === "string" ? publicName(l.src) : null;
      if (!DESIGN_FILE.test(fileId) || !preview || !PHOTO_NAME.test(preview)) return broken;
      layers.push({
        ...place,
        kind: "image",
        fileId,
        src: String(l.src),
        name: String(l.name ?? "design").slice(0, 120),
        aspect: num(l.aspect, 0.02, 50, 1),
        originalWidth: Math.round(num(l.originalWidth, 1, 100000, 1)),
        originalHeight: Math.round(num(l.originalHeight, 1, 100000, 1)),
        width: num(l.width, ...LIMITS.imageWidth, 0.5),
      });
    } else if (l.kind === "text") {
      const text = String(l.text ?? "").slice(0, lab.text.maxLength);
      if (!text.trim() || !lab.text.allowedPattern.test(text)) return `The text “${text}” in the editable design uses characters that can’t be printed.`;
      const font = lab.text.fonts.find((f) => f.id === l.font)?.id;
      if (!font || typeof l.ink !== "string" || !HEX_COLOUR.test(l.ink)) return broken;
      layers.push({ ...place, kind: "text", text, font, ink: l.ink.toUpperCase(), size: num(l.size, ...LIMITS.textSize, 0.2) });
    } else return broken;
  }
  return { base, layers };
}

/** Preview photos an editable design shows (they live with the product photos). */
const templatePhotos = (t?: DesignTemplate) => (t?.layers ?? []).flatMap((l) => (l.kind === "image" ? [l.src] : []));

/** Validate and normalize a dashboard form submission. */
export function parseProductForm(form: FormData) {
  const errors: FieldErrors = {};
  const name = String(form.get("name") ?? "").trim().slice(0, 80);
  const category = String(form.get("category") ?? "") as CategoryId;
  const priceRaw = String(form.get("price") ?? "").replace(/,/g, "").trim();
  const price = Number(priceRaw);
  const blurb = String(form.get("blurb") ?? "").trim().slice(0, 240);
  const details = String(form.get("details") ?? "")
    .split("\n")
    .map((l) => l.trim().slice(0, 120))
    .filter(Boolean)
    .slice(0, 8);
  const images = parseImages(String(form.get("images") ?? "[]"));
  const paletteRaw = String(form.get("palette") ?? "");
  const palette = (paletteRaw in PALETTES ? paletteRaw : "navy-mint") as PaletteId;
  const tags = COLOUR_TAGS.map((t) => t.id as string).filter((t) => form.getAll("tags").includes(t));
  const sizes = parseSizes(String(form.get("sizes") ?? "[]"));
  const colours = parseColours(String(form.get("colours") ?? "[]"));
  const template = parseTemplate(String(form.get("template") ?? ""));

  if (!name) errors.name = "Give the product a name.";
  if (!(category in categories)) errors.category = "Choose what kind of product it is.";
  // Empty = no price yet: the product shows in the store but can't be ordered
  if (priceRaw && (!Number.isFinite(price) || price <= 0 || price > 1_000_000)) errors.price = "Enter a price above 0, like 650, or leave it empty for now.";
  if (!images) errors.images = "Something went wrong with the photos. Remove them and upload again.";
  else if (images.length === 0) errors.images = "Add at least one photo.";
  else if (images.length > PRODUCT_IMAGE.maxPerProduct) errors.images = `Use up to ${PRODUCT_IMAGE.maxPerProduct} photos.`;
  if (typeof sizes === "string") errors.sizes = sizes;
  if (typeof colours === "string") errors.colours = colours;
  if (typeof template === "string") errors.template = template;
  const colourList = typeof colours === "string" ? [] : colours;

  return {
    errors,
    value: {
      name,
      category,
      price: priceRaw ? Math.round(price) : null,
      blurb,
      details,
      tags,
      palette,
      sizes: typeof sizes === "string" ? [] : sizes,
      colours: colourList,
      // A photo tagged with a colour that was removed fits every colour again
      images: (images ?? []).map((img) => ({
        ...img,
        alt: img.alt || name,
        colour: img.colour && colourList.some((c) => c.id === img.colour) ? img.colour : undefined,
      })),
      available: form.get("available") === "on",
      // Only the types the Lab makes can be personalized (not stickers)
      customizable: form.get("customizable") === "on" && lab.categories.includes(category),
      template: typeof template === "string" || !lab.categories.includes(category) ? undefined : template,
      isNew: form.get("isNew") === "on",
      published: form.get("published") === "on",
    },
  };
}

type ProductValues = ReturnType<typeof parseProductForm>["value"];

function uniqueSlug(base: string, list: Product[], selfId?: string) {
  const root = base || "product";
  let slug = root;
  const taken = (s: string) => list.some((p) => p.slug === s && p.id !== selfId);
  for (let n = 2; taken(slug); n++) slug = `${root}-${n}`;
  return slug;
}

export async function createProduct(values: ProductValues) {
  return mutateProducts((list) => {
    const now = new Date().toISOString();
    const product: Product = { ...values, id: randomUUID(), slug: uniqueSlug(slugify(values.name), list), createdAt: now, updatedAt: now };
    // Newest first: it shows up first in its category
    return { list: [product, ...list], result: product };
  });
}

export async function updateProduct(id: string, values: ProductValues) {
  const removed: string[] = [];
  const result = await mutateProducts((list) => {
    const current = list.find((p) => p.id === id);
    if (!current) return { list, result: null };
    const next: Product = {
      ...current,
      ...values,
      // Keep the URL stable unless the name actually changed
      slug: values.name === current.name ? current.slug : uniqueSlug(slugify(values.name), list, id),
      updatedAt: new Date().toISOString(),
    };
    removed.push(...current.images.map((i) => i.src).filter((src) => !next.images.some((i) => i.src === src)));
    const kept = templatePhotos(next.template);
    removed.push(...templatePhotos(current.template).filter((src) => !kept.includes(src)));
    return { list: list.map((p) => (p.id === id ? next : p)), result: next };
  });
  await deletePhotos(removed);
  return result;
}

export async function removeProduct(id: string) {
  const gone = await mutateProducts((list) => ({ list: list.filter((p) => p.id !== id), result: list.find((p) => p.id === id) }));
  if (gone) await deletePhotos([...gone.images.map((i) => i.src), ...templatePhotos(gone.template)]);
}

export async function setPublished(id: string, published: boolean) {
  await mutateProducts((list) => ({
    list: list.map((p) => (p.id === id ? { ...p, published, updatedAt: new Date().toISOString() } : p)),
    result: null,
  }));
}

export async function moveProduct(id: string, dir: -1 | 1) {
  await mutateProducts((list) => {
    const i = list.findIndex((p) => p.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return { list, result: null };
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    return { list: next, result: null };
  });
}
