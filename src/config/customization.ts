/**
 * Customization Lab configuration.
 *
 * Customers upload their own artwork (and/or add text) and place each layer
 * exactly where they want it on the product. Only offer what production can
 * actually make: every list here can be edited without touching components.
 * Prices of custom pieces are set on the dashboard's Prices page.
 */

import { PALETTES, type PaletteId } from "@/components/art/artworks";
import type { CategoryId } from "@/data/catalog";

export type FontId = "marker" | "display" | "mono";

export const lab = {
  categories: ["bags", "sleeves", "ruler-cases", "notebooks"] as CategoryId[],

  /**
   * Quick picks for the colour a custom piece is made in. Customers can also
   * pick any other colour from the full palette.
   */
  baseSwatches: [
    { label: "Navy", hex: "#14215A" },
    { label: "Mint", hex: "#3FE0AE" },
    { label: "White", hex: "#FBFBF9" },
    { label: "Gray", hex: "#E2E5EB" },
    { label: "Midnight", hex: "#0B1438" },
    { label: "Black", hex: "#16181F" },
    { label: "Pink", hex: "#F7A8C8" },
    { label: "Lilac", hex: "#B9A6F2" },
    { label: "Sky", hex: "#8FCBF2" },
    { label: "Red", hex: "#D7263D" },
    { label: "Sun", hex: "#FFD23F" },
    { label: "Sand", hex: "#E9DCC2" },
  ],

  text: {
    maxLength: 28,
    /** Characters accepted in custom text. Keep in sync with what you can print. */
    allowedPattern: /^[\p{L}\p{N} .,!?&'♥@#+\-_/()]*$/u,
    fonts: [
      { id: "marker", label: "Marker", css: "var(--font-marker)" },
      { id: "display", label: "Block", css: "var(--font-display)" },
      { id: "mono", label: "Studio Mono", css: "var(--font-mono)" },
    ] as { id: FontId; label: string; css: string }[],
    /** Quick picks for printed text; any other colour can be picked from the full palette. */
    inks: [
      { label: "Navy", hex: "#14215A" },
      { label: "Mint", hex: "#3FE0AE" },
      { label: "White", hex: "#FBFBF9" },
      { label: "Black", hex: "#16181F" },
      { label: "Pink", hex: "#F7A8C8" },
      { label: "Red", hex: "#D7263D" },
      { label: "Sun", hex: "#FFD23F" },
      { label: "Sky", hex: "#8FCBF2" },
    ],
  },

  /** Most layers (uploads + text) one piece can have, a shop design's own layers included. */
  maxLayers: 10,

  /** Customer artwork. The original file is uploaded and kept untouched for printing. */
  uploads: {
    accept: ["image/png", "image/jpeg", "image/webp"],
    acceptLabel: "PNG, JPG or WebP",
    maxMB: 15,
    /** Below this long-edge size we warn the print may look soft. */
    recommendedPx: 1500,
    /** A downscaled copy is kept in the browser for the live preview and the bag. */
    previewMaxPx: 1000,
    /** Uploads allowed per visitor per 10 minutes (basic abuse guard). */
    perTenMinutes: 30,
  },

  /**
   * Real-world size of each printable area, in centimetres. `null` until
   * confirmed with production: placements are then reported as percentages
   * of the print area, and the print file is exported 3000 px wide.
   */
  printAreaCm: {
    sleeves: null,
    bags: null,
    "ruler-cases": null,
    notebooks: null,
    stickers: null,
  } as Record<CategoryId, { width: number; height: number } | null>,
};

/**
 * Layer placement is stored relative to the product's print area so it is
 * independent of screen size: x/y are the layer's centre (0 = left/top edge,
 * 1 = right/bottom edge), sizes are fractions of the print area's width.
 */
type Placement = { id: string; x: number; y: number; rotation: number };

export type ImageLayer = Placement & {
  kind: "image";
  /** Downscaled preview (data URL) in the browser; the stored original in the dashboard */
  src: string;
  /** The customer's original file, stored on the server for printing */
  fileId?: string;
  name: string;
  /** height / width */
  aspect: number;
  originalWidth: number;
  originalHeight: number;
  /** Width as a fraction of the print area's width */
  width: number;
};

export type TextLayer = Placement & {
  kind: "text";
  text: string;
  font: FontId;
  /** Any hex colour (lab.text.inks are the quick picks) */
  ink: string;
  /** Font size as a fraction of the print area's width */
  size: number;
};

export type DesignLayer = ImageLayer | TextLayer;

/** A shop design the customer started from: their layers go on top of it. */
export type DesignBase = {
  productId: string;
  slug: string;
  name: string;
  /** The product's front photo (for the colour chosen) */
  image: { src: string; width: number; height: number };
};

/**
 * A shop design's editable original, set up in the dashboard: the colour of
 * the piece and the design's own pieces (artwork files, text) as layers.
 * "Customize this" opens these layers so the customer can change any of them.
 */
export interface DesignTemplate {
  base: string;
  layers: DesignLayer[];
}

/** The shop design whose editable original the customer started from. */
export type TemplateRef = { productId: string; slug: string; name: string };

export interface Customization {
  /** Colour the piece is made in: any hex */
  base?: string;
  /** Pieces designed before any colour could be picked: one of the colourways */
  baseId?: PaletteId;
  /** Personalizing a shop design instead of starting from a plain piece */
  design?: DesignBase;
  /** Editing a shop design's original (its layers are in `layers`, no photo underneath) */
  template?: TemplateRef;
  /** Bottom to top */
  layers: DesignLayer[];
}

export const HEX = /^#[0-9a-f]{6}$/i;

/** The colour a custom piece is made in (older pieces name a colourway). */
export function baseColour(c: Pick<Customization, "base" | "baseId">) {
  if (c.base && HEX.test(c.base)) return c.base;
  return c.baseId && c.baseId in PALETTES ? PALETTES[c.baseId].ground : lab.baseSwatches[0].hex;
}

/** A quick pick's name ("Navy"), or the hex itself for a colour from the full palette. */
export function colourName(hex: string) {
  const h = hex.toLowerCase();
  return [...lab.baseSwatches, ...lab.text.inks].find((s) => s.hex.toLowerCase() === h)?.label ?? hex.toUpperCase();
}

/** Relative luminance, 0 (black) to 1 (white). */
export function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Text ink that reads on a base colour. */
export const contrastInk = (base: string) => (luminance(base) < 0.25 ? "#3FE0AE" : "#14215A");

export const LIMITS = {
  imageWidth: [0.05, 1.6] as const,
  textSize: [0.03, 0.6] as const,
};

export const fontOf = (id: FontId) => lab.text.fonts.find((f) => f.id === id) ?? lab.text.fonts[0];
