import { normalizeCode, promoLabel, promoProblem, type PromoCode } from "@/lib/promo";
import { cairoDay } from "@/lib/finance";
import { findPromoCode } from "@/lib/server/settings";

export type PromoCheck = { ok: true; code: string; label: string; kind: PromoCode["kind"]; value: number } | { ok: false; error: string };

/**
 * Checks a promo code at checkout and says what it takes off. Only a
 * preview: placing the order checks the code again against the real bag.
 */
export async function POST(request: Request) {
  const input = (await request.json().catch(() => null)) as { code?: unknown; subtotal?: unknown } | null;
  const code = normalizeCode(input?.code);
  const subtotal = Math.max(0, Number(input?.subtotal) || 0);
  if (!code) return Response.json({ ok: false, error: "Enter a promo code." } satisfies PromoCheck);
  // Slow down guessing
  await new Promise((r) => setTimeout(r, 300));
  const promo = await findPromoCode(code);
  if (!promo) return Response.json({ ok: false, error: "That promo code doesn't exist. Check the spelling." } satisfies PromoCheck);
  const problem = promoProblem(promo, subtotal, cairoDay(new Date()));
  if (problem) return Response.json({ ok: false, error: problem } satisfies PromoCheck);
  return Response.json({ ok: true, code, label: promoLabel(promo), kind: promo.kind, value: promo.value } satisfies PromoCheck);
}
