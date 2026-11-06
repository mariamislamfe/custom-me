"use server";

import { randomBytes } from "node:crypto";
import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { GOVERNORATES, type DeliveryFees } from "@/config/orders";
import { lab } from "@/config/customization";
import { categories, categoryOrder, type Pricing } from "@/data/catalog";
import { adminConfigured, checkPassword, createSession, destroySession, requireAdmin } from "@/lib/server/auth";
import { requestOrigin, sendPush } from "@/lib/server/notify";
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
      // Empty = not decided yet: custom pieces of that type can't be ordered
      const custom = egp(form.get(`custom:${c}`), { optional: true });
      if (custom === null || custom === 0) return { error: `Check the price of a custom ${categories[c].singular.toLowerCase()}: a number like 700, or leave it empty for now.` };
      pricing.custom[c] = custom ?? null;
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
        const extra = egp(v.extra ?? "", { optional: true });
        if (extra === null) return { error: `${name}: check the extra for ${label} “${vlabel}”: a number like 50, or 0.` };
        extras[`${id}:${vid}`] = extra ?? 0;
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

/** InstaPay details, the deposit and paid-in-full discount, and the shop's Instagram. */
export async function saveStoreInfo(prev: SettingsState, form: FormData): Promise<SettingsState> {
  await requireAdmin();
  const deposit = egp(form.get("depositPerPiece"));
  if (deposit === null) return { error: "Enter the deposit per piece as a number, like 100 (0 = no deposit)." };
  const percentText = field(form, "fullPaymentDiscountPercent", 3);
  const percent = Number(percentText || "0");
  if (!Number.isInteger(percent) || percent < 0 || percent > 90) return { error: "Enter the paid-in-full discount as a whole number from 0 to 90 (0 turns it off)." };
  const phone = field(form, "phone", 20).replace(/[\s-]/g, "");
  if (phone && !/^\+?\d{8,15}$/.test(phone)) return { error: "Check the InstaPay mobile number: digits only, like 01012345678." };
  const link = field(form, "link", 300);
  const instagram = field(form, "instagram", 300);
  for (const [label, url] of [["InstaPay link", link], ["Instagram link", instagram]] as const) {
    if (url && !/^https:\/\/\S+$/.test(url)) return { error: `The ${label} should start with https://` };
  }
  const qr = field(form, "qr", 300);
  if (qr && !/^(\/media\/|https:\/\/)\S+$/.test(qr)) return { error: "Upload the QR code again." };
  const info: StoreInfo = {
    payments: {
      depositPerPiece: deposit ?? 0,
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
