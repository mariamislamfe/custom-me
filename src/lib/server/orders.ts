import "server-only";
import { randomUUID } from "node:crypto";
import { PALETTES } from "@/components/art/artworks";
import { colourName, HEX, lab, LIMITS, type Customization, type DesignBase, type DesignLayer, type TemplateRef } from "@/config/customization";
import { GOVERNORATES, MAX_LINES, MAX_QTY, type DepositStatus, type Governorate, type OrderStatus } from "@/config/orders";
import { orderTotals, paymentMethods, type PaymentMethod } from "@/config/payments";
import { site } from "@/config/site";
import { categories, cleanSelection, priceFor, productViews, selectionLabels, type CategoryId } from "@/data/catalog";
import { cairoDay } from "@/lib/finance";
import { normalizeCode, promoDiscount, promoProblem } from "@/lib/promo";
import type { Order, OrderCustomer, OrderLine } from "@/lib/types";
import { countRecentOrders, deleteOrderRow, findOrderRows, insertOrderRow, readOrderRow, readOrderRows, removeFiles, updateOrderRow, type OrderRow } from "./backend";
import { readProducts, storefront } from "./products";
import { countPromoUse, findPromoCode, readDeliveryFees, readPricing, readStoreInfo } from "./settings";
import { designExists, receiptExists } from "./uploads";

/**
 * Orders: the order as JSON plus a counter that hands out the CM-1001,
 * CM-1002… numbers without clashes (see backend.ts).
 */
const fromRow = (row: OrderRow<Order>): Order => ({ ...row.data, id: row.id, number: `CM-${row.number}` });

/** Newest first. */
export async function readOrders(): Promise<Order[]> {
  return (await readOrderRows<Order>()).map(fromRow);
}

export async function readOrder(id: string): Promise<Order | null> {
  const row = await readOrderRow<Order>(id);
  return row ? fromRow(row) : null;
}

// ── Checkout input ───────────────────────────────────────────────

export type CheckoutErrors = Partial<Record<keyof OrderCustomer | "form" | "payer" | "receipt" | "promo", string>>;

/** What the bag sends: prices are never trusted, they're worked out again here. */
export type CheckoutLine = {
  kind?: unknown;
  slug?: unknown;
  category?: unknown;
  qty?: unknown;
  selection?: unknown;
  custom?: unknown;
};

export type DepositInput = { payer?: unknown; reference?: unknown; receiptFileId?: unknown };

/** Egyptian mobile numbers: 010/011/012/015 + 8 digits, with or without +20. */
export function normalizePhone(raw: string) {
  const digits = raw.replace(/[^\d+]/g, "").replace(/^\+?20/, "0").replace(/^(?!0)/, "0");
  return /^01[0125]\d{8}$/.test(digits) ? digits : null;
}

function cleanCustomer(input: Partial<Record<keyof OrderCustomer, unknown>>) {
  const s = (v: unknown, max: number) => String(v ?? "").trim().replace(/\s+/g, " ").slice(0, max);
  const customer: OrderCustomer = {
    name: s(input.name, 80),
    phone: s(input.phone, 20),
    email: s(input.email, 120),
    governorate: s(input.governorate, 40),
    city: s(input.city, 60),
    address: String(input.address ?? "").trim().slice(0, 300),
    notes: String(input.notes ?? "").trim().slice(0, 500),
  };
  const errors: CheckoutErrors = {};
  if (customer.name.length < 2) errors.name = "Enter your full name.";
  const phone = normalizePhone(customer.phone);
  if (!phone) errors.phone = "Enter an Egyptian mobile number, like 01012345678.";
  else customer.phone = phone;
  if (customer.email && !/^\S+@\S+\.\S+$/.test(customer.email)) errors.email = "Enter an email like name@example.com, or leave it empty.";
  if (!(GOVERNORATES as readonly string[]).includes(customer.governorate)) errors.governorate = "Choose your governorate.";
  if (customer.city.length < 2) errors.city = "Enter your city or area.";
  if (customer.address.length < 5) errors.address = "Enter your street address, building and apartment.";
  return { customer, errors };
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const num = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? clamp(n, min, max) : fallback;
};

/**
 * Re-check a design and swap the browser previews for the stored originals.
 * `design`: the shop design it personalizes, as the server knows it.
 */
async function cleanCustom(input: unknown, design?: DesignBase, template?: TemplateRef): Promise<Customization | string> {
  const c = input as Partial<Customization> | null;
  // Any colour; bags from before colours could be picked name a colourway
  const base = typeof c?.base === "string" && HEX.test(c.base) ? c.base.toUpperCase() : c?.baseId && c.baseId in PALETTES ? PALETTES[c.baseId].ground : null;
  if (!c || !base) return "A custom piece has an unknown base colour.";
  if (!Array.isArray(c.layers) || c.layers.length === 0) return "A custom piece has no design on it.";
  if (c.layers.length > lab.maxLayers) return "A custom piece has too many layers.";
  const layers: DesignLayer[] = [];
  for (const l of c.layers as Partial<DesignLayer>[]) {
    const place = {
      id: String(l.id ?? randomUUID()).slice(0, 60),
      x: num(l.x, 0, 1, 0.5),
      y: num(l.y, 0, 1, 0.5),
      rotation: num(l.rotation, -180, 180, 0),
    };
    if (l.kind === "image") {
      const fileId = String(l.fileId ?? "");
      if (!(await designExists(fileId))) {
        return "One of your uploaded designs is missing. Remove the piece from your bag, upload the design again in the Lab and reorder.";
      }
      layers.push({
        ...place,
        kind: "image",
        fileId,
        src: `/api/admin/designs/${fileId}`,
        name: String(l.name ?? "design").slice(0, 120),
        aspect: num(l.aspect, 0.02, 50, 1),
        originalWidth: Math.round(num(l.originalWidth, 1, 100000, 1)),
        originalHeight: Math.round(num(l.originalHeight, 1, 100000, 1)),
        width: num(l.width, ...LIMITS.imageWidth, 0.5),
      });
    } else if (l.kind === "text") {
      const text = String(l.text ?? "").slice(0, lab.text.maxLength);
      if (!text.trim() || !lab.text.allowedPattern.test(text)) return "A custom text uses characters we can't print.";
      if (!lab.text.fonts.some((f) => f.id === l.font) || typeof l.ink !== "string" || !HEX.test(l.ink)) return "A custom text has an unknown style.";
      layers.push({ ...place, kind: "text", text, font: l.font!, ink: l.ink.toUpperCase(), size: num(l.size, ...LIMITS.textSize, 0.2) });
    } else {
      return "A custom piece has an unknown layer.";
    }
  }
  return { base, ...(design ? { design } : {}), ...(template ? { template } : {}), layers };
}

// Basic guard against bots flooding the order list: 10 orders per device per hour.
async function allowOrder(key: string) {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  return (await countRecentOrders(key, since)) < 10;
}

export async function createOrder(
  input: { customer?: Partial<Record<keyof OrderCustomer, unknown>>; lines?: CheckoutLine[]; deposit?: DepositInput; payment?: unknown; promo?: unknown },
  clientKey: string,
): Promise<{ order: Order } | { errors: CheckoutErrors }> {
  const { customer, errors } = cleanCustomer(input.customer ?? {});
  const pay = (await readStoreInfo()).payments;
  const methods = paymentMethods(pay);
  const payment = methods.includes(input.payment as PaymentMethod) ? (input.payment as PaymentMethod) : methods[0];
  // An InstaPay transfer (deposit or the whole order) comes with its screenshot
  const withDeposit = payment !== "cod";
  const payer = String(input.deposit?.payer ?? "").trim().slice(0, 80);
  const reference = String(input.deposit?.reference ?? "").trim().slice(0, 80);
  const receiptFileId = String(input.deposit?.receiptFileId ?? "");
  if (withDeposit) {
    if (payer.length < 2) errors.payer = "Enter the name or InstaPay number you paid from.";
    if (!(await receiptExists(receiptFileId))) errors.receipt = "Upload a screenshot of your InstaPay transfer.";
  }
  if (Object.keys(errors).length) return { errors };
  if (!(await allowOrder(clientKey))) return { errors: { form: "Too many orders from this device. Try again in a while or contact us." } };

  const lines = Array.isArray(input.lines) ? input.lines.slice(0, MAX_LINES) : [];
  if (!lines.length) return { errors: { form: "Your bag is empty." } };

  const [products, pricing] = await Promise.all([readProducts().then(storefront), readPricing()]);
  const out: OrderLine[] = [];
  for (const l of lines) {
    const quantity = Math.round(num(l.qty, 1, MAX_QTY, 1));
    if (l.kind === "custom") {
      // A shop design's editable original, changed by the customer
      const fromTemplate = (l.custom as Partial<Customization> | null)?.template;
      if (fromTemplate && typeof fromTemplate === "object") {
        const product = products.find((p) => p.slug === String(fromTemplate.slug ?? ""));
        if (!product || !product.customizable || !product.template?.layers.length || !lab.categories.includes(product.category)) {
          return { errors: { form: "A design you customized isn't available any more. Remove it from your bag and try again." } };
        }
        if (!product.available) return { errors: { form: `${product.name} is sold out. Remove it from your bag to continue.` } };
        const selection = cleanSelection(product, l.selection, pricing);
        if (!selection) return { errors: { form: `Choose the options for ${product.name} again.` } };
        const own = priceFor(product, selection, pricing);
        if (own == null) return { errors: { form: "A design you customized isn't available any more. Remove it from your bag and try again." } };
        const custom = await cleanCustom(l.custom, undefined, { productId: product.id, slug: product.slug, name: product.name });
        if (typeof custom === "string") return { errors: { form: custom } };
        out.push({
          productId: product.id,
          slug: product.slug,
          name: `${product.name}, personalized`,
          category: product.category,
          quantity,
          unitPrice: own + (pricing.personalize[product.category] ?? 0),
          selection,
          options: [...selectionLabels(product, selection, pricing), `Base colour: ${colourName(custom.base!)}`],
          image: productViews(product, selection.colour).front,
          custom,
        });
        continue;
      }
      // A shop design with the customer's name or art added on top
      const wanted = (l.custom as Partial<Customization> | null)?.design;
      if (wanted && typeof wanted === "object") {
        const product = products.find((p) => p.slug === String(wanted.slug ?? ""));
        if (!product || !product.customizable || !lab.categories.includes(product.category)) {
          return { errors: { form: "A design you personalized isn't available any more. Remove it from your bag and try again." } };
        }
        if (!product.available) return { errors: { form: `${product.name} is sold out. Remove it from your bag to continue.` } };
        const selection = cleanSelection(product, l.selection, pricing);
        if (!selection) return { errors: { form: `Choose the options for ${product.name} again.` } };
        const own = priceFor(product, selection, pricing);
        const front = productViews(product, selection.colour).front;
        if (own == null || !front) return { errors: { form: "A design you personalized isn't available any more. Remove it from your bag and try again." } };
        const custom = await cleanCustom(l.custom, {
          productId: product.id,
          slug: product.slug,
          name: product.name,
          image: { src: front.src, width: front.width, height: front.height },
        });
        if (typeof custom === "string") return { errors: { form: custom } };
        out.push({
          productId: product.id,
          slug: product.slug,
          name: `${product.name}, personalized`,
          category: product.category,
          quantity,
          unitPrice: own + (pricing.personalize[product.category] ?? 0),
          selection,
          options: selectionLabels(product, selection, pricing),
          image: front,
          custom,
        });
        continue;
      }
      const category = String(l.category) as CategoryId;
      if (!lab.categories.includes(category)) return { errors: { form: "A custom piece in your bag isn't available any more." } };
      const selection = cleanSelection(category, l.selection, pricing);
      if (!selection) return { errors: { form: `Choose the options for your custom ${categories[category].singular.toLowerCase()} again.` } };
      const custom = await cleanCustom(l.custom);
      if (typeof custom === "string") return { errors: { form: custom } };
      const base = pricing.custom[category];
      if (base == null) return { errors: { form: `Custom ${categories[category].label.toLowerCase()} can't be ordered yet. Remove it from your bag to continue.` } };
      out.push({
        name: `Custom ${categories[category].singular}`,
        category,
        quantity,
        unitPrice: priceFor({ category, price: base }, selection, pricing),
        selection,
        options: [...selectionLabels(category, selection, pricing), `Base colour: ${colourName(custom.base!)}`],
        custom,
      });
      continue;
    }
    const product = products.find((p) => p.slug === String(l.slug ?? ""));
    if (!product) return { errors: { form: "Something in your bag is no longer available. Remove it and try again." } };
    if (!product.available) return { errors: { form: `${product.name} is sold out. Remove it from your bag to continue.` } };
    const selection = cleanSelection(product, l.selection, pricing);
    if (!selection) return { errors: { form: `Choose the options for ${product.name} again.` } };
    const unitPrice = priceFor(product, selection, pricing);
    if (unitPrice == null) return { errors: { form: "Something in your bag is no longer available. Remove it and try again." } };
    out.push({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category,
      quantity,
      unitPrice,
      selection,
      options: selectionLabels(product, selection, pricing),
      image: productViews(product, selection.colour).front,
    });
  }

  const subtotal = out.reduce((n, l) => n + l.unitPrice * l.quantity, 0);
  const pieces = out.reduce((n, l) => n + l.quantity, 0);

  const code = normalizeCode(input.promo);
  let promo: Order["promo"] = null;
  if (code) {
    const found = await findPromoCode(code);
    const problem = found ? promoProblem(found, subtotal, cairoDay(new Date())) : "That promo code doesn't exist. Check the spelling, or remove it.";
    if (!found || problem) return { errors: { promo: problem ?? "" } };
    promo = { code, amount: promoDiscount(found, subtotal) };
  }

  // The governorate's fee from the dashboard; none set = confirmed on the phone
  const shipping = (await readDeliveryFees())[customer.governorate as Governorate] ?? null;
  const { instapayDiscount, total, paidNow, codBalance } = orderTotals({ subtotal, promo: promo?.amount ?? 0, shipping, pieces, payment, pay });
  const now = new Date().toISOString();
  const id = randomUUID();
  const draft: Order = {
    id,
    // Set from the counter when the order is saved
    number: "",
    createdAt: now,
    updatedAt: now,
    status: "new",
    payment,
    deposit: withDeposit ? { amount: paidNow, status: "pending", payer, reference, receiptFileId } : null,
    codBalance,
    customer,
    lines: out,
    subtotal,
    promo,
    instapayDiscount,
    shipping,
    total,
    currency: site.currency.code,
    trackingRef: "",
    adminNote: "",
  };
  let order: Order;
  try {
    order = fromRow(await insertOrderRow(id, clientKey, now, draft));
  } catch (err) {
    console.error(err);
    return { errors: { form: "Your order couldn't be saved. Try again in a minute; nothing was charged." } };
  }
  if (promo) await countPromoUse(promo.code).catch((err) => console.error("Promo use not counted", err));
  return { order };
}

export async function updateOrder(
  id: string,
  patch: { status?: OrderStatus; depositStatus?: DepositStatus; trackingRef?: string; adminNote?: string },
) {
  const current = await readOrder(id);
  if (!current) return null;
  const next: Order = {
    ...current,
    ...(patch.status ? { status: patch.status } : {}),
    ...(patch.depositStatus && current.deposit ? { deposit: { ...current.deposit, status: patch.depositStatus } } : {}),
    ...(patch.trackingRef !== undefined ? { trackingRef: patch.trackingRef.trim().slice(0, 80) } : {}),
    ...(patch.adminNote !== undefined ? { adminNote: patch.adminNote.trim().slice(0, 2000) } : {}),
    updatedAt: new Date().toISOString(),
  };
  await updateOrderRow(id, next);
  return next;
}

/**
 * Deletes an order for good, with the customer's design files and transfer
 * screenshot. Returns false when the order was already gone.
 */
export async function removeOrder(id: string) {
  const order = await readOrder(id);
  if (!order) return false;
  await deleteOrderRow(id);
  const designs = [...new Set(order.lines.flatMap((l) => l.custom?.layers ?? []).flatMap((l) => (l.kind === "image" && l.fileId ? [l.fileId] : [])))];
  // The order is already gone; files that fail to delete are only leftovers
  await Promise.all([
    removeFiles("designs", designs),
    order.deposit?.receiptFileId ? removeFiles("receipts", [order.deposit.receiptFileId]) : null,
  ]).catch((err) => console.error("Order files not deleted", err));
  return true;
}

// ── Order tracking (public) ──────────────────────────────────────

/** What a customer sees when tracking an order: no name, address or phone. */
export type TrackedOrder = {
  number: string;
  createdAt: string;
  updatedAt: string;
  status: OrderStatus;
  payment: PaymentMethod;
  paymentStatus: DepositStatus | null;
  lines: { name: string; quantity: number; options: string[]; image?: string }[];
  total: number;
  shipping: number | null;
  codBalance: number;
  trackingRef: string;
};

const tracked = (o: Order): TrackedOrder => ({
  number: o.number,
  createdAt: o.createdAt,
  updatedAt: o.updatedAt,
  status: o.status,
  payment: o.payment,
  paymentStatus: o.deposit?.status ?? null,
  lines: o.lines.map((l) => ({ name: l.name, quantity: l.quantity, options: l.options, image: l.image?.src })),
  total: o.total,
  shipping: o.shipping,
  codBalance: o.codBalance,
  trackingRef: o.trackingRef,
});

/**
 * Orders for an order number ("CM-1001", "1001") or the mobile number they
 * were placed with (newest first, the last 10). null = it's neither.
 */
export async function trackOrders(query: string): Promise<TrackedOrder[] | null> {
  const q = query.trim();
  const byNumber = /^(?:CM[\s-]*)?(\d{3,9})$/i.exec(q);
  if (byNumber) return (await findOrderRows<Order>({ number: Number(byNumber[1]) })).map((r) => tracked(fromRow(r)));
  const phone = normalizePhone(q);
  if (phone) return (await findOrderRows<Order>({ phone })).slice(0, 10).map((r) => tracked(fromRow(r)));
  return null;
}
