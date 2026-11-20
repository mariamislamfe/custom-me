"use server";

import { randomBytes } from "node:crypto";
import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { GOVERNORATES, type DeliveryFees } from "@/config/orders";
import { lab } from "@/config/customization";
import type { DepositAmount } from "@/config/payments";
import { categories, categoryOrder, DEFAULT_PRICING, type CategoryId, type TypeSize } from "@/data/catalog";
import { adminConfigured, checkPassword, createSession, destroySession, requireAdmin } from "@/lib/server/auth";
import { requestOrigin, sendPush } from "@/lib/server/notify";
import { makePhotoTemplates } from "@/lib/server/template";
import {
  createProduct,
  moveProduct,
  parseProductForm,
  PRODUCTS_TAG,
  removeProduct,
  setPublished,
  updateProduct,
  type FieldErrors,
} from "@/lib/server/products";
import {
  addPushSubscription,
  MAX_SIZES,
  readStoreInfo,
  removePushSubscriptions,
  SETTINGS_TAG,
  SIZE_ID,
  writeDeliveryFees,
  writePricing,
  writeStoreInfo,
  MAX_PIXELS,
  PIXEL_ID,
  type PushDevice,
  type StoreInfo,
} from "@/lib/server/settings";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  if (!adminConfigured()) {
    return { error: "The dashboard password isn't set on the server yet. Add ADMIN_PASSWORD to .env.local and restart." };
  }
  const password = String(form.get("password") ?? "");
  if (!checkPassword(password)) {
    // Slow down guessing
    await new Promise((r) => setTimeout(r, 800));
    return { error: "That password isn't right. Try again." };
  }
  await createSession();
  redirect("/admin/orders");
}

export async function logout() {
  await destroySession();
  redirect("/admin/login");
}

// ── Products ─────────────────────────────────────────────────────

export type SaveState = { errors?: FieldErrors };

export async function saveProduct(_prev: SaveState, form: FormData): Promise<SaveState> {
  await requireAdmin();
  const { errors, value } = parseProductForm(form);
  if (Object.keys(errors).length) return { errors };

  const id = String(form.get("id") ?? "");
  if (id) {
    const updated = await updateProduct(id, value);
    if (!updated) return { errors: { form: "This product no longer exists. It may have been deleted." } };
  } else {
    await createProduct(value);
  }
  updateTag(PRODUCTS_TAG);
  redirect(`/admin?saved=${encodeURIComponent(value.name)}`);
}

export async function deleteProduct(id: string) {
  await requireAdmin();
  await removeProduct(id);
  updateTag(PRODUCTS_TAG);
}

export async function togglePublished(id: string, published: boolean) {
  await requireAdmin();
  await setPublished(id, published);
  updateTag(PRODUCTS_TAG);
}

/** Editable designs made of each product's own photo, for every product that has none yet. */
export async function makeTemplatesFromPhotos() {
  await requireAdmin();
  const result = await makePhotoTemplates();
  updateTag(PRODUCTS_TAG);
  return result;
}

export async function reorderProduct(id: string, dir: -1 | 1) {
  await requireAdmin();
  await moveProduct(id, dir);
  updateTag(PRODUCTS_TAG);
}

// ── Prices & delivery ────────────────────────────────────────────

export type SettingsState = { saved?: number; error?: string };

/** EGP typed in a box ("1,250" or "99") → a whole number, or null if it isn't a sensible amount. */
function egp(raw: FormDataEntryValue | null, { optional = false } = {}) {
  const text = String(raw ?? "").replace(/,/g, "").trim();
  if (!text) return optional ? undefined : null;
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 && n <= 1_000_000 ? Math.round(n) : null;
}

type PricesInput = {
  types?: Partial<Record<CategoryId, { sizes?: { id?: string; label?: string; price?: string; custom?: string }[]; price?: string; custom?: string }>>;
  strap?: string;
};

const newSizeId = () => `s-${randomBytes(4).toString("hex")}`;

/**
 * Every price in the store: each type's sizes, each size's ready-made and
 * custom price, and the strap. Sizes keep their ids, so bags and orders still
 * match; a new size gets a fresh id.
 */
export async function savePricing(prev: SettingsState, form: FormData): Promise<SettingsState> {
  await requireAdmin();
  let input: PricesInput;
  try {
    input = JSON.parse(String(form.get("pricing") ?? "{}"));
  } catch {
    return { error: "Something went wrong. Reload the page and try again." };
  }
  const pricing = structuredClone(DEFAULT_PRICING);
  // An empty box = not decided yet ("Price soon"); anything else must be a price above 0
  const price = (raw: unknown, what: string): number | null | string => {
    const n = egp(String(raw ?? ""), { optional: true });
    if (n === undefined) return null;
    return n === null || n === 0 ? `Check the price of ${what}: a number like 700, or leave it empty for now.` : n;
  };
  for (const c of categoryOrder) {
    const t = input.types?.[c] ?? {};
    const name = categories[c].label;
    const customMade = lab.categories.includes(c);
    const rows = Array.isArray(t.sizes) ? t.sizes : [];
    if (rows.length > MAX_SIZES) return { error: `${name}: up to ${MAX_SIZES} sizes.` };
    const sizes: TypeSize[] = [];
    for (const z of rows) {
      const label = String(z.label ?? "").trim().slice(0, 30);
      if (!label) return { error: `${name}: give every size a name (like 35*50 or A4), or remove the empty one.` };
      if (sizes.some((x) => x.label.toLowerCase() === label.toLowerCase())) return { error: `${name}: “${label}” is there twice.` };
      const ready = price(z.price, `${name} ${label}`);
      const custom = customMade ? price(z.custom, `a custom ${categories[c].singular.toLowerCase()} in ${label}`) : null;
      if (typeof ready === "string") return { error: ready };
      if (typeof custom === "string") return { error: custom };
      const id = SIZE_ID.test(String(z.id ?? "")) && !sizes.some((x) => x.id === z.id) ? String(z.id) : newSizeId();
      sizes.push({ id, label, price: ready, custom });
    }
    // One size: one ready-made price and one custom price
    const ready = sizes.length ? null : price(t.price, name);
    const custom = sizes.length || !customMade ? null : price(t.custom, `a custom ${categories[c].singular.toLowerCase()}`);
    if (typeof ready === "string") return { error: ready };
    if (typeof custom === "string") return { error: custom };
    pricing.types[c] = { sizes, price: ready, custom };
  }
  const strap = egp(String(input.strap ?? ""), { optional: true });
  if (strap === null) return { error: "Check what the strap adds: a number like 50, or 0." };
  pricing.strap = strap ?? 0;
  await writePricing(pricing);
  updateTag(SETTINGS_TAG);
  return { saved: (prev.saved ?? 0) + 1 };
}

// ── Store & payments ─────────────────────────────────────────────

const field = (form: FormData, key: string, max: number) => String(form.get(key) ?? "").trim().slice(0, max);

/** A deposit typed on the form: a whole number, EGP a piece or a % (0 to 100) of the price. */
function depositInput(form: FormData, key: string): DepositAmount | string {
  const unit = form.get(`${key}Unit`) === "percent" ? "percent" : "egp";
  const raw = field(form, `${key}Value`, 9).replace(/,/g, "");
  const value = Number(raw || "0");
  if (!Number.isInteger(value) || value < 0) return "enter a whole number, like 50 (0 = no deposit).";
  if (unit === "percent" && value > 100) return "a percentage goes from 0 to 100.";
  if (unit === "egp" && value > 1_000_000) return "that amount is too big.";
  return { unit, value };
}

/** InstaPay details, the deposit and paid-in-full discount, and the shop's social links and WhatsApp. */
export async function saveStoreInfo(prev: SettingsState, form: FormData): Promise<SettingsState> {
  await requireAdmin();
  const depositIsDelivery = form.get("depositIsDelivery") === "on";
  const current = (await readStoreInfo()).payments;
  // The ready-made deposit is only on the form while the delivery-fee rule is off: otherwise it's kept
  const readyDeposit = depositIsDelivery ? current.readyDeposit : depositInput(form, "readyDeposit");
  if (typeof readyDeposit === "string") return { error: `Deposit for ready-made products: ${readyDeposit}` };
  const customDeposit = depositInput(form, "customDeposit");
  if (typeof customDeposit === "string") return { error: `Deposit for custom pieces: ${customDeposit}` };
  const percentText = field(form, "fullPaymentDiscountPercent", 3);
  const percent = Number(percentText || "0");
  if (!Number.isInteger(percent) || percent < 0 || percent > 90) return { error: "Enter the paid-in-full discount as a whole number from 0 to 90 (0 turns it off)." };
  const phone = field(form, "phone", 20).replace(/[\s-]/g, "");
  if (phone && !/^\+?\d{8,15}$/.test(phone)) return { error: "Check the InstaPay mobile number: digits only, like 01012345678." };
  const link = field(form, "link", 300);
  const instagram = field(form, "instagram", 300);
  const facebook = field(form, "facebook", 300);
  const tiktok = field(form, "tiktok", 300);
  for (const [label, url] of [["InstaPay link", link], ["Instagram link", instagram], ["Facebook link", facebook], ["TikTok link", tiktok]] as const) {
    if (url && !/^https:\/\/\S+$/.test(url)) return { error: `The ${label} should start with https://` };
  }
  const whatsapp = field(form, "whatsapp", 20).replace(/[\s-]/g, "");
  if (whatsapp && !/^\+?\d{8,15}$/.test(whatsapp)) return { error: "Check the WhatsApp number: digits only, like 01012345678." };
  const metaPixels = [...new Set(field(form, "metaPixels", 400).split(/[\s,]+/).filter(Boolean))];
  const badPixel = metaPixels.find((id) => !PIXEL_ID.test(id));
  if (badPixel) return { error: `“${badPixel.slice(0, 30)}” isn’t a Pixel ID: it’s only digits, like 1234567890123456.` };
  if (metaPixels.length > MAX_PIXELS) return { error: `Up to ${MAX_PIXELS} Pixel IDs.` };
  const qr = field(form, "qr", 300);
  if (qr && !/^(\/media\/|https:\/\/)\S+$/.test(qr)) return { error: "Upload the QR code again." };
  const info: StoreInfo = {
    payments: {
      depositIsDelivery,
      readyDeposit,
      customDeposit,
      fullPaymentDiscountPercent: percent,
      address: field(form, "address", 80),
      phone,
      accountName: field(form, "accountName", 80),
      link,
      qr,
      allowCod: form.get("allowCod") === "on",
    },
    instagram,
    instagramHandle: field(form, "instagramHandle", 60),
    facebook,
    tiktok,
    whatsapp,
    metaPixels,
  };
  await writeStoreInfo(info);
  updateTag(SETTINGS_TAG);
  return { saved: (prev.saved ?? 0) + 1 };
}

/** Delivery fee per governorate, in EGP; an empty box = confirmed on the phone. */
export async function saveDeliveryFees(prev: SettingsState, form: FormData): Promise<SettingsState> {
  await requireAdmin();
  const fees: DeliveryFees = {};
  for (const g of GOVERNORATES) {
    const fee = egp(form.get(g), { optional: true });
    if (fee === null) return { error: `Check the fee for ${g}: enter a number like 60, or leave it empty.` };
    if (fee !== undefined) fees[g] = fee;
  }
  await writeDeliveryFees(fees);
  updateTag(SETTINGS_TAG);
  return { saved: (prev.saved ?? 0) + 1 };
}

// ── Order notifications ──────────────────────────────────────────

/** Turns notifications on for this phone (its push subscription from the browser). */
export async function savePushSubscription(subscription: unknown, label: string) {
  await requireAdmin();
  const s = subscription as PushDevice["subscription"] | null;
  if (typeof s?.endpoint !== "string" || !s.endpoint.startsWith("https://") || typeof s.keys?.p256dh !== "string" || typeof s.keys?.auth !== "string") {
    throw new Error("Not a push subscription");
  }
  await addPushSubscription({
    subscription: { endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } },
    label: String(label).slice(0, 40) || "Phone",
    addedAt: new Date().toISOString(),
  });
  refresh();
}

export async function deletePushSubscription(endpoint: string) {
  await requireAdmin();
  await removePushSubscriptions([String(endpoint)]);
  refresh();
}

/** Sends a test notification to every phone; returns how many got it. */
export async function sendTestPush() {
  await requireAdmin();
  return sendPush(
    { title: "CUSTOM ME notifications are on", body: "New orders will show up here. Tap one to open it.", url: "/admin/orders", tag: "test" },
    await requestOrigin(),
  );
}
