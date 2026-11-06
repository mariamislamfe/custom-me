import type { Customization } from "@/config/customization";
import type { DepositStatus, OrderStatus } from "@/config/orders";
import type { PaymentMethod } from "@/config/payments";
import type { CategoryId, ProductImage } from "@/data/catalog";

export type OrderCustomer = {
  name: string;
  phone: string;
  email: string;
  governorate: string;
  city: string;
  address: string;
  notes: string;
};

/** A snapshot of what was bought, so the order stays readable if products change later. */
export type OrderLine = {
  /** Shop products: the product at the time of ordering */
  productId?: string;
  slug?: string;
  name: string;
  category: CategoryId;
  quantity: number;
  /** Price per piece in EGP, as charged (worked out on the server) */
  unitPrice: number;
  selection: Record<string, string>;
  /** Readable options, e.g. "Laptop size: 14"" */
  options: string[];
  /** Main product photo at the time of ordering */
  image?: ProductImage;
  /** Designed in the Lab: base colour (or the shop design personalized) + layers (image layers point at the stored originals) */
  custom?: Customization;
};

/**
 * InstaPay transfer made at checkout (only when enabled in config/payments.ts):
 * a deposit, or the whole order when paid in full.
 */
export type OrderDeposit = {
  amount: number;
  status: DepositStatus;
  /** Name or InstaPay number/address the customer paid from */
  payer: string;
  reference: string;
  /** Screenshot of the transfer, stored privately */
  receiptFileId: string;
};

export type Order = {
  id: string;
  /** e.g. CM-1001 */
  number: string;
  createdAt: string;
  updatedAt: string;
  status: OrderStatus;
  payment: PaymentMethod;
  deposit: OrderDeposit | null;
  /** What's left to collect in cash on delivery */
  codBalance: number;
  customer: OrderCustomer;
  lines: OrderLine[];
  subtotal: number;
  /** Promo code used, and what it took off the items (older orders: none) */
  promo?: { code: string; amount: number } | null;
  /** Taken off for paying the whole order by InstaPay */
  instapayDiscount?: number;
  /** null = not set for this governorate (confirmed on the phone) */
  shipping: number | null;
  /** Items − discounts + delivery */
  total: number;
  currency: string;
  /** Courier / tracking number, once shipped */
  trackingRef: string;
  /** Private note for the team */
  adminNote: string;
};

/** Everything taken off an order's items (promo code, paying in full by InstaPay). */
export const orderDiscount = (o: Pick<Order, "promo" | "instapayDiscount">) => (o.promo?.amount ?? 0) + (o.instapayDiscount ?? 0);
