import { isAdmin } from "@/lib/server/auth";
import { contentTypeOf, readReceipt } from "@/lib/server/uploads";

/** InstaPay transfer screenshots, for the dashboard only. */
export async function GET(_request: Request, { params }: RouteContext<"/api/admin/receipts/[file]">) {
  if (!(await isAdmin())) return new Response("Log in to the dashboard to view this file.", { status: 401 });
  const { file } = await params;
  const data = await readReceipt(file);
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), { headers: { "Content-Type": contentTypeOf(file), "Cache-Control": "private, max-age=3600" } });
}
