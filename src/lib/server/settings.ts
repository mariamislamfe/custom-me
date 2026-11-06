import "server-only";
import { randomBytes } from "node:crypto";
import { cacheLife, cacheTag } from "next/cache";
import { EXPENSE_CATEGORIES } from "@/config/finance";
import { GOVERNORATES, type DeliveryFees } from "@/config/orders";
import { DEFAULT_PAYMENTS, type PaymentSettings } from "@/config/payments";
import { site } from "@/config/site";
import { categories, categoryOrder, DEFAULT_PRICING, type CategoryId, type OptionGroup, type Pricing } from "@/data/catalog";
import type { FinanceEntry, NewFinanceEntry } from "@/lib/finance";
import { CODE_PATTERN, type PromoCode } from "@/lib/promo";
import { getFile, putFile } from "./backend";

/**
 * Store-wide settings saved from the dashboard (prices, delivery fees, push
 * notification keys and phones, finance entries), kept as small JSON files
 * in the private "settings" bucket.
 */
const PRICING_FILE = "pricing.json";
const DELIVERY_FEES_FILE = "delivery-fees.json";
const FINANCE_FILE = "finance.json";
const PUSH_KEYS_FILE = "push-keys.json";
const PUSH_SUBSCRIPTIONS_FILE = "push-subscriptions.json";
const PROMO_CODES_FILE = "promo-codes.json";
const OPTIONS_FILE = "options.json";
const STORE_FILE = "store.json";

export const SETTINGS_TAG = "settings";

async function readJson(file: string): Promise<unknown> {
  const data = await getFile("settings", file);
  if (!data) return null;
  try {
    return JSON.parse(data.toString("utf8"));
  } catch {
    return null;
  }
}

const writeJson = (file: string, value: unknown) => putFile("settings", file, JSON.stringify(value), "application/json", { upsert: true });

const egp = (v: unknown) => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 1_000_000;

// ── Prices ───────────────────────────────────────────────────────

// ── Product options ──────────────────────────────────────────────

export const OPTION_ID = /^[a-z0-9-]{1,40}$/;
export const OPTION_LIMITS = { groups: 6, values: 20 };

/**
 * A type's option groups as saved on the Product options page; null when
 * the list is malformed. Ids stay fixed once made (orders and prices refer
 * to them); "colour" is taken by the colours set on each product.
 */
export function validOptionGroups(list: unknown): OptionGroup[] | null {
  if (!Array.isArray(list) || list.length > OPTION_LIMITS.groups) return null;
  const out: OptionGroup[] = [];
  for (const g of list as Record<string, unknown>[]) {
    const id = String(g?.id ?? "");
    const label = String(g?.label ?? "").trim().slice(0, 40);
    if (!OPTION_ID.test(id) || id === "colour" || !label || out.some((x) => x.id === id)) return null;
    if (!Array.isArray(g.values) || g.values.length === 0 || g.values.length > OPTION_LIMITS.values) return null;
    const values: OptionGroup["values"] = [];
    for (const v of g.values as Record<string, unknown>[]) {
      const vid = String(v?.id ?? "");
      const vlabel = String(v?.label ?? "").trim().slice(0, 40);
      if (!OPTION_ID.test(vid) || !vlabel || values.some((x) => x.id === vid)) return null;
      const note = String(v.note ?? "").trim().slice(0, 120);
      values.push({ id: vid, label: vlabel, ...(note ? { note } : {}), ...(v.available === false ? { available: false } : {}) });
    }
    out.push({ id, label, values });
  }
  return out;
}

/** Every type's option groups; a type never saved keeps the starting ones from data/catalog.ts. */
export async function readCatalogOptions(): Promise<Pricing["options"]> {
  const raw = (await readJson(OPTIONS_FILE)) as Partial<Record<CategoryId, unknown>> | null;
  return Object.fromEntries(categoryOrder.map((c) => [c, (raw && validOptionGroups(raw[c])) ?? categories[c].options])) as Pricing["options"];
}

export const writeCatalogOptions = (options: Pricing["options"]) => writeJson(OPTIONS_FILE, options);

// ── Prices ───────────────────────────────────────────────────────

/** Custom-piece prices, the option groups and their extras; anything not saved yet uses DEFAULT_PRICING. */
export async function readPricing(): Promise<Pricing> {
  const [raw, options] = await Promise.all([readJson(PRICING_FILE) as Promise<Partial<Pricing> | null>, readCatalogOptions()]);
  const pricing: Pricing = structuredClone(DEFAULT_PRICING);
  pricing.options = options;
  for (const c of categoryOrder) {
    const custom = raw?.custom?.[c];
    if (egp(custom) || custom === null) pricing.custom[c] = custom as number | null;
    const personalize = raw?.personalize?.[c];
    if (egp(personalize)) pricing.personalize[c] = personalize as number;
    // Extras for the options as they are now: a value added since costs nothing extra until it's priced
    const start = DEFAULT_PRICING.extras[c];
    pricing.extras[c] = {};
    for (const g of options[c]) {
      for (const v of g.values) {
        const key = `${g.id}:${v.id}`;
        const extra = raw?.extras?.[c]?.[key];
        pricing.extras[c][key] = egp(extra) ? (extra as number) : (start[key] ?? 0);
      }
    }
  }
  return pricing;
}

/** The option groups themselves live in their own file (the Product options page). */
export function writePricing(pricing: Pricing) {
  const { custom, personalize, extras } = pricing;
  return writeJson(PRICING_FILE, { custom, personalize, extras });
}

/** Whether prices have been saved in the dashboard at least once. */
export async function pricingSaved() {
  return Boolean(await readJson(PRICING_FILE));
}

// ── Delivery fees ────────────────────────────────────────────────

/** Delivery fee per governorate in EGP; a governorate without one is confirmed on the phone. */
export async function readDeliveryFees(): Promise<DeliveryFees> {
  const raw = await readJson(DELIVERY_FEES_FILE);
  const fees: DeliveryFees = {};
  if (raw && typeof raw === "object") {
    for (const g of GOVERNORATES) {
      const v = (raw as Record<string, unknown>)[g];
      if (egp(v)) fees[g] = v as number;
    }
  }
  return fees;
}

export const writeDeliveryFees = (fees: DeliveryFees) => writeJson(DELIVERY_FEES_FILE, fees);

// ── Store & payments ─────────────────────────────────────────────

export interface StoreInfo {
  payments: PaymentSettings;
  /** Instagram page link, shown in the footer; empty hides it */
  instagram: string;
  /** e.g. "@custom.me" */
  instagramHandle: string;
}

const text = (v: unknown, max: number, fallback = "") => (typeof v === "string" ? v.trim().slice(0, max) : fallback);
const percent = (v: unknown) => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 90;

/** InstaPay details and the shop's links; never saved = the starting values in the code. */
export async function readStoreInfo(): Promise<StoreInfo> {
  const raw = (await readJson(STORE_FILE)) as { payments?: Record<string, unknown>; instagram?: unknown; instagramHandle?: unknown } | null;
  const p = raw?.payments ?? {};
  return {
    payments: {
      depositPerPiece: egp(p.depositPerPiece) ? (p.depositPerPiece as number) : DEFAULT_PAYMENTS.depositPerPiece,
      fullPaymentDiscountPercent: percent(p.fullPaymentDiscountPercent) ? (p.fullPaymentDiscountPercent as number) : DEFAULT_PAYMENTS.fullPaymentDiscountPercent,
      address: text(p.address, 80, DEFAULT_PAYMENTS.address),
      phone: text(p.phone, 20, DEFAULT_PAYMENTS.phone),
      accountName: text(p.accountName, 80, DEFAULT_PAYMENTS.accountName),
      link: text(p.link, 300, DEFAULT_PAYMENTS.link),
      qr: text(p.qr, 300, DEFAULT_PAYMENTS.qr),
      allowCod: typeof p.allowCod === "boolean" ? p.allowCod : DEFAULT_PAYMENTS.allowCod,
    },
    instagram: raw ? text(raw.instagram, 300) : (site.instagram ?? ""),
    instagramHandle: raw ? text(raw.instagramHandle, 60) : (site.instagramHandle ?? ""),
  };
}

export const writeStoreInfo = (info: StoreInfo) => writeJson(STORE_FILE, info);

/** Prices, options, delivery fees and payment details for the storefront, cached until they're saved again in the dashboard. */
export async function getStoreSettings(): Promise<{ pricing: Pricing; deliveryFees: DeliveryFees; store: StoreInfo }> {
  "use cache";
  cacheTag(SETTINGS_TAG);
  cacheLife("minutes");
  const [pricing, deliveryFees, store] = await Promise.all([readPricing(), readDeliveryFees(), readStoreInfo()]);
  return { pricing, deliveryFees, store };
}

// ── Order notifications (Web Push) ───────────────────────────────

/** Signing keys for push messages, made once on first use. */
export async function getVapidKeys(): Promise<{ publicKey: string; privateKey: string }> {
  const raw = (await readJson(PUSH_KEYS_FILE)) as { publicKey?: unknown; privateKey?: unknown } | null;
  if (typeof raw?.publicKey === "string" && typeof raw.privateKey === "string") return { publicKey: raw.publicKey, privateKey: raw.privateKey };
  const { generateVAPIDKeys } = await import("web-push");
  const keys = generateVAPIDKeys();
  await writeJson(PUSH_KEYS_FILE, keys);
  return keys;
}

export type PushDevice = {
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
  /** e.g. "iPhone", shown in the dashboard */
  label: string;
  addedAt: string;
};

function validDevice(d: unknown): d is PushDevice {
  const s = (d as PushDevice | null)?.subscription;
  return (
    typeof s?.endpoint === "string" &&
    s.endpoint.startsWith("https://") &&
    typeof s.keys?.p256dh === "string" &&
    typeof s.keys?.auth === "string" &&
    typeof (d as PushDevice).label === "string"
  );
}

/** Phones that turned order notifications on. */
export async function readPushSubscriptions(): Promise<PushDevice[]> {
  const list = await readJson(PUSH_SUBSCRIPTIONS_FILE);
  return Array.isArray(list) ? list.filter(validDevice) : [];
}

export async function addPushSubscription(device: PushDevice) {
  const others = (await readPushSubscriptions()).filter((d) => d.subscription.endpoint !== device.subscription.endpoint);
  await writeJson(PUSH_SUBSCRIPTIONS_FILE, [...others, device].slice(-20));
}

export async function removePushSubscriptions(endpoints: string[]) {
  const list = await readPushSubscriptions();
  const next = list.filter((d) => !endpoints.includes(d.subscription.endpoint));
  if (next.length !== list.length) await writeJson(PUSH_SUBSCRIPTIONS_FILE, next);
}

// ── Promo codes ──────────────────────────────────────────────────

const DAY_OR_NULL = (v: unknown) => v === null || (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v));

function validPromo(p: unknown): p is PromoCode {
  const x = p as Record<string, unknown> | null;
  return (
    !!x &&
    typeof x.code === "string" &&
    CODE_PATTERN.test(x.code) &&
    (x.kind === "percent" || x.kind === "fixed") &&
    egp(x.value) &&
    typeof x.active === "boolean" &&
    (x.minSubtotal === null || egp(x.minSubtotal)) &&
    (x.maxUses === null || egp(x.maxUses)) &&
    egp(x.uses) &&
    DAY_OR_NULL(x.expires)
  );
}

/** Every promo code, newest first. */
export async function readPromoCodes(): Promise<PromoCode[]> {
  const list = await readJson(PROMO_CODES_FILE);
  return Array.isArray(list) ? list.filter(validPromo) : [];
}

export const writePromoCodes = (codes: PromoCode[]) => writeJson(PROMO_CODES_FILE, codes);

export async function findPromoCode(code: string) {
  return (await readPromoCodes()).find((p) => p.code === code) ?? null;
}

/** Counts an order against a code's limit. */
export async function countPromoUse(code: string) {
  const list = await readPromoCodes();
  if (list.some((p) => p.code === code)) await writePromoCodes(list.map((p) => (p.code === code ? { ...p, uses: p.uses + 1 } : p)));
}

// ── Finance ──────────────────────────────────────────────────────

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const count = (v: unknown) => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 10000;

function validEntry(e: unknown): e is FinanceEntry {
  if (!e || typeof e !== "object") return false;
  const x = e as Record<string, unknown>;
  if (typeof x.id !== "string" || typeof x.date !== "string" || !DAY.test(x.date) || typeof x.note !== "string") return false;
  if (x.kind === "expense") return egp(x.amount) && EXPENSE_CATEGORIES.some((c) => c.id === x.category);
  if (x.kind === "sale") return egp(x.amount) && count(x.pieces);
  return false;
}

/** Expenses and outside orders added on the finance page, oldest first. */
export async function readFinanceEntries(): Promise<FinanceEntry[]> {
  const list = await readJson(FINANCE_FILE);
  return Array.isArray(list) ? list.filter(validEntry) : [];
}

export async function addFinanceEntry(entry: NewFinanceEntry) {
  const next = [...(await readFinanceEntries()), { ...entry, id: randomBytes(8).toString("hex") } as FinanceEntry];
  await writeJson(FINANCE_FILE, next);
}

export async function removeFinanceEntry(id: string) {
  await writeJson(FINANCE_FILE, (await readFinanceEntries()).filter((e) => e.id !== id));
}
