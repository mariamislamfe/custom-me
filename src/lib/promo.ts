/**
 * Promo codes, made on the dashboard's Promo codes page. A code takes a
 * percentage or a fixed amount off the items (never off delivery).
 */
export type PromoCode = {
  /** Upper case, no spaces, e.g. "WELCOME10" */
  code: string;
  kind: "percent" | "fixed";
  /** Percent (1–100) or EGP */
  value: number;
  active: boolean;
  /** Items must come to at least this much (EGP); null = any order */
  minSubtotal: number | null;
  /** Orders that can use it; null = no limit */
  maxUses: number | null;
  uses: number;
  /** Last day it works (YYYY-MM-DD, Egypt time); null = no end */
  expires: string | null;
  createdAt: string;
};

export const CODE_PATTERN = /^[A-Z0-9_-]{3,24}$/;

export const normalizeCode = (raw: unknown) =>
  String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

/** What a code takes off items worth `subtotal`. */
export function promoDiscount(p: Pick<PromoCode, "kind" | "value">, subtotal: number) {
  return p.kind === "percent" ? Math.round((subtotal * Math.min(100, p.value)) / 100) : Math.min(p.value, subtotal);
}

/** Why a code can't be used on this order, or null when it can. `today` is YYYY-MM-DD. */
export function promoProblem(p: PromoCode, subtotal: number, today: string) {
  if (!p.active) return "That code isn't active.";
  if (p.expires && today > p.expires) return "That code has expired.";
  if (p.maxUses != null && p.uses >= p.maxUses) return "That code has been used up.";
  if (p.minSubtotal != null && subtotal < p.minSubtotal) return `That code works on orders of ${p.minSubtotal} EGP or more.`;
  return null;
}

/** "10% off" / "100 EGP off" */
export const promoLabel = (p: Pick<PromoCode, "kind" | "value">) => (p.kind === "percent" ? `${p.value}% off` : `${p.value} EGP off`);
