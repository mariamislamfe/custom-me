import { lab } from "@/config/customization";
import type { PreparedImage } from "./layers";

export class UploadError extends Error {}

/**
 * Checks a customer's artwork file and makes a lightweight preview copy
 * (longest side ≤ previewMaxPx) for the live preview and the bag. The
 * original file is uploaded separately, untouched, for printing.
 */
export async function prepareUpload(file: File): Promise<PreparedImage> {
  if (!lab.uploads.accept.includes(file.type)) {
    throw new UploadError(`That file type isn't supported. Upload a ${lab.uploads.acceptLabel} file.`);
  }
  if (file.size > lab.uploads.maxMB * 1024 * 1024) {
    throw new UploadError(`That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${lab.uploads.maxMB} MB.`);
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new UploadError("That image couldn't be opened. Try exporting it again as PNG or JPG.");
  }

  const { width, height } = bitmap;
  const scale = Math.min(1, lab.uploads.previewMaxPx / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new UploadError("Your browser couldn't process that image.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  // WebP keeps transparency and stays small; browsers without WebP encoding return PNG.
  return { src: canvas.toDataURL("image/webp", 0.9), name: file.name, aspect: height / width, originalWidth: width, originalHeight: height };
}
