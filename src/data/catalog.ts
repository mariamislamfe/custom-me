/**
 * Catalog structure: the product types, their sizes and how prices are worked out.
 *
 * Products themselves are added in the dashboard (/admin) and stored by
 * src/lib/server/backend.ts. Every price lives on the dashboard's Prices page
 * (see `Pricing`): each type's sizes, each size's ready-made and custom price,
 * and what the sleeve strap adds.
 */

import type { PaletteId } from "@/components/art/artworks";
import type { DesignTemplate } from "@/config/customization";

export type CategoryId = "sleeves" | "bags" | "ruler-cases" | "notebooks" | "stickers";

export interface OptionValue {
  id: string;
  label: string;
  /** A size's full price (ready-made); null = not set yet */
  price?: number | null;
  /** A product colour's swatch. */
  swatch?: string;
  available?: boolean;
}

/** One choice the customer makes: a colour, the size, the strap. */
export interface OptionGroup {
  id: string;
  label: string;
  values: OptionValue[];
  /** The product's colours: they don't change the price. */
  own?: boolean;
  /** The type's sizes: each has its full price (Prices page), never an extra. */
  sizes?: boolean;
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
  blurb: string;
  details: string[];
  /** Main colours, for the shop's colour filter (see COLOUR_TAGS). */
  tags: string[];
  /** In stock and orderable. */
  available: boolean;
  /** Whether "Customize this" is offered for the product. */
  customizable: boolean;
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
  /** What the size choice is called on the store */
  sizeLabel: string;
}

export const categories: Record<CategoryId, Category> = {
  sleeves: {
    id: "sleeves",
    label: "Laptop Sleeves",
    singular: "Laptop Sleeve",
    phrase: "Your world.",
    intro:
      "Your whole world lives in that laptop. Carry it in something that says who you are.",
    sizeLabel: "Laptop size",
  },
  bags: {
    id: "bags",
    label: "Art Bags",
    singular: "Art Bag",
    phrase: "Your art.",
    intro: "Bigger than a sleeve, with a shoulder strap. Artwork on both sides, made to be seen.",
    sizeLabel: "Size",
  },
  "ruler-cases": {
    id: "ruler-cases",
    label: "T-Ruler Cases",
    singular: "T-Ruler Case",
    phrase: "Your rulers.",
    intro:
      "Built around the long silhouette of a T-square. Precise on the inside, loud on the outside.",
    sizeLabel: "Ruler length",
  },
  notebooks: {
    id: "notebooks",
    label: "Notebooks",
    singular: "Notebook",
    phrase: "Your design.",
    intro:
      "A loud cover, quiet pages. Pick the artwork outside and the paper you think on inside.",
    sizeLabel: "Size",
  },
  stickers: {
    id: "stickers",
    label: "Stickers",
    singular: "Sticker",
    phrase: "Your vibe.",
    intro: "Small, loud and waterproof. Slap them on your laptop, notebook or bottle, and try the layout before you order.",
    sizeLabel: "Size",
  },
};

export const categoryOrder: CategoryId[] = ["bags", "sleeves", "ruler-cases", "notebooks", "stickers"];

/** The size choice's id in a selection (orders and bags refer to it). */
export const SIZE_GROUP: Record<CategoryId, string> = { sleeves: "size", bags: "size", "ruler-cases": "length", notebooks: "size", stickers: "size" };

/** One size of a product type, set on the Prices page. */
export interface TypeSize {
  id: string;
  label: string;
  /** A ready-made shop product in this size; null = not set yet ("Price soon") */
  price: number | null;
  /** A custom piece in this size (designed in the Lab, or a shop design customized there); null = not set yet */
  custom: number | null;
}

/** A product type's sizes and prices, from the Prices page. */
export interface TypePrices {
  /** Empty = it comes in one size, at `price` / `custom` */
  sizes: TypeSize[];
  /** One-size types: the ready-made price; null = not set yet */
  price: number | null;
  /** One-size types: the custom price; null = not set yet */
  custom: number | null;
}

/** Every price in the store, all set on the dashboard's Prices page. */
export interface Pricing {
  types: Record<CategoryId, TypePrices>;
  /** What adding a strap to a laptop sleeve costs */
  strap: number;
}

/** Starting values until prices are saved in the dashboard: the sizes, no prices yet. */
const startSizes = (list: [string, string][]): TypeSize[] => list.map(([id, label]) => ({ id, label, price: null, custom: null }));
export const DEFAULT_PRICING: Pricing = {
  types: {
    sleeves: { sizes: startSizes([["13", '13"'], ["14", '14"'], ["15", '15.6"']]), price: null, custom: null },
    bags: { sizes: [], price: null, custom: null },
    "ruler-cases": { sizes: startSizes([["60", "60 cm"], ["80", "80 cm"], ["100", "100 cm"]]), price: null, custom: null },
    notebooks: { sizes: startSizes([["a5", "A5"], ["a4", "A4"]]), price: null, custom: null },
    stickers: { sizes: [], price: null, custom: null },
  },
  strap: 50,
};

/** The strap choice on laptop sleeves. */
const STRAP: OptionGroup = {
  id: "strap",
  label: "Strap",
  values: [
    { id: "none", label: "No strap" },
    { id: "strap", label: "Add a strap" },
  ],
};

/** A product type's size choice, if it comes in more than one size. */
export function sizeGroupOf(pricing: Pricing, c: CategoryId): OptionGroup | undefined {
  const sizes = pricing.types[c]?.sizes ?? [];
  if (!sizes.length) return undefined;
  return { id: SIZE_GROUP[c], label: categories[c].sizeLabel, sizes: true, values: sizes.map((z) => ({ id: z.id, label: z.label, price: z.price })) };
}

/**
 * Something the customer picks options for: a product type (a piece designed
 * in the Lab), or a shop product (or a shop design customized in the Lab),
 * which adds its own colours.
 */
export type Optioned = CategoryId | { category: CategoryId; colours?: ProductColour[] };

/** The choices a customer makes: the product's colours, the type's sizes, and the strap on sleeves. */
export function optionsFor(item: Optioned, pricing: Pricing): OptionGroup[] {
  const c = typeof item === "string" ? item : item.category;
  const groups: OptionGroup[] = [];
  if (typeof item !== "string" && item.colours?.length) {
    groups.push({ id: "colour", label: "Colour", own: true, values: item.colours.map((k) => ({ id: k.id, label: k.label, swatch: k.hex, available: k.available })) });
  }
  const sizes = sizeGroupOf(pricing, c);
  if (sizes) groups.push(sizes);
  if (c === "sleeves") groups.push(STRAP);
  return groups;
}

/**
 * The chosen size ("80 cm", "14\""): its label, and its number next to the
 * biggest size's (1 = the biggest).
 */
export function optionMeasure(item: Optioned, pricing: Pricing, selection: Record<string, string>) {
  const g = sizeGroupOf(pricing, typeof item === "string" ? item : item.category);
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

/** What a choice that isn't a size adds: only the strap on sleeves. */
export function optionExtra(pricing: Pricing, category: CategoryId, group: string, value: string) {
  return category === "sleeves" && group === STRAP.id && value === "strap" ? pricing.strap : 0;
}

/** A size's full price, ready-made or custom; null while it has none. */
export function sizePrice(pricing: Pricing, category: CategoryId, size: string | undefined, kind: "price" | "custom"): number | null {
  const t = pricing.types[category];
  if (!t) return null;
  if (!t.sizes.length) return t[kind];
  return t.sizes.find((z) => z.id === size)?.[kind] ?? null;
}

function piecePrice(item: Optioned, selection: Record<string, string>, pricing: Pricing, kind: "price" | "custom") {
  const c = typeof item === "string" ? item : item.category;
  const base = sizePrice(pricing, c, selection[SIZE_GROUP[c]], kind);
  if (base == null) return null;
  let extras = 0;
  for (const g of optionsFor(item, pricing)) if (!g.own && !g.sizes && selection[g.id]) extras += optionExtra(pricing, c, g.id, selection[g.id]);
  return base + extras;
}

/** A ready-made shop product: the chosen size's price + the strap; null while there's no price yet. */
export const priceFor = (product: Optioned, selection: Record<string, string>, pricing: Pricing) => piecePrice(product, selection, pricing, "price");

/** A custom piece (designed in the Lab, or a customized shop design): the chosen size's custom price + the strap; null while there's none. */
export const customPriceFor = (item: Optioned, selection: Record<string, string>, pricing: Pricing) => piecePrice(item, selection, pricing, "custom");

/** A custom piece as `optionsFor` takes it: a type, or a customized shop design's type and colours. */
export type CustomPiece = Optioned;
export const customPiece = (category: CategoryId, product?: { colours: ProductColour[] }): CustomPiece => (product ? { category, colours: product.colours } : category);

/** Lowest and highest ready-made price of a type (strap aside); null while none is set. */
export function priceRange(pricing: Pricing, category: CategoryId) {
  const t = pricing.types[category];
  const list = (t.sizes.length ? t.sizes.map((z) => z.price) : [t.price]).filter((n): n is number => n != null);
  return list.length ? { min: Math.min(...list), max: Math.max(...list) } : null;
}

/**
 * A selection with every group set to a known, available value (or null if it can't be).
 * A group the selection doesn't mention (one added since it was made) takes its default;
 * a choice that's no longer offered (made before the sizes changed) means choosing again.
 */
export function cleanSelection(item: Optioned, input: unknown, pricing: Pricing): Record<string, string> | null {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out: Record<string, string> = {};
  const groups = optionsFor(item, pricing);
  if (Object.keys(raw).some((k) => !groups.some((g) => g.id === k))) return null;
  for (const g of groups) {
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
