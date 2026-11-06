import "server-only";
import { randomUUID } from "node:crypto";
import { lab } from "@/config/customization";
import { fileExists, getFile, removeFiles, signedUploadUrl, type Bucket } from "./backend";
import { PRODUCT_IMAGE } from "./products";

/**
 * Files customers and the dashboard upload. The browser sends them straight
 * to storage with a one-time link from /api/uploads (see lib/upload.ts), so
 * big files never pass through, or get cut off by, the server.
 *
 * - design: customers' original artwork, kept exactly as uploaded for printing
 * - receipt: InstaPay transfer screenshots
 * - product: dashboard photos, then processed into WebP by /api/admin/upload
 */
export const UPLOAD_KINDS = {
  design: { bucket: "designs", folder: "", maxMb: lab.uploads.maxMB, admin: false },
  receipt: { bucket: "receipts", folder: "", maxMb: 10, admin: false },
  product: { bucket: "products", folder: "incoming/", maxMb: PRODUCT_IMAGE.maxFileMb, admin: true },
} satisfies Record<string, { bucket: Bucket; folder: string; maxMb: number; admin: boolean }>;
export type UploadKind = keyof typeof UPLOAD_KINDS;

export const UPLOAD_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

/** Only our own generated names are ever read. */
export const FILE_ID = /^[a-f0-9-]{36}\.(png|jpg|webp)$/;

export const contentTypeOf = (fileId: string) =>
  Object.keys(UPLOAD_TYPES).find((t) => fileId.endsWith(`.${UPLOAD_TYPES[t]}`)) ?? "application/octet-stream";

/** A one-time link the browser can PUT the file to. */
export async function signedUpload(kind: UploadKind, type: string) {
  const fileId = `${randomUUID()}.${UPLOAD_TYPES[type]}`;
  const { bucket, folder, maxMb } = UPLOAD_KINDS[kind];
  const url = await signedUploadUrl(bucket, folder + fileId, maxMb * 1024 * 1024);
  return { fileId, url };
}

export const designExists = (fileId: string) => FILE_ID.test(fileId) && fileExists("designs", fileId);
export const receiptExists = (fileId: string) => FILE_ID.test(fileId) && fileExists("receipts", fileId);
export const readDesign = (fileId: string) => (FILE_ID.test(fileId) ? getFile("designs", fileId) : null);
export const readReceipt = (fileId: string) => (FILE_ID.test(fileId) ? getFile("receipts", fileId) : null);

/** A dashboard photo the browser just uploaded, read once and then removed. */
export async function takeIncomingPhoto(fileId: string) {
  if (!FILE_ID.test(fileId)) return null;
  const path = UPLOAD_KINDS.product.folder + fileId;
  const data = await getFile("products", path);
  await removeFiles("products", [path]);
  return data;
}

// Very small in-memory rate limiter for the public upload endpoint.
const hits = new Map<string, number[]>();
export function allowUpload(key: string) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < 10 * 60 * 1000);
  if (recent.length >= lab.uploads.perTenMinutes) return false;
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return true;
}
