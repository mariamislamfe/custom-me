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
  /** Own sizes and prices; empty = the product type's sizes and the Prices page extras. */
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

/** Which of a type's option groups a product's own sizes replace. */
const SIZE_GROUP: Record<CategoryId, string> = { sleeves: "size", bags: "size", "ruler-cases": "length", notebooks: "size", stickers: "size" };

/** A product type, or a product with the sizes and colours set on it in the dashboard. */
export type Optioned = CategoryId | { category: CategoryId; sizes?: ProductSize[]; colours?: ProductColour[] };

/**
 * The choices a customer makes for a product (or, given a type, for a piece
 * designed in the Lab). A type's choices (sizes, pages, strap…) are set on
 * the dashboard's Product options page and travel with `pricing`.
 */
export function optionsFor(item: Optioned, pricing: Pricing): OptionGroup[] {
  const c = typeof item === "string" ? item : item.category;
  const base = pricing.options?.[c] ?? categories[c].options;
  if (typeof item === "string") return base;
  const groups: OptionGroup[] = [];
  if (item.colours?.length) {
    groups.push({ id: "colour", label: "Colour", own: true, values: item.colours.map((k) => ({ id: k.id, label: k.label, swatch: k.hex, available: k.available })) });
  }
  if (!item.sizes?.length) return [...groups, ...base];
  const sizeId = SIZE_GROUP[c];
  const sizes: OptionGroup = {
    id: sizeId,
    label: base.find((g) => g.id === sizeId)?.label ?? "Size",
    own: true,
    values: item.sizes.map((z) => ({ id: z.id, label: z.label, price: z.price, available: z.available })),
  };
  return base.some((g) => g.id === sizeId) ? [...groups, ...base.map((g) => (g.id === sizeId ? sizes : g))] : [...groups, sizes, ...base];
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
 * Prices set on the dashboard's Prices page: what a piece designed in the
 * Lab costs, what personalizing a shop design adds, and what each option
 * adds (keyed "group:value", e.g. "size:15").
 */
export interface Pricing {
  /** Each type's option groups (sizes, pages, strap…), from the dashboard's Product options page */
  options: Record<CategoryId, OptionGroup[]>;
  /** null = not set yet: the Lab shows the product but it can't be ordered */
  custom: Record<CategoryId, number | null>;
  /** Added to a shop design's own price when the customer adds a name or art to it in the Lab */
  personalize: Record<CategoryId, number>;
  extras: Record<CategoryId, Record<string, number>>;
}

/** Starting values until prices are saved in the dashboard. */
export const DEFAULT_PRICING: Pricing = {
  options: Object.fromEntries(categoryOrder.map((c) => [c, categories[c].options])) as Pricing["options"],
  custom: { sleeves: 700, bags: null, "ruler-cases": 600, notebooks: 260, stickers: null },
  personalize: { sleeves: 0, bags: 0, "ruler-cases": 0, notebooks: 0, stickers: 0 },
  extras: Object.fromEntries(
    categoryOrder.map((c) => [
      c,
      Object.fromEntries(categories[c].options.flatMap((g) => g.values.map((v) => [`${g.id}:${v.id}`, v.priceDelta ?? 0]))),
    ]),
  ) as Pricing["extras"],
};

export function optionExtra(pricing: Pricing, category: CategoryId, group: string, value: string) {
  return pricing.extras[category]?.[`${group}:${value}`] ?? 0;
}

type Priced<P> = { category: CategoryId; price: P; sizes?: ProductSize[]; colours?: ProductColour[] };

/** Base price (or the chosen size's own price) + option extras; null while there's no price yet. */
export function priceFor(product: Priced<number>, selection: Record<string, string>, pricing: Pricing): number;
export function priceFor(product: Priced<number | null>, selection: Record<string, string>, pricing: Pricing): number | null;
export function priceFor(product: Priced<number | null>, selection: Record<string, string>, pricing: Pricing) {
  let base = product.price;
  let extras = 0;
  for (const g of optionsFor(product, pricing)) {
    const v = g.values.find((x) => x.id === selection[g.id]);
    if (!v) continue;
    if (g.own) base = v.price ?? base;
    else extras += optionExtra(pricing, product.category, g.id, v.id);
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
