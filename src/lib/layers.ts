import { LIMITS, type FontId, type ImageLayer, type TextLayer } from "@/config/customization";
import type { CategoryId } from "@/data/catalog";
import { SHAPES } from "@/components/products/shapes";

export const layerId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `l-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Keep rotations in (-180, 180] */
export const normalizeAngle = (deg: number) => {
  let a = ((((deg + 180) % 360) + 360) % 360) - 180;
  if (a === -180) a = 180;
  return Math.round(a * 10) / 10;
};

/** Print area height / width (the product's art box). */
export const areaAspect = (category: CategoryId) => SHAPES[category].art[3] / SHAPES[category].art[2];

/** Ruler cases are long and thin: text runs along the body. */
const TEXT_SPOT: Record<CategoryId, { y: number; rotation: number; span: number }> = {
  sleeves: { y: 0.5, rotation: 0, span: 0.8 },
  bags: { y: 0.5, rotation: 0, span: 0.8 },
  notebooks: { y: 0.45, rotation: 0, span: 0.8 },
  "ruler-cases": { y: 0.58, rotation: -90, span: 5 },
  stickers: { y: 0.5, rotation: 0, span: 0.8 },
};

export function newTextLayer(category: CategoryId, text: string, font: FontId, ink: string): TextLayer {
  const spot = TEXT_SPOT[category];
  return {
    id: layerId(),
    kind: "text",
    text,
    font,
    ink,
    size: clamp(Math.min(category === "ruler-cases" ? 0.5 : 0.16, spot.span / Math.max(1, text.length * 0.62)), ...LIMITS.textSize),
    x: 0.5,
    y: spot.y,
    rotation: spot.rotation,
  };
}

export type PreparedImage = Pick<ImageLayer, "src" | "name" | "aspect" | "originalWidth" | "originalHeight">;

/** Width (fraction of the print area) at which an image fits inside, or covers, the print area. */
export function fitWidth(category: CategoryId, aspect: number, mode: "fit" | "cover") {
  const ratio = areaAspect(category) / aspect;
  return clamp(mode === "fit" ? Math.min(1, ratio) : Math.max(1, ratio), ...LIMITS.imageWidth);
}

/** A new upload starts centred, filling most of the print area. */
export function newImageLayer(category: CategoryId, img: PreparedImage): ImageLayer {
  return { id: layerId(), kind: "image", ...img, width: clamp(fitWidth(category, img.aspect, "fit") * 0.86, ...LIMITS.imageWidth), x: 0.5, y: 0.5, rotation: 0 };
}
