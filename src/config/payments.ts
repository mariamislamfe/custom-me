/**
 * Payment at checkout.
 *
 * Cash on delivery always. Optionally InstaPay: once the InstaPay address or
 * number is filled in on the dashboard's Store & payments page, checkout
 * offers two ways to pay, each with a screenshot of the transfer:
 * - a deposit per piece now, the rest cash on delivery;
 * - the whole order now, for `fullPaymentDiscountPercent` off.
 * InstaPay has no API, so you check the screenshot and mark the payment
 * received in the order. While both are empty, checkout is cash on delivery only.
 */
export interface PaymentSettings {
  /** Deposit per piece in the bag, in EGP */
  depositPerPiece: number;
  /** % off the items for paying the whole order by InstaPay up front (0 turns that option off) */
  fullPaymentDiscountPercent: number;
  /** InstaPay address (IPA), e.g. "customme@instapay" */
  address: string;
  /** Mobile number linked to your InstaPay account */
  phone: string;
  /** The name customers see in InstaPay when they send the money */
  accountName: string;
  /** Optional: an InstaPay payment link (the link inside your InstaPay QR code) */
  link: string;
  /** Optional: your InstaPay QR code image, shown to shoppers on a computer */
  qr: string;
  /** With InstaPay on: cash on delivery with no deposit stays one of the choices */
  allowCod: boolean;
}

/** Starting values until the Store & payments page is saved. */
export const DEFAULT_PAYMENTS: PaymentSettings = {
  depositPerPiece: 100,
  fullPaymentDiscountPercent: 5,
  address: "",
  phone: "",
  accountName: "",
  link: "",
  qr: "",
  allowCod: false,
};

export type PaymentMethod = "cod" | "instapay-deposit" | "instapay-full";

export const depositEnabled = (pay: PaymentSettings) => Boolean(pay.address || pay.phone);

/** The ways to pay checkout offers, the default first. */
export function paymentMethods(pay: PaymentSettings): PaymentMethod[] {
  if (!depositEnabled(pay)) return ["cod"];
  const methods: PaymentMethod[] = pay.depositPerPiece > 0 ? ["instapay-deposit"] : [];
  if (pay.fullPaymentDiscountPercent > 0 || !methods.length) methods.push("instapay-full");
  if (pay.allowCod) methods.push("cod");
  return methods;
}

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cod: "Cash on delivery",
  "instapay-deposit": "InstaPay deposit + cash on delivery",
  "instapay-full": "Paid in full by InstaPay",
};

/** Deposit for an order: per piece, never more than the order total. */
export const depositFor = (pay: PaymentSettings, total: number, pieces: number) =>
  depositEnabled(pay) ? Math.min(pay.depositPerPiece * Math.max(1, pieces), total) : 0;

/**
 * What an order comes to, worked out the same way in the browser and on the
 * server: promo code off the items, then the InstaPay discount (paying in
 * full) off what's left, then delivery on top.
 */
export function orderTotals({
  subtotal,
  promo,
  shipping,
  pieces,
  payment,
  pay,
}: {
  pay: PaymentSettings;
  subtotal: number;
  /** What the promo code takes off the items */
  promo: number;
  /** null = not set for the governorate: paid on delivery, confirmed on the phone */
  shipping: number | null;
  pieces: number;
  payment: PaymentMethod;
}) {
  const items = Math.max(0, subtotal - promo);
  const instapayDiscount = payment === "instapay-full" ? Math.round((items * pay.fullPaymentDiscountPercent) / 100) : 0;
  const total = items - instapayDiscount + (shipping ?? 0);
  const paidNow = payment === "instapay-full" ? total : payment === "instapay-deposit" ? depositFor(pay, total, pieces) : 0;
  return { instapayDiscount, total, paidNow, codBalance: total - paidNow };
}
