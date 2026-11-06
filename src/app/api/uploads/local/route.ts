import { putFile, readLocalUploadToken } from "@/lib/server/backend";
import { contentTypeOf, FILE_ID } from "@/lib/server/uploads";

/**
 * Step 2 of an upload when the store keeps files in the local data folder
 * (no Supabase): receives the file sent to the one-time link. With Supabase,
 * the browser sends files to Supabase Storage instead.
 */
export async function PUT(request: Request) {
  const target = readLocalUploadToken(new URL(request.url).searchParams.get("token") ?? "");
  if (!target) return Response.json({ error: "This upload link has expired. Try again." }, { status: 403 });
  const fileId = target.name.split("/").pop() ?? "";
  if (!FILE_ID.test(fileId)) return Response.json({ error: "Unknown file." }, { status: 400 });
  if ((request.headers.get("content-type") ?? "").split(";")[0] !== contentTypeOf(fileId)) {
    return Response.json({ error: "That file type isn't supported." }, { status: 415 });
  }
  const data = Buffer.from(await request.arrayBuffer());
  if (!data.length || data.length > target.maxBytes) return Response.json({ error: "That file is too big." }, { status: 413 });
  try {
    await putFile(target.bucket, target.name, data, contentTypeOf(fileId));
  } catch {
    return Response.json({ error: "This upload link was already used." }, { status: 409 });
  }
  return Response.json({ ok: true });
}
