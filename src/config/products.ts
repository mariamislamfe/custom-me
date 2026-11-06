/** Product photos uploaded in the dashboard. */
export const PRODUCT_IMAGE = {
  accept: ["image/png", "image/jpeg", "image/webp"],
  maxFileMb: 20,
  /** Longest side after processing */
  maxPx: 2400,
  maxPerProduct: 8,
} as const;
