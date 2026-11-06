import { trackOrders, type TrackedOrder } from "@/lib/server/orders";

export type TrackResult = { ok: true; orders: TrackedOrder[] } | { ok: false; error: string };

// Basic guard against someone walking through every order number: 20 lookups per visitor per 10 minutes
const recent = new Map<string, number[]>();
function allow(key: string) {
  const now = Date.now();
  const list = (recent.get(key) ?? []).filter((t) => now - t < 10 * 60 * 1000);
  if (list.length >= 20) return false;
  recent.set(key, [...list, now]);
  if (recent.size > 5000) recent.clear();
  return true;
}

/** Order tracking: by order number or the mobile number used at checkout. */
export async function POST(request: Request) {
  const input = (await request.json().catch(() => null)) as { query?: unknown } | null;
  const query = String(input?.query ?? "").slice(0, 40);
  const key = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  if (!allow(key)) return Response.json({ ok: false, error: "Too many lookups. Try again in a few minutes." } satisfies TrackResult, { status: 429 });
  try {
    const orders = await trackOrders(query);
    if (!orders) return Response.json({ ok: false, error: "Enter your order number (like CM-1001) or the mobile number you ordered with." } satisfies TrackResult);
    return Response.json({ ok: true, orders } satisfies TrackResult);
  } catch (err) {
    console.error("track failed", err);
    return Response.json({ ok: false, error: "We couldn't look that up right now. Try again in a minute." } satisfies TrackResult, { status: 500 });
  }
}
