import { isAdmin } from "@/lib/server/auth";
import { allowUpload, signedUpload, UPLOAD_KINDS, UPLOAD_TYPES, type UploadKind } from "@/lib/server/uploads";

/**
 * Step 1 of an upload: checks the file's type and size and hands back a
 * one-time link; the browser then sends the file straight to storage
 * (see lib/upload.ts).
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const kind = body?.kind as UploadKind;
  const type = String(body?.type ?? "");
  const size = Number(body?.size);
  const rules = Object.hasOwn(UPLOAD_KINDS, kind) ? UPLOAD_KINDS[kind] : null;
  if (!rules) return Response.json({ error: "Unknown upload." }, { status: 400 });

  if (rules.admin) {
    if (!(await isAdmin())) return Response.json({ error: "Your session expired. Log in again." }, { status: 401 });
  } else {
    const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
    if (!allowUpload(`${kind}:${ip}`)) {
      return Response.json({ error: "Too many uploads. Wait a few minutes and try again." }, { status: 429 });
    }
  }
  if (!UPLOAD_TYPES[type]) {
    return Response.json({ error: "That file type isn't supported. Upload a PNG, JPG or WebP image." }, { status: 415 });
  }
  if (!(size > 0) || size > rules.maxMb * 1024 * 1024) {
    return Response.json({ error: `That file is over ${rules.maxMb} MB.` }, { status: 413 });
  }

  try {
    return Response.json(await signedUpload(kind, type));
  } catch (err) {
    console.error("Upload link failed", err);
    return Response.json({ error: "Uploads aren't available right now. Try again in a minute." }, { status: 503 });
  }
}
