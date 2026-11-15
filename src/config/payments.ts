/**
 * Payment at checkout.
 *
 * Cash on delivery always. Optionally InstaPay: once the InstaPay address or
 * number is filled in on the dashboard's Store & payments page, checkout
 * offers two ways to pay, each with a screenshot of the transfer:
 * - a deposit now, the rest cash on delivery (see `depositFor`);
 * - the whole order now, for `fullPaymentDiscountPercent` off.
 * InstaPay has no API, so you check the screenshot and mark the payment
 * received in the order. While both are empty, checkout is cash on delivery only.
 */

/** A deposit set by hand: EGP for each piece, or a % of each piece's price. */
export type DepositAmount = { unit: "egp" | "percent"; value: number };

export interface PaymentSettings {
  /**
   * On: the deposit for ready-made products is the delivery fee (once per
   * order). Off: it's `readyDeposit`. Custom pieces always take `customDeposit`.
   */
  depositIsDelivery: boolean;
  /** Ready-made products (shop designs as they're sold), when `depositIsDelivery` is off */
  readyDeposit: DepositAmount;
  /** Custom pieces (designed in the Lab, or a shop design personalized) */
  customDeposit: DepositAmount;
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
  depositIsDelivery: true,
  readyDeposit: { unit: "egp", value: 100 },
  customDeposit: { unit: "percent", value: 50 },
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

/**
 * The ways to pay checkout offers, the default first. `deposit`: what the
 * deposit comes to for this order; nothing to put down = no deposit choice.
 */
export function paymentMethods(pay: PaymentSettings, deposit: number): PaymentMethod[] {
  if (!depositEnabled(pay)) return ["cod"];
  const methods: PaymentMethod[] = deposit > 0 ? ["instapay-deposit"] : [];
  if (pay.fullPaymentDiscountPercent > 0 || !methods.length) methods.push("instapay-full");
  if (pay.allowCod) methods.push("cod");
  return methods;
}

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cod: "Cash on delivery",
  "instapay-deposit": "InstaPay deposit + cash on delivery",
  "instapay-full": "Paid in full by InstaPay",
};

/** A bag line as the deposit sees it: custom or ready-made, its price each and how many. */
export type DepositLine = { custom: boolean; unitPrice: number; qty: number };

const part = (a: DepositAmount, l: DepositLine) => (a.unit === "percent" ? Math.round((l.unitPrice * a.value) / 100) : Math.min(a.value, l.unitPrice)) * Math.max(1, l.qty);

/**
 * Deposit for an order, never more than its total:
 * - ready-made products: the delivery fee (once, when it's known), or the set amount;
 * - custom pieces: their set amount (50% of the price to start with).
 */
export function depositFor(pay: PaymentSettings, lines: DepositLine[], shipping: number | null, total: number) {
  if (!depositEnabled(pay)) return 0;
  const ready = lines.filter((l) => !l.custom);
  const custom = lines.filter((l) => l.custom);
  const forReady = !ready.length ? 0 : pay.depositIsDelivery ? (shipping ?? 0) : ready.reduce((n, l) => n + part(pay.readyDeposit, l), 0);
  const forCustom = custom.reduce((n, l) => n + part(pay.customDeposit, l), 0);
  return Math.max(0, Math.min(forReady + forCustom, total));
}

/** "the delivery fee", "EGP 100 a piece", "50% of the price": for notes to the customer. */
export function depositText(a: DepositAmount) {
  return a.unit === "percent" ? `${a.value}% of the price` : `EGP ${a.value} a piece`;
}

/**
 * What an order comes to, worked out the same way in the browser and on the
 * server: promo code off the items, then the InstaPay discount (paying in
 * full) off what's left, then delivery on top. `deposit` is the deposit
 * whichever way they pay (what "Deposit now" would take).
 */
export function orderTotals({
  subtotal,
  promo,
  shipping,
  lines,
  payment,
  pay,
}: {
  pay: PaymentSettings;
  subtotal: number;
  /** What the promo code takes off the items */
  promo: number;
  /** null = not set for the governorate: paid on delivery, confirmed on the phone */
  shipping: number | null;
  lines: DepositLine[];
  payment: PaymentMethod;
}) {
  const items = Math.max(0, subtotal - promo);
  const instapayDiscount = payment === "instapay-full" ? Math.round((items * pay.fullPaymentDiscountPercent) / 100) : 0;
  const total = items - instapayDiscount + (shipping ?? 0);
  const deposit = depositFor(pay, lines, shipping, items + (shipping ?? 0));
  const paidNow = payment === "instapay-full" ? total : payment === "instapay-deposit" ? Math.min(deposit, total) : 0;
  return { instapayDiscount, total, paidNow, codBalance: total - paidNow, deposit };
}
