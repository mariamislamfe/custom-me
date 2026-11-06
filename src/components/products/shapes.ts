import type { CategoryId } from "@/data/catalog";

/**
 * Product outlines in SVG units: viewBox size, the printable art box
 * [x, y, w, h] and the body path. Shared by the mockups, the Lab and the
 * dashboard print file (kept free of client code so servers can import it).
 * Proportions follow the real products' photos.
 */
export const SHAPES = {
  sleeves: {
    vb: [600, 420] as const,
    art: [12, 12, 576, 396] as const,
    body: "M42 12H558Q588 12 588 42V378Q588 408 558 408H42Q12 408 12 378V42Q12 12 42 12Z",
  },
  // Body about 1.47 : 1, the shoulder strap rising above it
  bags: {
    vb: [620, 800] as const,
    art: [10, 386, 600, 404] as const,
    body: "M18 386H602Q610 386 610 394V782Q610 790 602 790H18Q10 790 10 782V394Q10 386 18 386Z",
  },
  // A straight case with a flap over the top, about 1 : 7.5
  "ruler-cases": {
    vb: [140, 940] as const,
    art: [10, 10, 120, 920] as const,
    body: "M30 10H110Q130 10 130 30V914Q130 930 114 930H26Q10 930 10 914V30Q10 10 30 10Z",
  },
  notebooks: {
    vb: [440, 600] as const,
    art: [10, 10, 404, 572] as const,
    body: "M10 18Q10 10 18 10H404Q414 10 414 20V572Q414 582 404 582H18Q10 582 10 574Z",
  },
  // Die-cut stickers come in every shape: a square box they sit in
  stickers: {
    vb: [400, 400] as const,
    art: [20, 20, 360, 360] as const,
    body: "M60 20H340Q380 20 380 60V340Q380 380 340 380H60Q20 380 20 340V60Q20 20 60 20Z",
  },
} satisfies Record<CategoryId, { vb: readonly [number, number]; art: readonly [number, number, number, number]; body: string }>;

/** Width / height of a product type's outline. */
export const shapeRatio = (c: CategoryId) => SHAPES[c].vb[0] / SHAPES[c].vb[1];

/** Sizing class for a mockup or photo in a box: wide products fill the width, tall ones the height. */
export const fitClass = (c: CategoryId) => (shapeRatio(c) > 1 ? "w-full" : "h-full");
