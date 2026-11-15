import { isAdmin } from "@/lib/server/auth";
import { readDesign } from "@/lib/server/uploads";
import { designFromPhoto, designPreview } from "@/lib/server/template";

/**
 * A piece of a design's editable original (see Product.template).
 * `{ fileId }`: an original already in the designs bucket (kept untouched for
 * print); this makes the WebP preview the shop shows and reports its size.
 * `{ photo }`: one of the product's own photos, made into a piece the same way.
 */
export async function POST(request: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Your session expired. Log in again." }, { status: 401 });

  const { fileId, name, photo } = await request.json().catch(() => ({}));
  const label = String(name ?? "That file").slice(0, 80);

  if (typeof photo === "string") {
    try {
      const piece = await designFromPhoto(photo);
      if (!piece) return Response.json({ error: "That photo isn't saved yet. Save the product, then try again." }, { status: 400 });
      return Response.json(piece);
    } catch (err) {
      console.error("Photo design failed", err);
      return Response.json({ error: "The photo couldn't be used. Try again." }, { status: 422 });
    }
  }

  const original = await readDesign(String(fileId ?? ""));
  if (!original) return Response.json({ error: `“${label}” didn't arrive. Upload it again.` }, { status: 400 });
  try {
    return Response.json(await designPreview(original));
  } catch (err) {
    console.error("Design preview failed", err);
    return Response.json({ error: `“${label}” couldn't be read as an image.` }, { status: 422 });
  }
}
