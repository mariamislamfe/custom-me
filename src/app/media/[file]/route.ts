import { getFile } from "@/lib/server/backend";
import { PHOTO_NAME } from "@/lib/server/products";

/** Product photos, when the store keeps files in the local data folder (with Supabase they're served by Supabase). */
export async function GET(_req: Request, { params }: RouteContext<"/media/[file]">) {
  const { file } = await params;
  const data = PHOTO_NAME.test(file) ? await getFile("products", file) : null;
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "image/webp",
      // File names are random and never reused, so they can be cached forever
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
