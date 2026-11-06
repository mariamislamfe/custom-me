import { randomUUID } from "node:crypto";
import { isAdmin } from "@/lib/server/auth";
import { publicUrl, putFile } from "@/lib/server/backend";
import { processProductPhoto } from "@/lib/server/photo";
import { PRODUCT_IMAGE } from "@/lib/server/products";
import { takeIncomingPhoto } from "@/lib/server/uploads";

/**
 * Step 2 of a dashboard photo upload (the file is already in storage, see
 * lib/upload.ts): removes a plain white background, splits side-by-side
 * views into separate photos if asked, crops to the product, converts to
 * high-quality WebP (see lib/server/photo.ts) and reports whether each
 * photo is a cut-out, and which is the back.
 */
export async function POST(request: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Your session expired. Log in again." }, { status: 401 });

  const { fileId, name, removeBackground, split, category } = await request.json().catch(() => ({}));
  const label = String(name ?? "That photo").slice(0, 80);
  const input = await takeIncomingPhoto(String(fileId ?? ""));
  if (!input) return Response.json({ error: `“${label}” didn't arrive. Upload it again.` }, { status: 400 });

  try {
    const photos = await processProductPhoto(input, PRODUCT_IMAGE.maxPx, {
      removeBackground: removeBackground !== false,
      split: split === true,
      // Notebook covers and sleeves are rectangles: a light print touching their edge stays
      rectangle: category === "notebooks" ? 0 : category === "sleeves" ? 0.06 : null,
      // T-ruler cases have a dark binding all round: no light rim left on it
      trim: category === "ruler-cases" ? 1 : 0,
    });
    const images = [];
    for (const [k, { data, width, height, cutout }] of photos.entries()) {
      const file = `${randomUUID()}.webp`;
      await putFile("products", file, data, "image/webp");
      // A split photo: the second view is the back
      images.push({ src: publicUrl(file), width, height, cutout, alt: "", ...(k > 0 ? { back: true } : {}) });
    }
    return Response.json({ images });
  } catch (err) {
    console.error("Photo processing failed", err);
    return Response.json({ error: `“${label}” couldn't be read as an image.` }, { status: 422 });
  }
}
