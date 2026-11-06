import { isAdmin } from "@/lib/server/auth";
import { contentTypeOf, readDesign } from "@/lib/server/uploads";

/** Customer artwork, for the dashboard only. `?download=name.png` saves it as a file. */
export async function GET(request: Request, { params }: RouteContext<"/api/admin/designs/[file]">) {
  if (!(await isAdmin())) return new Response("Log in to the dashboard to view this file.", { status: 401 });
  const { file } = await params;
  const data = await readDesign(file);
  if (!data) return new Response("Not found", { status: 404 });
  const download = new URL(request.url).searchParams.get("download");
  const safeName = download ? download.replace(/[^\w.\- ]+/g, "_").slice(0, 80) : null;
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": contentTypeOf(file),
      "Cache-Control": "private, max-age=3600",
      ...(safeName ? { "Content-Disposition": `attachment; filename="${safeName}"` } : {}),
    },
  });
}
