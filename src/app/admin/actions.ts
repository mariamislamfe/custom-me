"use server";

import { randomBytes } from "node:crypto";
import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { GOVERNORATES, type DeliveryFees } from "@/config/orders";
import { lab } from "@/config/customization";
import type { DepositAmount } from "@/config/payments";
import { categories, categoryOrder, sizeGroupId, type Pricing } from "@/data/catalog";
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
  OPTION_ID,
  readPricing,
  readStoreInfo,
  removePushSubscriptions,
  SETTINGS_TAG,
  validOptionGroups,
  writeCatalogOptions,
  writeDeliveryFees,
  writePricing,
  writeStoreInfo,
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

export async function savePricing(prev: SettingsState, form: FormData): Promise<SettingsState> {
  await requireAdmin();
  // Option extras are set on the Product options page: kept as they are
  const pricing: Pricing = await readPricing();
  for (const c of categoryOrder) {
    if (lab.categories.includes(c)) {
      const what = `a custom ${categories[c].singular.toLowerCase()}`;
      const sizes = pricing.options[c].find((g) => g.id === sizeGroupId(c));
      if (sizes) {
        // A full price for each size: the cheapest is the piece's price, the others what they add to it
        const prices = sizes.values.map((v) => ({ v, price: egp(form.get(`customSize:${c}:${v.id}`), { optional: true }) }));
        const bad = prices.find((p) => p.price === null || p.price === 0);
        if (bad) return { error: `Check the price of ${what} in ${bad.v.label}: a number like 700, or leave every size empty for now.` };
        const set = prices.filter((p) => p.price != null) as { v: (typeof prices)[number]["v"]; price: number }[];
        if (set.length && set.length < prices.length) return { error: `Give ${what} a price in every size, or leave them all empty for now.` };
        const low = set.length ? Math.min(...set.map((p) => p.price)) : null;
        pricing.custom[c] = low;
        for (const p of set) pricing.extras[c] = { ...pricing.extras[c], [`${sizes.id}:${p.v.id}`]: p.price - low! };
      } else {
        // Empty = not decided yet: custom pieces of that type can't be ordered
        const custom = egp(form.get(`custom:${c}`), { optional: true });
        if (custom === null || custom === 0) return { error: `Check the price of ${what}: a number like 700, or leave it empty for now.` };
        pricing.custom[c] = custom ?? null;
      }
      const personalize = egp(form.get(`personalize:${c}`), { optional: true });
      if (personalize === null) return { error: `Check what personalizing a ${categories[c].singular.toLowerCase()} adds: a number like 50, or 0.` };
      pricing.personalize[c] = personalize ?? 0;
    } else {
      pricing.custom[c] = null;
    }
  }
  await writePricing(pricing);
  updateTag(SETTINGS_TAG);
  return { saved: (prev.saved ?? 0) + 1 };
}

// ── Product options ──────────────────────────────────────────────

type OptionsInput = Record<string, { id?: string; label?: string; values?: { id?: string; label?: string; note?: string; available?: boolean; extra?: string }[] }[]>;

const newOptionId = () => `o-${randomBytes(4).toString("hex")}`;

/**
 * Each type's option groups (sizes, pages, strap…) and what each choice adds
 * to the price. Groups and choices keep their ids, so orders and saved bags
 * still match; new ones get a fresh id.
 */
export async function saveOptions(prev: SettingsState, form: FormData): Promise<SettingsState> {
  await requireAdmin();
  let input: OptionsInput;
  try {
    input = JSON.parse(String(form.get("options") ?? "{}"));
  } catch {
    return { error: "Something went wrong. Reload the page and try again." };
  }
  const pricing = await readPricing();
  const options = structuredClone(pricing.options);
  for (const c of categoryOrder) {
    const groups = Array.isArray(input?.[c]) ? input[c] : [];
    const name = categories[c].label;
    const extras: Record<string, number> = {};
    const shaped = [];
    for (const g of groups) {
      const label = String(g.label ?? "").trim();
      if (!label) return { error: `${name}: give every option a name (like “Size”), or remove the empty one.` };
      const values = Array.isArray(g.values) ? g.values : [];
      if (!values.length) return { error: `${name}: “${label}” needs at least one choice.` };
      const id = OPTION_ID.test(String(g.id ?? "")) && g.id !== "colour" ? String(g.id) : newOptionId();
      const vals = [];
      for (const v of values) {
        const vlabel = String(v.label ?? "").trim();
        if (!vlabel) return { error: `${name}: give every choice of “${label}” a name, or remove the empty one.` };
        const vid = OPTION_ID.test(String(v.id ?? "")) ? String(v.id) : newOptionId();
        if (id === sizeGroupId(c)) {
          // Sizes are priced in full on the Prices page (Lab pieces): keep what's set there
          extras[`${id}:${vid}`] = pricing.extras[c]?.[`${id}:${vid}`] ?? 0;
        } else {
          const extra = egp(v.extra ?? "", { optional: true });
          if (extra === null) return { error: `${name}: check the extra for ${label} “${vlabel}”: a number like 50, or 0.` };
          extras[`${id}:${vid}`] = extra ?? 0;
        }
        vals.push({ id: vid, label: vlabel, note: String(v.note ?? ""), available: v.available !== false });
      }
      shaped.push({ id, label, values: vals });
    }
    const clean = validOptionGroups(shaped);
    if (!clean) return { error: `${name}: check the options (up to 6 options with up to 20 choices each, no two with the same name).` };
    options[c] = clean;
    pricing.extras[c] = extras;
  }
  await writeCatalogOptions(options);
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
