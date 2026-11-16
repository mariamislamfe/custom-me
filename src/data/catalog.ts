/**
 * Catalog structure: the product categories, their options (sizes, lengths,
 * paper) and how prices are worked out.
 *
 * Products themselves are added in the dashboard (/admin) and stored by
 * src/lib/server/backend.ts.
 *
 * Option extras and custom-piece prices below are starting values; the
 * dashboard's Prices page overrides them (see `Pricing`).
 */

import type { PaletteId } from "@/components/art/artworks";
import type { DesignTemplate } from "@/config/customization";

export type CategoryId = "sleeves" | "bags" | "ruler-cases" | "notebooks" | "stickers";

export interface OptionValue {
  id: string;
  label: string;
  /** Added to the product's base price when selected. */
  priceDelta?: number;
  /** A product's own size: its full price (null = the product's main price). */
  price?: number | null;
  /** A product colour's swatch. */
  swatch?: string;
  available?: boolean;
  /** Short helper shown under the option, e.g. a fit note. */
  note?: string;
}

export interface OptionGroup {
  id: string;
  label: string;
  values: OptionValue[];
  /** Set on the product in the dashboard: its values carry their own prices, not the Prices page extras. */
  own?: boolean;
  /**
   * The type's sizes ("Laptop size", "Ruler length"), marked on the Product
   * options page. Each size has a full price (on each product, and for custom
   * pieces on the Prices page), never an extra.
   */
  sizes?: boolean;
}

/** A size set on one product in the dashboard, with its own price. */
export interface ProductSize {
  id: string;
  label: string;
  /** null = the product's main price */
  price: number | null;
  available: boolean;
}

/** A colour one product comes in, set in the dashboard. Photos can be tagged with it. */
export interface ProductColour {
  id: string;
  label: string;
  hex: string;
  available: boolean;
}

/** A product photo uploaded from the dashboard (stored as WebP). */
export interface ProductImage {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Transparent background (the white was removed, or a PNG cut-out was uploaded) */
  cutout: boolean;
  /** The back of the product: shown when the customer turns it round. */
  back?: boolean;
  /** The colour (ProductColour id) the photo shows; unset = any colour. */
  colour?: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: CategoryId;
  /** Colourway the product is staged in on the homepage and its page. */
  palette: PaletteId;
  /** Price in EGP, before option extras. null = not set yet: shown, but not for sale. */
  price: number | null;
  blurb: string;
  details: string[];
  /** Main colours, for the shop's colour filter (see COLOUR_TAGS). */
  tags: string[];
  /** In stock and orderable. */
  available: boolean;
  /** Whether "Customize this" is offered for the product. */
  customizable: boolean;
  /** Own sizes, each with its full price; empty = it comes in one size, at `price`. */
  sizes: ProductSize[];
  /** Colours to choose from; empty = it comes in one colour. */
  colours: ProductColour[];
  /** Photos; the first is the main one. */
  images: ProductImage[];
  /** The design's editable original: "Customize this" opens these layers instead of the photo. */
  template?: DesignTemplate;
  isNew: boolean;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export const COLOUR_TAGS = [
  { id: "black", label: "Black" },
  { id: "white", label: "White" },
  { id: "pink", label: "Pink" },
  { id: "purple", label: "Purple" },
  { id: "blue", label: "Blue" },
  { id: "navy", label: "Navy" },
  { id: "mint", label: "Mint" },
  { id: "gray", label: "Gray" },
] as const;

export interface Category {
  id: CategoryId;
  label: string;
  singular: string;
  /** The brand-line phrase this category owns. */
  phrase: string;
  intro: string;
  options: OptionGroup[];
}

export const categories: Record<CategoryId, Category> = {
  sleeves: {
    id: "sleeves",
    label: "Laptop Sleeves",
    singular: "Laptop Sleeve",
    phrase: "Your world.",
    intro:
      "Your whole world lives in that laptop. Carry it in something that says who you are.",
    options: [
      {
        id: "size",
        label: "Laptop size",
        values: [
          { id: "13", label: '13"', note: "MacBook Air 13 / most 13\" laptops" },
          { id: "14", label: '14"' },
          { id: "15", label: '15.6"', priceDelta: 50 },
        ],
      },
      {
        // Made without a strap; adding one costs extra
        id: "strap",
        label: "Strap",
        values: [
          { id: "none", label: "No strap" },
          { id: "strap", label: "Add a strap", priceDelta: 50 },
        ],
      },
    ],
  },
  bags: {
    id: "bags",
    label: "Art Bags",
    singular: "Art Bag",
    phrase: "Your art.",
    intro: "Bigger than a sleeve, with a shoulder strap. Artwork on both sides, made to be seen.",
    // One size for now: add a size group here once sizes are confirmed
    options: [],
  },
  "ruler-cases": {
    id: "ruler-cases",
    label: "T-Ruler Cases",
    singular: "T-Ruler Case",
    phrase: "Your rulers.",
    intro:
      "Built around the long silhouette of a T-square. Precise on the inside, loud on the outside.",
    options: [
      {
        id: "length",
        label: "Ruler length",
        values: [
          { id: "60", label: "60 cm" },
          { id: "80", label: "80 cm", priceDelta: 40 },
          { id: "100", label: "100 cm", priceDelta: 80 },
        ],
      },
    ],
  },
  notebooks: {
    id: "notebooks",
    label: "Notebooks",
    singular: "Notebook",
    phrase: "Your design.",
    intro:
      "A loud cover, quiet pages. Pick the artwork outside and the paper you think on inside.",
    options: [
      {
        id: "size",
        label: "Size",
        values: [
          { id: "a5", label: "A5" },
          { id: "a4", label: "A4", priceDelta: 60 },
        ],
      },
      {
        id: "paper",
        label: "Pages",
        values: [
          { id: "lined", label: "Lined" },
          { id: "dotted", label: "Dotted" },
          { id: "grid", label: "Grid" },
          { id: "blank", label: "Blank" },
        ],
      },
    ],
  },
  stickers: {
    id: "stickers",
    label: "Stickers",
    singular: "Sticker",
    phrase: "Your vibe.",
    intro: "Small, loud and waterproof. Slap them on your laptop, notebook or bottle, and try the layout before you order.",
    // Sizes or packs are set on each sticker in the dashboard
    options: [],
  },
};

export const categoryOrder: CategoryId[] = ["bags", "sleeves", "ruler-cases", "notebooks", "stickers"];

/** The size option's id in the starting options (above). */
const SIZE_GROUP: Record<CategoryId, string> = { sleeves: "size", bags: "size", "ruler-cases": "length", notebooks: "size", stickers: "size" };
const SIZE_NAME = /size|length|مقاس|طول|حجم/i;

/**
 * A type's size option ("Laptop size", "Ruler length"), if it has one: the
 * option marked as the sizes on the Product options page. Options saved
 * before that mark existed are recognized by their id or name.
 */
export function sizeGroupOf(groups: OptionGroup[], c: CategoryId): OptionGroup | undefined {
  if (groups.some((g) => typeof g.sizes === "boolean")) return groups.find((g) => g.sizes);
  return groups.find((g) => g.id === SIZE_GROUP[c]) ?? groups.find((g) => SIZE_NAME.test(g.label));
}

/**
 * A product type, a shop product (with the sizes and colours set on it), or a
 * custom piece: a type, or `{ category, colours }` (no `sizes`) for a shop
 * design customized in the Lab.
 */
export type Optioned = CategoryId | { category: CategoryId; sizes?: ProductSize[]; colours?: ProductColour[] };

/**
 * The choices a customer makes. A type's choices (sizes, pages, strap…) are
 * set on the dashboard's Product options page and travel with `pricing`.
 *
 * - A custom piece: the type's choices, its sizes priced on the Prices page.
 * - A shop product: its own sizes in place of the type's (none = it comes in
 *   one size), then the type's other choices.
 */
export function optionsFor(item: Optioned, pricing: Pricing): OptionGroup[] {
  const c = typeof item === "string" ? item : item.category;
  const base = pricing.options?.[c] ?? categories[c].options;
  if (typeof item === "string") return base;
  const groups: OptionGroup[] = [];
  if (item.colours?.length) {
    groups.push({ id: "colour", label: "Colour", own: true, values: item.colours.map((k) => ({ id: k.id, label: k.label, swatch: k.hex, available: k.available })) });
  }
  if (!item.sizes) return [...groups, ...base];
  const typeSizes = sizeGroupOf(base, c);
  const rest = base.filter((g) => g !== typeSizes);
  if (!item.sizes.length) return [...groups, ...rest];
  const id = typeSizes?.id ?? (rest.some((g) => g.id === SIZE_GROUP[c]) ? "own-size" : SIZE_GROUP[c]);
  const sizes: OptionGroup = {
    id,
    label: typeSizes?.label ?? "Size",
    own: true,
    sizes: true,
    values: item.sizes.map((z) => ({ id: z.id, label: z.label, price: z.price, available: z.available })),
  };
  // In the place the type's sizes have
  const at = typeSizes ? base.indexOf(typeSizes) : 0;
  return [...groups, ...rest.slice(0, at), sizes, ...rest.slice(at)];
}

/**
 * A size picked from the dashboard's options ("80 cm", "14\""): its label as
 * written there, and its number next to the biggest size's (1 = the biggest).
 * The group is found by id, or else by a name like "Length" or "Size".
 */
export function optionMeasure(item: Optioned, pricing: Pricing, groupId: string, selection: Record<string, string>) {
  const groups = optionsFor(item, pricing);
  const g = groups.find((x) => x.id === groupId) ?? groups.find((x) => x.id !== "colour" && /length|size|مقاس|طول/i.test(x.label));
  const v = g && (g.values.find((x) => x.id === selection[g.id]) ?? g.values[0]);
  if (!g || !v) return null;
  const n = (label: string) => parseFloat(label.replace(",", ".").match(/\d+(\.\d+)?/)?.[0] ?? "");
  const sizes = g.values.map((x) => n(x.label)).filter((x) => Number.isFinite(x) && x > 0);
  const own = n(v.label);
  return { label: v.label, share: sizes.length && Number.isFinite(own) && own > 0 ? own / Math.max(...sizes) : 1 };
}

/** Default selection = first available value of each option group. */
export function defaultSelection(item: Optioned, pricing: Pricing): Record<string, string> {
  const sel: Record<string, string> = {};
  for (const g of optionsFor(item, pricing)) {
    const v = g.values.find((x) => x.available !== false) ?? g.values[0];
    sel[g.id] = v.id;
  }
  return sel;
}

/**
 * Prices set in the dashboard, apart from shop products' own (a full price
 * per size, set on each product).
 */
export interface Pricing {
  /** Each type's option groups (sizes, pages, strap…), from the dashboard's Product options page */
  options: Record<CategoryId, OptionGroup[]>;
  /**
   * A custom piece's full price in each size (size choice id → EGP), from the
   * Prices page. A custom piece is one designed in the Lab or a shop design
   * customized there: both cost the same. A size without a price can't be
   * ordered yet ("Price soon").
   */
  customSizes: Record<CategoryId, Record<string, number>>;
  /** A custom piece's price for a type without sizes; null = not set yet */
  custom: Record<CategoryId, number | null>;
  /** What each other choice (a strap, the pages…) adds, keyed "group:value", e.g. "strap:strap" */
  extras: Record<CategoryId, Record<string, number>>;
}

const STARTING_CUSTOM: Record<CategoryId, number | null> = { sleeves: 700, bags: null, "ruler-cases": 600, notebooks: 260, stickers: null };

/** The starting sizes' prices: the smallest's price + what each bigger one used to add. */
function startingSizes(c: CategoryId): Record<string, number> {
  const base = STARTING_CUSTOM[c];
  const g = sizeGroupOf(categories[c].options, c);
  return base == null || !g ? {} : Object.fromEntries(g.values.map((v) => [v.id, base + (v.priceDelta ?? 0)]));
}

/** Starting values until prices are saved in the dashboard. */
export const DEFAULT_PRICING: Pricing = {
  options: Object.fromEntries(categoryOrder.map((c) => [c, categories[c].options])) as Pricing["options"],
  customSizes: Object.fromEntries(categoryOrder.map((c) => [c, startingSizes(c)])) as Pricing["customSizes"],
  custom: STARTING_CUSTOM,
  extras: Object.fromEntries(
    categoryOrder.map((c) => {
      const sizes = sizeGroupOf(categories[c].options, c);
      return [c, Object.fromEntries(categories[c].options.filter((g) => g !== sizes).flatMap((g) => g.values.map((v) => [`${g.id}:${v.id}`, v.priceDelta ?? 0])))];
    }),
  ) as Pricing["extras"],
};

/** What a choice that isn't a size (a strap, the pages…) adds. */
export function optionExtra(pricing: Pricing, category: CategoryId, group: string, value: string) {
  return pricing.extras[category]?.[`${group}:${value}`] ?? 0;
}

/** A custom piece's full price in one size, or null while it has none. */
export function customSizePrice(pricing: Pricing, category: CategoryId, size: string): number | null {
  return pricing.customSizes[category]?.[size] ?? null;
}

type Priced<P> = { category: CategoryId; price: P; sizes?: ProductSize[]; colours?: ProductColour[] };

/** A shop product: the chosen size's full price (or its one price) + what other choices add; null while there's no price yet. */
export function priceFor(product: Priced<number>, selection: Record<string, string>, pricing: Pricing): number;
export function priceFor(product: Priced<number | null>, selection: Record<string, string>, pricing: Pricing): number | null;
export function priceFor(product: Priced<number | null>, selection: Record<string, string>, pricing: Pricing) {
  let base = product.price;
  let extras = 0;
  for (const g of optionsFor({ ...product, sizes: product.sizes ?? [] }, pricing)) {
    const v = g.values.find((x) => x.id === selection[g.id]);
    if (!v) continue;
    if (g.own) base = v.price ?? base;
    else extras += optionExtra(pricing, product.category, g.id, v.id);
  }
  return base == null ? null : base + extras;
}

/** A custom piece as `optionsFor` takes it: a type, or a customized shop design's type and colours. */
export type CustomPiece = CategoryId | { category: CategoryId; colours?: ProductColour[] };
export const customPiece = (category: CategoryId, product?: { colours: ProductColour[] }): CustomPiece => (product ? { category, colours: product.colours } : category);

/**
 * A custom piece (designed in the Lab, or a customized shop design): the
 * chosen size's full price from the Prices page + what other choices add;
 * null while that size has no price yet.
 */
export function customPriceFor(item: CustomPiece, selection: Record<string, string>, pricing: Pricing): number | null {
  const c = typeof item === "string" ? item : item.category;
  const sizes = sizeGroupOf(pricing.options[c], c);
  let base = sizes ? null : pricing.custom[c];
  let extras = 0;
  for (const g of optionsFor(typeof item === "string" ? item : { category: c, colours: item.colours }, pricing)) {
    const v = g.values.find((x) => x.id === selection[g.id]);
    if (!v) continue;
    if (sizes && g.id === sizes.id) base = customSizePrice(pricing, c, v.id);
    else if (!g.own) extras += optionExtra(pricing, c, g.id, v.id);
  }
  return base == null ? null : base + extras;
}

/**
 * A selection with every group set to a known, available value (or null if it can't be).
 * A group the selection doesn't mention (one added since it was made) takes its default.
 */
export function cleanSelection(item: Optioned, input: unknown, pricing: Pricing): Record<string, string> | null {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const g of optionsFor(item, pricing)) {
    const want = raw[g.id] ?? defaultSelection(item, pricing)[g.id];
    const v = g.values.find((x) => x.id === want && x.available !== false);
    if (!v) return null;
    out[g.id] = v.id;
  }
  return out;
}

export function selectionLabels(item: Optioned, selection: Record<string, string>, pricing: Pricing) {
  return optionsFor(item, pricing)
    .map((g) => {
      const v = g.values.find((x) => x.id === selection[g.id]);
      return v ? `${g.label}: ${v.label}` : null;
    })
    .filter(Boolean) as string[];
}

/**
 * The photos to show for a colour: its front and, when there is one, its
 * back. Photos tagged with the colour win; untagged ones fit every colour.
 */
export function productViews(product: Pick<Product, "images" | "colours">, colour?: string) {
  const want = colour ?? product.colours[0]?.id;
  const mine = want ? product.images.filter((i) => i.colour === want) : [];
  const shared = product.images.filter((i) => !i.colour);
  const pool = mine.length ? [...mine, ...shared] : shared.length ? shared : product.images;
  const front = pool.find((i) => !i.back) ?? pool[0];
  const back = pool.find((i) => i.back && i !== front);
  return { front, back, pool };
}

/** Lowest and highest price across a product's own sizes (option extras aside); null while none is set. */
export function ownPrices(product: Pick<Product, "price" | "sizes">) {
  const list = (product.sizes.length ? product.sizes.map((z) => z.price ?? product.price) : [product.price]).filter((n): n is number => n != null);
  return list.length ? { min: Math.min(...list), max: Math.max(...list) } : null;
}
