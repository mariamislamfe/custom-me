import "server-only";
import sharp from "sharp";
import { productBox, removeWhiteBackground, restoreRectangle, sideBySideViews, transparentEdgeShare, trimOutline } from "@/lib/cutout";

export type ProcessedPhoto = { data: Buffer; width: number; height: number; cutout: boolean };

/**
 * Turns an uploaded product photo into the stored WebP(s):
 *
 * 1. Auto-rotates (EXIF) and shrinks to at most `maxPx` on the longest side
 *    (never enlarged), with a sharp Lanczos resize.
 * 2. Plain white or light grey background: removed (see lib/cutout.ts),
 *    unless the dashboard turned that off for this photo.
 * 3. `split`: a cut-out showing the product more than once side by side
 *    (front and back) becomes one photo per view. Read at twice the width
 *    first, so each view still gets the full `maxPx`.
 * 4. `rectangle` (notebooks, sleeves; the value is how rounded the corners
 *    are): whatever the removal took from inside the product's rectangle is
 *    put back (see restoreRectangle). `trim` takes that many pixels off the
 *    outline (T-ruler cases: no light halo round the dark binding).
 * 5. Transparent background (an uploaded cut-out or step 2): cropped to the
 *    product so it fills its frame instead of floating in empty space.
 * 6. Saved as high-quality WebP (transparency kept for cut-outs).
 */
export async function processProductPhoto(
  input: Buffer,
  maxPx: number,
  { removeBackground = true, split = false, rectangle = null as number | null, trim = 0 } = {},
): Promise<ProcessedPhoto[]> {
  const { data, info } = await sharp(input, { limitInputPixels: 120_000_000 })
    .rotate()
    .resize({ width: split ? maxPx * 2 : maxPx, height: maxPx, fit: "inside", withoutEnlargement: true, kernel: "lanczos3" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const px = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  const original = rectangle != null ? Uint8Array.from(px) : null;

  const alreadyCut = transparentEdgeShare(px, width, height) >= 0.3;
  const removed = !alreadyCut && removeBackground && removeWhiteBackground(px, width, height);
  if (removed && trim) trimOutline(px, width, height, trim);
  const cutout = alreadyCut || (removed && transparentEdgeShare(px, width, height) >= 0.3);

  const views = cutout && split ? sideBySideViews(px, width, height) : [{ left: 0, width }];
  const out: ProcessedPhoto[] = [];
  for (const view of views) {
    const cut = (raw: Uint8Array) => {
      if (views.length === 1) return Buffer.from(raw.buffer, raw.byteOffset, raw.byteLength);
      const part = Buffer.alloc(view.width * height * 4);
      for (let y = 0; y < height; y++) part.set(raw.subarray((y * width + view.left) * 4, (y * width + view.left + view.width) * 4), y * view.width * 4);
      return part;
    };
    const part = cut(px);
    if (removed && original) restoreRectangle(part, cut(original), view.width, height, rectangle ?? 0);
    out.push(await encode(part, view.width, height, cutout, maxPx));
  }
  return out;
}

async function encode(raw: Buffer, width: number, height: number, cutout: boolean, maxPx: number): Promise<ProcessedPhoto> {
  let image = sharp(raw, { raw: { width, height, channels: 4 } });
  let size = { width, height };
  if (cutout) {
    const box = productBox(new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength), width, height);
    if (box) {
      image = sharp(await image.extract(box).png().toBuffer());
      size = { width: box.width, height: box.height };
    }
  } else {
    image = image.removeAlpha();
  }
  if (Math.max(size.width, size.height) > maxPx) {
    const s = maxPx / Math.max(size.width, size.height);
    size = { width: Math.round(size.width * s), height: Math.round(size.height * s) };
    image = sharp(await image.resize({ ...size, kernel: "lanczos3" }).png().toBuffer());
  }
  const data = await image.webp({ quality: 92, alphaQuality: 95, smartSubsample: true, effort: 5 }).toBuffer();
  return { data, ...size, cutout };
}
