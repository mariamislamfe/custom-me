import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { isAdmin } from "@/lib/server/auth";
import { publicUrl, putFile } from "@/lib/server/backend";
import { readDesign } from "@/lib/server/uploads";

/** Long side of the preview the shop and the Lab show (the original is kept for print). */
const PREVIEW_PX = 1600;

/**
 * A piece of a design's editable original (see Product.template): the
 * original file is already in the designs bucket, kept untouched for print.
 * This makes the WebP preview the shop shows while it's being customized,
 * transparency kept, and reports the original's size.
 */
export async function POST(request: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Your session expired. Log in again." }, { status: 401 });

  const { fileId, name } = await request.json().catch(() => ({}));
  const label = String(name ?? "That file").slice(0, 80);
  const original = await readDesign(String(fileId ?? ""));
  if (!original) return Response.json({ error: `“${label}” didn't arrive. Upload it again.` }, { status: 400 });

  try {
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
    return Response.json({
      src: publicUrl(file),
      aspect: info.height / info.width,
      originalWidth: (turned ? meta.height : meta.width) ?? info.width,
      originalHeight: (turned ? meta.width : meta.height) ?? info.height,
    });
  } catch (err) {
    console.error("Design preview failed", err);
    return Response.json({ error: `“${label}” couldn't be read as an image.` }, { status: 422 });
  }
}
