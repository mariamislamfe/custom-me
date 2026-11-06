"use server";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/server/auth";
import { readPromoCodes, writePromoCodes } from "@/lib/server/settings";
import { CODE_PATTERN, normalizeCode, type PromoCode } from "@/lib/promo";

export type PromoState = { saved?: number; error?: string };

/** A whole number typed in a box; undefined when empty, null when it isn't one. */
function whole(raw: FormDataEntryValue | null, min: number, max: number) {
  const text = String(raw ?? "").replace(/,/g, "").trim();
  if (!text) return undefined;
  const n = Number(text);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

export async function createPromo(prev: PromoState, form: FormData): Promise<PromoState> {
  await requireAdmin();
  const code = normalizeCode(form.get("code"));
  if (!CODE_PATTERN.test(code)) return { error: "Use 3 to 24 letters or numbers for the code, like WELCOME10." };
  const kind = form.get("kind") === "fixed" ? "fixed" : "percent";
  const value = whole(form.get("value"), 1, kind === "percent" ? 100 : 1_000_000);
  if (value == null) return { error: kind === "percent" ? "Enter the percentage off, from 1 to 100." : "Enter the amount off in EGP, like 100." };
  const minSubtotal = whole(form.get("minSubtotal"), 0, 1_000_000);
  if (minSubtotal === null) return { error: "Check the minimum order: a number like 500, or leave it empty." };
  const maxUses = whole(form.get("maxUses"), 1, 1_000_000);
  if (maxUses === null) return { error: "Check how many orders can use it: a number like 50, or leave it empty." };
  const expires = String(form.get("expires") ?? "").trim();
  if (expires && !/^\d{4}-\d{2}-\d{2}$/.test(expires)) return { error: "Check the last day: pick a date, or leave it empty." };

  const list = await readPromoCodes();
  if (list.some((p) => p.code === code)) return { error: `${code} already exists. Pick another code, or delete the old one first.` };
  const promo: PromoCode = {
    code,
    kind,
    value,
    active: true,
    minSubtotal: minSubtotal ?? null,
    maxUses: maxUses ?? null,
    uses: 0,
    expires: expires || null,
    createdAt: new Date().toISOString(),
  };
  await writePromoCodes([promo, ...list]);
  refresh();
  return { saved: (prev.saved ?? 0) + 1 };
}

export async function setPromoActive(code: string, active: boolean) {
  await requireAdmin();
  const list = await readPromoCodes();
  await writePromoCodes(list.map((p) => (p.code === code ? { ...p, active } : p)));
  refresh();
}

export async function deletePromo(code: string) {
  await requireAdmin();
  const list = await readPromoCodes();
  await writePromoCodes(list.filter((p) => p.code !== code));
  refresh();
}
