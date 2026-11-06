import "server-only";
import { headers } from "next/headers";
import webpush, { type PushSubscription } from "web-push";
import { money } from "@/lib/format";
import type { Order } from "@/lib/types";
import { getVapidKeys, readPushSubscriptions, removePushSubscriptions } from "./settings";

/**
 * Phone notifications from the dashboard itself (Web Push): each phone adds
 * the dashboard to its home screen and turns notifications on in
 * /admin/notifications. The keys and the phones' subscriptions are kept in
 * the private settings bucket.
 */
export type PushMessage = { title: string; body: string; url: string; tag?: string };

/** Sends to every phone that turned notifications on; returns how many got it. */
export async function sendPush(message: PushMessage, origin: string) {
  const [subs, keys] = await Promise.all([readPushSubscriptions(), getVapidKeys()]);
  // Push services want an https:// or mailto: contact; local testing runs on http
  const vapidDetails = { subject: origin.startsWith("https://") ? origin : "mailto:noreply@example.com", ...keys };
  const gone: string[] = [];
  const results = await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(s.subscription as PushSubscription, JSON.stringify(message), { vapidDetails, TTL: 60 * 60 * 24 });
        return true;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        // The phone turned notifications off or removed the app
        if (status === 404 || status === 410) gone.push(s.subscription.endpoint);
        else console.error("Push failed", status, err);
        return false;
      }
    }),
  );
  if (gone.length) await removePushSubscriptions(gone);
  return results.filter(Boolean).length;
}

/** The site's address, for push message contacts (inside a request or Server Action). */
export async function requestOrigin() {
  if (process.env.SITE_URL) return process.env.SITE_URL;
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}

/** "New order" on the phones; tapping it opens the order in the dashboard. Never throws. */
export async function notifyNewOrder(order: Order, origin: string) {
  try {
    const items = order.lines.reduce((n, l) => n + l.quantity, 0);
    const custom = order.lines.some((l) => l.custom);
    await sendPush(
      {
        title: `New order ${order.number}`,
        body: [
          `${order.customer.name}, ${order.customer.governorate}`,
          `${items} ${items === 1 ? "item" : "items"}${custom ? " (custom design)" : ""}, total ${money(order.total)}`,
        ].join("\n"),
        url: `/admin/orders/${order.id}`,
        tag: order.id,
      },
      origin,
    );
  } catch (err) {
    console.error("Order notification failed", err);
  }
}
