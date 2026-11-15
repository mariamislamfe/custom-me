import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { PALETTES } from "@/components/art/artworks";
import { lab, type DesignTemplate, type ImageLayer } from "@/config/customization";
import { productViews, type Product } from "@/data/catalog";
import { photoPlacement } from "@/lib/layers";
import { getFile, publicName, publicUrl, putFile } from "./backend";
import { PHOTO_NAME, readProducts, setTemplates } from "./products";

/** Long side of the preview the shop and the Lab show (the original is kept for print). */
const PREVIEW_PX = 1600;

export type DesignPiece = Pick<ImageLayer, "fileId" | "src" | "aspect" | "originalWidth" | "originalHeight"> & { fileId: string };

/**
 * The WebP preview of a design piece the shop shows while it's customized
 * (transparency kept), and the original's size.
 */
export async function designPreview(original: Buffer) {
  const image = sharp(original, { limitInputPixels: 120_000_000 }).rotate();
  const meta = await image.metadata();
  const { data, info } = await image
    .resize({ width: PREVIEW_PX, height: PREVIEW_PX, fit: "inside", withoutEnlargement: true, kernel: "lanczos3" })
    .webp({ quality: 90, alphaQuality: 95, effort: 5 })
    .toBuffer({ resolveWithObject: true });
  const file = `${randomUUID()}.webp`;
  await putFile("products", file, data, "image/webp");
  // EXIF-rotated photos swap width and height
  const turned = (meta.orientation ?? 1) >= 5;
  return {
    src: publicUrl(file),
    aspect: info.height / info.width,
    originalWidth: (turned ? meta.height : meta.width) ?? info.width,
    originalHeight: (turned ? meta.width : meta.height) ?? info.height,
  };
}

/**
 * A product photo as a piece of its editable design: copied into the design
 * files (so orders can print it), with its own preview. null = not one of our photos.
 */
export async function designFromPhoto(src: string): Promise<DesignPiece | null> {
  const name = publicName(src);
  if (!name || !PHOTO_NAME.test(name)) return null;
  const photo = await getFile("products", name);
  if (!photo) return null;
  const fileId = `${randomUUID()}.webp`;
  await putFile("designs", fileId, photo, "image/webp");
  return { fileId, ...(await designPreview(photo)) };
}

/** Can the product's photo become its editable design? One colour only: the photo shows just that one. */
export const photoTemplateFits = (p: Product) => lab.categories.includes(p.category) && !p.template?.layers.length && p.colours.length <= 1 && Boolean(productViews(p).front);

/**
 * Every product without an editable design gets one made of its own front
 * photo, laid over its print area, ready to change and add to.
 * Returns how many were made and the names of those left out (more than one colour).
 */
export async function makePhotoTemplates() {
  const products = await readProducts();
  const made: Record<string, DesignTemplate> = {};
  const skipped: string[] = [];
  for (const p of products) {
    if (!lab.categories.includes(p.category) || p.template?.layers.length) continue;
    const front = productViews(p).front;
    if (!front) continue;
    if (p.colours.length > 1) {
      skipped.push(p.name);
      continue;
    }
    const piece = await designFromPhoto(front.src);
    if (!piece) continue;
    const layer: ImageLayer = { id: randomUUID(), kind: "image", name: `${p.name} (photo)`, ...piece, ...photoPlacement(p.category, piece.aspect), x: 0.5, rotation: 0 };
    made[p.id] = { base: p.colours[0]?.hex.toUpperCase() ?? PALETTES[p.palette].ground, layers: [layer] };
  }
  await setTemplates(made);
  return { made: Object.keys(made).length, skipped };
}
