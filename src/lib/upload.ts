/**
 * Uploads a file from the browser: asks /api/uploads for a one-time link,
 * then sends the file straight to storage. Resolves to the stored file id.
 * Errors carry a message that can be shown to the customer as is.
 */
export async function uploadFile(kind: "design" | "receipt" | "product", file: File): Promise<string> {
  let res: Response;
  try {
    res = await fetch("/api/uploads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, type: file.type, size: file.size }),
    });
  } catch {
    throw new Error("The upload didn't start. Check your connection and try again.");
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.url) throw new Error(json.error ?? "The upload didn't start. Try again.");

  try {
    const put = await fetch(json.url, {
      method: "PUT",
      headers: { "Content-Type": file.type, "x-upsert": "false" },
      body: file,
    });
    if (!put.ok) throw new Error();
  } catch {
    throw new Error("The file didn't finish uploading. Check your connection and try again.");
  }
  return json.fileId as string;
}
